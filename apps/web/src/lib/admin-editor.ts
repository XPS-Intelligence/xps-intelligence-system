import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

export type EditorFileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: EditorFileNode[];
};

export type EditorManifest = {
  editable_roots: string[];
  web_routes: Array<{ route: string; file: string }>;
  api_routes: Array<{ route: string; file: string }>;
  next_components: Array<{ name: string; path: string }>;
};

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  const workspaceCandidate = path.resolve(cwd, "apps", "web", "src");
  if (existsSync(workspaceCandidate)) {
    return path.resolve(cwd);
  }

  return path.resolve(cwd, "..", "..");
}

const repoRoot = resolveRepoRoot();
const editableRoots = [
  path.join(repoRoot, "apps", "web", "src"),
  path.join(repoRoot, "apps", "api", "src"),
  path.join(repoRoot, "packages", "shared", "src"),
];

function isWithinAllowedRoot(targetPath: string): boolean {
  return editableRoots.some((root) => {
    const relative = path.relative(root, targetPath);
    return targetPath === root || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  });
}

export function resolveEditablePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const target = path.join(repoRoot, normalized);
  if (!isWithinAllowedRoot(target)) {
    throw new Error("Requested path is outside the editor allow list");
  }
  return target;
}

async function buildTree(absolutePath: string, relativeBase: string): Promise<EditorFileNode[]> {
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const filtered = entries.filter((entry) => !["node_modules", ".next", "dist"].includes(entry.name));

  const nodes = await Promise.all(
    filtered.map(async (entry) => {
      const absoluteEntry = path.join(absolutePath, entry.name);
      const relativeEntry = path.join(relativeBase, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        return {
          name: entry.name,
          path: relativeEntry,
          type: "directory" as const,
          children: await buildTree(absoluteEntry, relativeEntry),
        };
      }

      return {
        name: entry.name,
        path: relativeEntry,
        type: "file" as const,
      };
    })
  );

  return nodes.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "directory" ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
}

export async function listEditableFiles(): Promise<EditorFileNode[]> {
  return Promise.all(
    editableRoots.map(async (root) => ({
      name: path.basename(root),
      path: path.relative(repoRoot, root).replace(/\\/g, "/"),
      type: "directory" as const,
      children: await buildTree(root, path.relative(repoRoot, root)),
    }))
  );
}

export async function readEditableFile(relativePath: string): Promise<string> {
  const target = resolveEditablePath(relativePath);
  return fs.readFile(target, "utf8");
}

export async function writeEditableFile(relativePath: string, content: string): Promise<void> {
  const target = resolveEditablePath(relativePath);
  await fs.writeFile(target, content, "utf8");
}

async function collectFiles(absolutePath: string, predicate: (relativePath: string) => boolean): Promise<string[]> {
  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const collected: string[] = [];

  for (const entry of entries) {
    if (["node_modules", ".next", "dist"].includes(entry.name)) continue;

    const absoluteEntry = path.join(absolutePath, entry.name);
    const relativeEntry = path.relative(repoRoot, absoluteEntry).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      collected.push(...await collectFiles(absoluteEntry, predicate));
      continue;
    }

    if (predicate(relativeEntry)) {
      collected.push(relativeEntry);
    }
  }

  return collected;
}

export async function buildEditorManifest(): Promise<EditorManifest> {
  const webAppRoot = path.join(repoRoot, "apps", "web", "src", "app");
  const apiRoutesRoot = path.join(repoRoot, "apps", "api", "src", "routes");
  const nextComponentsRoot = path.join(repoRoot, "apps", "web", "src", "next");

  const webRouteFiles = existsSync(webAppRoot)
    ? await collectFiles(webAppRoot, (relativePath) => /\/page\.(t|j)sx?$/.test(relativePath))
    : [];
  const apiRouteFiles = existsSync(apiRoutesRoot)
    ? await collectFiles(apiRoutesRoot, (relativePath) => /\.(t|j)s$/.test(relativePath))
    : [];
  const nextComponentFiles = existsSync(nextComponentsRoot)
    ? await collectFiles(nextComponentsRoot, (relativePath) => /\.(t|j)sx$/.test(relativePath))
    : [];

  return {
    editable_roots: editableRoots.map((root) => path.relative(repoRoot, root).replace(/\\/g, "/")),
    web_routes: webRouteFiles.map((file) => ({
      route: file
        .replace(/^apps\/web\/src\/app/, "")
        .replace(/\/page\.(t|j)sx?$/, "")
        .replace(/\/route$/, "")
        || "/",
      file,
    })),
    api_routes: apiRouteFiles.map((file) => ({
      route: `/api/${path.basename(file).replace(/\.(t|j)s$/, "")}`,
      file,
    })),
    next_components: nextComponentFiles.map((file) => ({
      name: path.basename(file).replace(/\.(t|j)sx$/, ""),
      path: file,
    })),
  };
}
