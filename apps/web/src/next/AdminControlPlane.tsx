"use client";

import { useEffect, useMemo, useState } from "react";
import { Code2, Eye, FolderTree, RefreshCcw, Save, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";

type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

type EditorManifest = {
  editable_roots: string[];
  web_routes: Array<{ route: string; file: string }>;
  api_routes: Array<{ route: string; file: string }>;
  next_components: Array<{ name: string; path: string }>;
};

function TreeNode({
  node,
  onSelect,
  selectedPath,
}: {
  node: FileNode;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) {
  if (node.type === "file") {
    return (
      <button
        className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
          selectedPath === node.path ? "bg-gold/15 text-gold-light" : "text-white/70 hover:bg-white/5 hover:text-white"
        }`}
        onClick={() => onSelect(node.path)}
      >
        {node.name}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="px-3 text-[11px] uppercase tracking-[0.22em] text-white/35">{node.name}</div>
      <div className="space-y-1 border-l border-white/10 pl-3">
        {(node.children ?? []).map((child) => (
          <TreeNode key={child.path} node={child} onSelect={onSelect} selectedPath={selectedPath} />
        ))}
      </div>
    </div>
  );
}

export function AdminControlPlane() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [manifest, setManifest] = useState<EditorManifest | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Loading admin editor...");
  const [saving, setSaving] = useState(false);
  const [previewPath, setPreviewPath] = useState("/dashboard");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  useEffect(() => {
    async function loadFiles() {
      const [filesResponse, manifestResponse] = await Promise.all([
        fetch("/api/admin/files"),
        fetch("/api/admin/manifest"),
      ]);

      const filesData = (await filesResponse.json()) as { items?: FileNode[]; error?: string };
      const manifestData = (await manifestResponse.json()) as EditorManifest & { error?: string };

      if (!filesResponse.ok) {
        throw new Error(filesData.error || "Unable to load editor files");
      }
      if (!manifestResponse.ok) {
        throw new Error(manifestData.error || "Unable to load editor manifest");
      }

      setFiles(filesData.items ?? []);
      setManifest(manifestData);
      setStatus("Admin editor ready");
    }

    loadFiles().catch((error) => setStatus((error as Error).message));
  }, []);

  useEffect(() => {
    if (!selectedPath) return;
    const activePath = selectedPath;

    async function loadFile() {
      const response = await fetch(`/api/admin/file?path=${encodeURIComponent(activePath)}`);
      const data = (await response.json()) as { content?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to load file");
      }
      setContent(data.content ?? "");
      setStatus(`Loaded ${activePath}`);
    }

    loadFile().catch((error) => setStatus((error as Error).message));
  }, [selectedPath]);

  const previewUrl = useMemo(() => previewPath || "/dashboard", [previewPath]);
  const launchRoutes = useMemo(() => {
    const preferredOrder = ["/admin", "/scraper", "/dashboard", "/leads", "/ai-assistant", "/settings"];
    const byRoute = new Map((manifest?.web_routes ?? []).map((item) => [item.route, item]));
    const preferred = preferredOrder
      .map((route) => byRoute.get(route))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const overflow = (manifest?.web_routes ?? []).filter((item) => !preferredOrder.includes(item.route)).slice(0, 4);
    return [...preferred, ...overflow].slice(0, 8);
  }, [manifest?.web_routes]);
  const previewFrameClassName = useMemo(() => {
    if (previewViewport === "mobile") return "mx-auto max-w-sm";
    if (previewViewport === "tablet") return "mx-auto max-w-4xl";
    return "w-full";
  }, [previewViewport]);

  function openRoute(route: { route: string; file: string }) {
    setPreviewPath(route.route);
    setPreviewKey((value) => value + 1);
    setSelectedPath(route.file);
    setStatus(`Opened ${route.route}`);
  }

  async function saveFile() {
    if (!selectedPath) return;
    setSaving(true);
    setStatus(`Saving ${selectedPath}...`);
    try {
      const response = await fetch("/api/admin/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedPath, content }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to save file");
      }
      setStatus(`Saved ${selectedPath}`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <FolderTree className="h-4 w-4 text-gold" />
          Editable workspace
        </div>
        <div className="mt-2 text-sm text-white/55">
          Admin-only editor wired into the live host so you can adjust the frontend and runtime files without leaving the control plane.
        </div>
        <div className="mt-4 space-y-4 overflow-y-auto pr-2" style={{ maxHeight: "70vh" }}>
          {files.map((node) => (
            <TreeNode key={node.path} node={node} onSelect={setSelectedPath} selectedPath={selectedPath} />
          ))}
        </div>
      </section>

      <div className="grid gap-4">
        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-gold" />
            Operator manifest
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Editable roots</div>
              <div className="mt-2 text-2xl font-black text-white">{manifest?.editable_roots.length ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Web routes</div>
              <div className="mt-2 text-2xl font-black text-white">{manifest?.web_routes.length ?? 0}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Runtime components</div>
              <div className="mt-2 text-2xl font-black text-white">{manifest?.next_components.length ?? 0}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">Routes</div>
              <div className="space-y-2 text-sm text-white/70">
                {(manifest?.web_routes ?? []).slice(0, 6).map((item) => (
                  <div key={item.file} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <div className="font-semibold text-white">{item.route}</div>
                    <div className="mt-1 text-xs text-white/45">{item.file}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 xl:col-span-2">
              <div className="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">Components</div>
              <div className="flex flex-wrap gap-2">
                {(manifest?.next_components ?? []).slice(0, 16).map((item) => (
                  <button
                    key={item.path}
                    onClick={() => setSelectedPath(item.path)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:border-gold/30 hover:text-white"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <TerminalSquare className="h-4 w-4 text-gold" />
            Operator quick launch
          </div>
          <div className="mt-2 text-sm leading-6 text-white/55">
            Launch a live route, open the backing source file, then validate the change in the same cockpit.
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {launchRoutes.map((route) => (
              <button
                key={`${route.route}-${route.file}`}
                type="button"
                onClick={() => openRoute(route)}
                className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-gold/30 hover:bg-white/5"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Route</div>
                <div className="mt-2 text-base font-semibold text-white">{route.route}</div>
                <div className="mt-2 text-xs leading-5 text-white/45">{route.file}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Selected file</div>
              <div className="mt-2 text-sm font-semibold text-white">{selectedPath ?? "No file selected"}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Preview route</div>
              <div className="mt-2 text-sm font-semibold text-white">{previewUrl}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/40">Operator loop</div>
              <div className="mt-2 text-sm leading-6 text-white/60">Launch route, edit source, save, refresh preview, then validate the workspace in browser tests.</div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Code2 className="h-4 w-4 text-gold" />
                Center editor
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/35">
                {selectedPath ?? "Select a file from the left rail"}
              </div>
            </div>
            <button
              onClick={saveFile}
              disabled={!selectedPath || saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save file"}
            </button>
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Select a file to start editing."
            className="mt-4 min-h-[380px] w-full rounded-2xl border border-white/10 bg-neutral-950 p-4 font-mono text-sm text-white outline-none focus:border-gold/40"
          />
          <div className="mt-3 flex items-center gap-2 text-sm text-white/55">
            <ShieldCheck className="h-4 w-4 text-gold" />
            {status}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Eye className="h-4 w-4 text-gold" />
              Live preview
            </div>
            <div className="flex w-full max-w-xl flex-wrap gap-2">
              <input
                value={previewPath}
                onChange={(event) => setPreviewPath(event.target.value)}
                className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none focus:border-gold/40"
              />
              <button
                type="button"
                onClick={() => setPreviewKey((value) => value + 1)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-gold/30"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>
              <div className="flex gap-2">
                {(["desktop", "tablet", "mobile"] as const).map((viewport) => (
                  <button
                    key={viewport}
                    type="button"
                    onClick={() => setPreviewViewport(viewport)}
                    className={`rounded-2xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                      previewViewport === viewport
                        ? "border-gold/40 bg-gold/12 text-gold-light"
                        : "border-white/10 bg-white/5 text-white/75 hover:border-gold/30"
                    }`}
                  >
                    {viewport}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
            <div className={previewFrameClassName}>
              <iframe key={previewKey} title="Admin preview" src={previewUrl} className="h-[420px] w-full bg-white" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-white/55">
            <TerminalSquare className="h-4 w-4 text-gold" />
            Donor-aligned operator cockpit: route launch, center editor, save path, and refreshable live preview now sit inside the admin plane.
          </div>
        </section>
      </div>
    </div>
  );
}
