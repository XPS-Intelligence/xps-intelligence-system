import { Router } from "express";
import { getDb } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export const assistantsRouter = Router();

assistantsRouter.get("/briefing", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const role = req.user?.role ?? "employee";
    const autonomyMode = req.user?.autonomy_mode ?? "hybrid";

    const [candidateCounts, topCandidates, recentJobs, crmStats] = await Promise.all([
      db.query<{ total: string; activated: string; hot: string }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE candidate_status = 'activated')::text AS activated,
           COUNT(*) FILTER (
             WHERE EXISTS (
               SELECT 1
               FROM lead_scores score
               WHERE score.lead_candidate_id = lc.id
                 AND score.total_score >= 75
             )
           )::text AS hot
         FROM lead_candidates lc`
      ),
      db.query<{ company_name: string; total_score: string; recommendation_type: string | null }>(
        `SELECT
           cc.display_name AS company_name,
           COALESCE(score.total_score, 0)::text AS total_score,
           recommendation.recommendation_type
         FROM lead_candidates lc
         JOIN canonical_companies cc ON cc.id = lc.company_id
         LEFT JOIN LATERAL (
           SELECT total_score
           FROM lead_scores
           WHERE lead_candidate_id = lc.id
           ORDER BY scored_at DESC, created_at DESC
           LIMIT 1
         ) score ON TRUE
         LEFT JOIN LATERAL (
           SELECT recommendation_type
           FROM recommendations
           WHERE lead_candidate_id = lc.id
           ORDER BY recommendation_rank ASC, created_at DESC
           LIMIT 1
         ) recommendation ON TRUE
         ORDER BY COALESCE(score.total_score, 0) DESC, lc.updated_at DESC
         LIMIT 3`
      ),
      db.query<{ job_type: string; status: string; created_at: string }>(
        `SELECT job_type, status, created_at::text
         FROM crawl_jobs
         ORDER BY created_at DESC
         LIMIT 5`
      ),
      db.query<{ synced: string; failed: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'synced')::text AS synced,
           COUNT(*) FILTER (WHERE status = 'failed')::text AS failed
         FROM hubspot_sync_events`
      ),
    ]);

    const totals = candidateCounts.rows[0] ?? { total: "0", activated: "0", hot: "0" };
    const sync = crmStats.rows[0] ?? { synced: "0", failed: "0" };

    return res.json({
      role,
      autonomy_mode: autonomyMode,
      cards: [
        {
          id: "funnel",
          title: role === "owner" ? "Executive funnel posture" : role === "manager" ? "Team funnel posture" : "Your next-best funnel moves",
          priority: "high",
          summary: `${totals.total} candidates in play, ${totals.hot} hot opportunities, ${totals.activated} already activated into CRM.`,
          action: role === "employee" ? "Focus on the highest-score candidates before they go stale." : "Review promotion readiness and validation gaps.",
          route: "/leads",
        },
        {
          id: "crawl",
          title: "Capture and validation watch",
          priority: recentJobs.rows.some((job) => job.status === "failed") ? "high" : "medium",
          summary: recentJobs.rows.length
            ? `Latest jobs: ${recentJobs.rows.map((job) => `${job.job_type}:${job.status}`).join(", ")}`
            : "No recent crawl jobs. Run a search or crawl to refresh the pipeline.",
          action: "Use Scraper to refresh the pipeline and clear failed jobs immediately.",
          route: "/scraper",
        },
        {
          id: "crm",
          title: "CRM sync posture",
          priority: Number(sync.failed) > 0 ? "high" : "medium",
          summary: `${sync.synced} successful HubSpot sync events, ${sync.failed} failed events recorded.`,
          action: "Promote only validated candidates and clear failed syncs before increasing automation.",
          route: "/crm",
        },
      ],
      top_candidates: topCandidates.rows.map((row) => ({
        company_name: row.company_name,
        score: Number(row.total_score || 0),
        recommendation_type: row.recommendation_type,
      })),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});
