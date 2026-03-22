import { readFile, stat } from "node:fs/promises";
import path from "node:path";

type MarkdownSignals = {
  headings: string[];
  bullets: string[];
  codeBlocks: number;
  title: string | null;
  preview: string;
};

export type IntelligenceArtifact = {
  key: string;
  repo: string;
  path: string;
  exists: boolean;
  size: number;
  modified_at: string | null;
  title: string | null;
  headings: string[];
  bullets: string[];
  code_blocks: number;
  preview: string;
  content: string | null;
};

export type IntelligenceRepositorySnapshot = {
  repo: "xps-intel" | "xps-distallation-system";
  root: string | null;
  status: "available" | "partial" | "missing";
  artifacts: IntelligenceArtifact[];
  totals: {
    files: number;
    available_files: number;
    headings: number;
    bullets: number;
  };
};

export type IntelligenceSnapshot = {
  generated_at: string;
  workspace_root: string | null;
  status: "available" | "partial" | "missing";
  repositories: {
    intel: IntelligenceRepositorySnapshot;
    distallation: IntelligenceRepositorySnapshot;
  };
  summary: {
    taxonomy_files: number;
    seed_files: number;
    benchmark_files: number;
    distillation_files: number;
    validation_files: number;
    reflection_files: number;
  };
  catalog: {
    taxonomy: IntelligenceArtifact[];
    seeds: IntelligenceArtifact[];
    benchmarks: IntelligenceArtifact[];
    distillation: IntelligenceArtifact[];
    validation: IntelligenceArtifact[];
    reflection: IntelligenceArtifact[];
  };
};

type FileSpec = {
  key: string;
  relativePath: string;
  bucket: keyof IntelligenceSnapshot["catalog"];
};

type RepoSpec = {
  repo: "xps-intel" | "xps-distallation-system";
  files: FileSpec[];
};

const CACHE_TTL_MS = 30_000;
const START_DIR = process.cwd();

const repoSpecs: RepoSpec[] = [
  {
    repo: "xps-intel",
    files: [
      { key: "intel-readme", relativePath: "README.md", bucket: "taxonomy" },
      { key: "taxonomy-readme", relativePath: "taxonomy/README.md", bucket: "taxonomy" },
      { key: "taxonomy-core", relativePath: "taxonomy/XPS_INDUSTRY_TAXONOMY.md", bucket: "taxonomy" },
      { key: "seed-readme", relativePath: "seed/README.md", bucket: "seeds" },
      { key: "seed-registry", relativePath: "seed/XPS_SEED_REGISTRY.md", bucket: "seeds" },
      { key: "benchmark-readme", relativePath: "benchmarks/README.md", bucket: "benchmarks" },
      { key: "benchmark-pack", relativePath: "benchmarks/BEST_IN_CLASS_BENCHMARKS.md", bucket: "benchmarks" },
      { key: "distillate-readme", relativePath: "distillates/README.md", bucket: "distillation" },
      { key: "distillate-index", relativePath: "distillates/DISTILLATE_INDEX.md", bucket: "distillation" },
      { key: "index-readme", relativePath: "indices/README.md", bucket: "distillation" },
      { key: "ontology-readme", relativePath: "ontology/README.md", bucket: "taxonomy" },
      { key: "schemas-readme", relativePath: "schemas/README.md", bucket: "taxonomy" },
    ],
  },
  {
    repo: "xps-distallation-system",
    files: [
      { key: "distallation-readme", relativePath: "README.md", bucket: "distillation" },
      { key: "contract-readme", relativePath: "contracts/README.md", bucket: "distillation" },
      { key: "contract-core", relativePath: "contracts/DISTILLATION_CONTRACT.md", bucket: "distillation" },
      { key: "validators-readme", relativePath: "validators/README.md", bucket: "validation" },
      { key: "validation-matrix", relativePath: "validators/VALIDATION_MATRIX.md", bucket: "validation" },
      { key: "docs-readme", relativePath: "docs/ARCHITECTURE.md", bucket: "reflection" },
      { key: "docs-env", relativePath: "docs/ENVIRONMENT.md", bucket: "reflection" },
      { key: "docs-issue-ladder", relativePath: "docs/ISSUE_LADDER.md", bucket: "reflection" },
      { key: "quality-loop", relativePath: "docs/REFLECTION_AND_QUALITY_LOOP.md", bucket: "reflection" },
      { key: "jobs-readme", relativePath: "jobs/README.md", bucket: "distillation" },
      { key: "packagers-readme", relativePath: "packagers/README.md", bucket: "distillation" },
      { key: "pipelines-readme", relativePath: "pipelines/README.md", bucket: "distillation" },
      { key: "tests-readme", relativePath: "tests/README.md", bucket: "validation" },
    ],
  },
];

let cachedSnapshot: { at: number; snapshot: IntelligenceSnapshot } | null = null;

const taxonomyKeys = new Set([
  "intel-readme",
  "taxonomy-readme",
  "taxonomy-core",
  "ontology-readme",
  "schemas-readme",
]);

const seedKeys = new Set([
  "seed-readme",
  "seed-registry",
]);

const benchmarkKeys = new Set([
  "benchmark-readme",
  "benchmark-pack",
]);

const distillationKeys = new Set([
  "distillate-readme",
  "distillate-index",
  "index-readme",
  "distallation-readme",
  "contract-readme",
  "contract-core",
  "jobs-readme",
  "packagers-readme",
  "pipelines-readme",
]);

const validationKeys = new Set([
  "validators-readme",
  "validation-matrix",
  "tests-readme",
]);

const reflectionKeys = new Set([
  "docs-readme",
  "docs-env",
  "docs-issue-ladder",
  "quality-loop",
]);

async function isDirectory(pathname: string): Promise<boolean> {
  return stat(pathname).then((result) => result.isDirectory()).catch(() => false);
}

async function findWorkspaceRoot(startDir: string): Promise<string | null> {
  let current = path.resolve(startDir);

  for (;;) {
    const intelRepo = path.join(current, "xps-intel");
    const distRepo = path.join(current, "xps-distallation-system");

    if ((await isDirectory(intelRepo)) && (await isDirectory(distRepo))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

function extractMarkdownSignals(content: string): MarkdownSignals {
  const headings = content.match(/^#{1,6}\s+.+$/gm)?.map((line) => line.replace(/^#{1,6}\s+/, "").trim()) ?? [];
  const bullets = content.match(/^\s*[-*]\s+.+$/gm)?.map((line) => line.replace(/^\s*[-*]\s+/, "").trim()) ?? [];
  const codeBlocks = (content.match(/^```/gm) ?? []).length;
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = headings[0] ?? null;
  const preview = lines.slice(0, 4).join(" ").slice(0, 320);

  return { headings, bullets, codeBlocks, title, preview };
}

async function readArtifact(repoRoot: string | null, repo: RepoSpec["repo"], spec: FileSpec): Promise<IntelligenceArtifact> {
  if (!repoRoot) {
    return {
      key: spec.key,
      repo,
      path: spec.relativePath,
      exists: false,
      size: 0,
      modified_at: null,
      title: null,
      headings: [],
      bullets: [],
      code_blocks: 0,
      preview: "",
      content: null,
    };
  }

  const fullPath = path.join(repoRoot, repo, spec.relativePath);

  try {
    const [raw, fileStat] = await Promise.all([readFile(fullPath, "utf8"), stat(fullPath)]);
    const signals = extractMarkdownSignals(raw);
    return {
      key: spec.key,
      repo,
      path: spec.relativePath,
      exists: true,
      size: fileStat.size,
      modified_at: fileStat.mtime.toISOString(),
      title: signals.title,
      headings: signals.headings,
      bullets: signals.bullets.slice(0, 20),
      code_blocks: signals.codeBlocks,
      preview: signals.preview,
      content: raw,
    };
  } catch {
    return {
      key: spec.key,
      repo,
      path: spec.relativePath,
      exists: false,
      size: 0,
      modified_at: null,
      title: null,
      headings: [],
      bullets: [],
      code_blocks: 0,
      preview: "",
      content: null,
    };
  }
}

function summarizeRepository(repo: IntelligenceRepositorySnapshot): IntelligenceRepositorySnapshot["totals"] {
  return repo.artifacts.reduce(
    (acc, artifact) => ({
      files: acc.files + 1,
      available_files: acc.available_files + Number(artifact.exists),
      headings: acc.headings + artifact.headings.length,
      bullets: acc.bullets + artifact.bullets.length,
    }),
    { files: 0, available_files: 0, headings: 0, bullets: 0 }
  );
}

function deriveRepositoryStatus(totals: IntelligenceRepositorySnapshot["totals"]): IntelligenceRepositorySnapshot["status"] {
  if (totals.available_files === 0) {
    return "missing";
  }
  if (totals.available_files < totals.files) {
    return "partial";
  }
  return "available";
}

function selectArtifacts(artifacts: IntelligenceArtifact[], keys: Set<string>): IntelligenceArtifact[] {
  return artifacts.filter((artifact) => artifact.exists && keys.has(artifact.key));
}

function buildSummary(snapshot: IntelligenceSnapshot) {
  return {
    generated_at: snapshot.generated_at,
    workspace_root: snapshot.workspace_root,
    status: snapshot.status,
    repositories: {
      intel: {
        status: snapshot.repositories.intel.status,
        root: snapshot.repositories.intel.root,
        totals: snapshot.repositories.intel.totals,
      },
      distallation: {
        status: snapshot.repositories.distallation.status,
        root: snapshot.repositories.distallation.root,
        totals: snapshot.repositories.distallation.totals,
      },
    },
    summary: snapshot.summary,
  };
}

export async function loadIntelligenceSnapshot(forceRefresh = false): Promise<IntelligenceSnapshot> {
  if (!forceRefresh && cachedSnapshot && Date.now() - cachedSnapshot.at < CACHE_TTL_MS) {
    return cachedSnapshot.snapshot;
  }

  const workspaceRoot = await findWorkspaceRoot(START_DIR);

  const [intelArtifacts, distArtifacts] = await Promise.all(
    repoSpecs.map(async (repoSpec) => {
      const artifacts = await Promise.all(repoSpec.files.map((spec) => readArtifact(workspaceRoot, repoSpec.repo, spec)));
      const totals = summarizeRepository({
        repo: repoSpec.repo,
        root: workspaceRoot ? path.join(workspaceRoot, repoSpec.repo) : null,
        status: "missing",
        artifacts,
        totals: { files: 0, available_files: 0, headings: 0, bullets: 0 },
      });

      return {
        repo: repoSpec.repo,
        root: workspaceRoot ? path.join(workspaceRoot, repoSpec.repo) : null,
        status: deriveRepositoryStatus(totals),
        artifacts,
        totals,
      } satisfies IntelligenceRepositorySnapshot;
    })
  );

  const snapshot: IntelligenceSnapshot = {
    generated_at: new Date().toISOString(),
    workspace_root: workspaceRoot,
    status:
      intelArtifacts.status === "missing" && distArtifacts.status === "missing"
        ? "missing"
        : intelArtifacts.status === "available" && distArtifacts.status === "available"
          ? "available"
          : "partial",
    repositories: {
      intel: intelArtifacts,
      distallation: distArtifacts,
    },
    summary: {
      taxonomy_files: selectArtifacts(intelArtifacts.artifacts, taxonomyKeys).length,
      seed_files: selectArtifacts(intelArtifacts.artifacts, seedKeys).length,
      benchmark_files: selectArtifacts(intelArtifacts.artifacts, benchmarkKeys).length,
      distillation_files: selectArtifacts([...intelArtifacts.artifacts, ...distArtifacts.artifacts], distillationKeys).length,
      validation_files: selectArtifacts(distArtifacts.artifacts, validationKeys).length,
      reflection_files: selectArtifacts(distArtifacts.artifacts, reflectionKeys).length,
    },
    catalog: {
      taxonomy: selectArtifacts(intelArtifacts.artifacts, taxonomyKeys),
      seeds: selectArtifacts(intelArtifacts.artifacts, seedKeys),
      benchmarks: selectArtifacts(intelArtifacts.artifacts, benchmarkKeys),
      distillation: selectArtifacts([...intelArtifacts.artifacts, ...distArtifacts.artifacts], distillationKeys),
      validation: selectArtifacts(distArtifacts.artifacts, validationKeys),
      reflection: selectArtifacts(distArtifacts.artifacts, reflectionKeys),
    },
  };

  cachedSnapshot = { at: Date.now(), snapshot };
  return snapshot;
}

export async function loadIntelligenceSummary() {
  return buildSummary(await loadIntelligenceSnapshot());
}
