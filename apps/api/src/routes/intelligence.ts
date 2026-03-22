import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { loadIntelligenceSnapshot, loadIntelligenceSummary } from "../lib/intelligence.js";

export const intelligenceRouter = Router();
intelligenceRouter.use(requireAuth);

intelligenceRouter.get("/", async (_req, res) => {
  try {
    const snapshot = await loadIntelligenceSnapshot();
    return res.json(snapshot);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to load intelligence snapshot",
      message: (error as Error).message,
    });
  }
});

intelligenceRouter.get("/summary", async (_req, res) => {
  try {
    const summary = await loadIntelligenceSummary();
    return res.json(summary);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to load intelligence summary",
      message: (error as Error).message,
    });
  }
});

intelligenceRouter.get("/taxonomy", async (_req, res) => {
  try {
    const snapshot = await loadIntelligenceSnapshot();
    return res.json({
      generated_at: snapshot.generated_at,
      workspace_root: snapshot.workspace_root,
      status: snapshot.status,
      taxonomy: snapshot.catalog.taxonomy,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to load taxonomy snapshot",
      message: (error as Error).message,
    });
  }
});

intelligenceRouter.get("/seeds", async (_req, res) => {
  try {
    const snapshot = await loadIntelligenceSnapshot();
    return res.json({
      generated_at: snapshot.generated_at,
      workspace_root: snapshot.workspace_root,
      status: snapshot.status,
      seeds: snapshot.catalog.seeds,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to load seed snapshot",
      message: (error as Error).message,
    });
  }
});

intelligenceRouter.get("/benchmarks", async (_req, res) => {
  try {
    const snapshot = await loadIntelligenceSnapshot();
    return res.json({
      generated_at: snapshot.generated_at,
      workspace_root: snapshot.workspace_root,
      status: snapshot.status,
      benchmarks: snapshot.catalog.benchmarks,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to load benchmark snapshot",
      message: (error as Error).message,
    });
  }
});

intelligenceRouter.get("/distillation", async (_req, res) => {
  try {
    const snapshot = await loadIntelligenceSnapshot();
    return res.json({
      generated_at: snapshot.generated_at,
      workspace_root: snapshot.workspace_root,
      status: snapshot.status,
      distillation: snapshot.catalog.distillation,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to load distillation snapshot",
      message: (error as Error).message,
    });
  }
});

intelligenceRouter.get("/validation", async (_req, res) => {
  try {
    const snapshot = await loadIntelligenceSnapshot();
    return res.json({
      generated_at: snapshot.generated_at,
      workspace_root: snapshot.workspace_root,
      status: snapshot.status,
      validation: snapshot.catalog.validation,
      reflection: snapshot.catalog.reflection,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to load validation snapshot",
      message: (error as Error).message,
    });
  }
});
