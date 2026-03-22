import { Router } from "express";
import { getDb } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

type SummaryResponse = {
  total_leads: number;
  pipeline_value: number;
  proposals_sent: number;
  close_rate: number;
  monthly_revenue: Array<{ month: string; value: number }>;
  pipeline_stages: Array<{ name: string; value: number }>;
  recent_leads: Array<{
    company_name: string;
    vertical: string;
    score: number;
    stage: string;
    estimated_value: number;
  }>;
  recent_activities: Array<{ type: string; subject: string; created_at: string }>;
};

const ZERO_SUMMARY: SummaryResponse = {
  total_leads: 0,
  pipeline_value: 0,
  proposals_sent: 0,
  close_rate: 0,
  monthly_revenue: [],
  pipeline_stages: [],
  recent_leads: [],
  recent_activities: [],
};

analyticsRouter.get("/summary", async (_req, res) => {
  try {
    const db = getDb();

    const [
      totalsResult,
      stagesResult,
      recentLeadsResult,
      recentRecommendationsResult,
    ] = await Promise.all([
      db.query<{
        total_leads: string;
        pipeline_value: string;
        activated_count: string;
        approved_count: string;
      }>(
        `SELECT
           COUNT(*)::int::text AS total_leads,
           COALESCE(SUM(CASE WHEN lc.candidate_status IN ('approved', 'activated')
             THEN COALESCE((ls.subscores->>'fit')::numeric, ls.total_score, 0) * 1000
             ELSE 0
           END), 0)::text AS pipeline_value,
           COUNT(*) FILTER (WHERE lc.candidate_status = 'activated')::int::text AS activated_count,
           COUNT(*) FILTER (WHERE lc.candidate_status IN ('approved', 'activated'))::int::text AS approved_count
         FROM lead_candidates lc
         LEFT JOIN LATERAL (
           SELECT total_score, subscores
           FROM lead_scores
           WHERE lead_candidate_id = lc.id
           ORDER BY scored_at DESC, created_at DESC
           LIMIT 1
         ) ls ON TRUE`
      ),
      db.query<{ name: string; value: string }>(
        `SELECT candidate_status AS name, COUNT(*)::int::text AS value
         FROM lead_candidates
         GROUP BY candidate_status
         ORDER BY COUNT(*) DESC, candidate_status ASC`
      ),
      db.query<{
        company_name: string;
        vertical: string | null;
        score: string | null;
        stage: string;
        estimated_value: string | null;
      }>(
        `SELECT
           cc.display_name AS company_name,
           cc.vertical,
           ls.total_score::text AS score,
           lc.candidate_status AS stage,
           CASE
             WHEN ls.total_score IS NULL THEN NULL
             ELSE ROUND(ls.total_score * 1000)::text
           END AS estimated_value
         FROM lead_candidates lc
         JOIN canonical_companies cc ON cc.id = lc.company_id
         LEFT JOIN LATERAL (
           SELECT total_score
           FROM lead_scores
           WHERE lead_candidate_id = lc.id
           ORDER BY scored_at DESC, created_at DESC
           LIMIT 1
         ) ls ON TRUE
         ORDER BY lc.updated_at DESC, lc.created_at DESC
         LIMIT 8`
      ),
      db.query<{ recommendation_type: string; created_at: string; company_name: string }>(
        `SELECT
           r.recommendation_type,
           r.created_at::text AS created_at,
           cc.display_name AS company_name
         FROM recommendations r
         JOIN lead_candidates lc ON lc.id = r.lead_candidate_id
         JOIN canonical_companies cc ON cc.id = lc.company_id
         ORDER BY r.created_at DESC
         LIMIT 8`
      ),
    ]);

    const totals = totalsResult.rows[0];
    const approvedCount = Number(totals?.approved_count ?? 0);
    const activatedCount = Number(totals?.activated_count ?? 0);

    const summary: SummaryResponse = {
      total_leads: Number(totals?.total_leads ?? 0),
      pipeline_value: Number(totals?.pipeline_value ?? 0),
      proposals_sent: approvedCount,
      close_rate: approvedCount > 0 ? Math.round((activatedCount / approvedCount) * 100) : 0,
      monthly_revenue: [],
      pipeline_stages: stagesResult.rows.map((row) => ({
        name: row.name,
        value: Number(row.value),
      })),
      recent_leads: recentLeadsResult.rows.map((row) => ({
        company_name: row.company_name,
        vertical: row.vertical ?? "unclassified",
        score: Number(row.score ?? 0),
        stage: row.stage,
        estimated_value: Number(row.estimated_value ?? 0),
      })),
      recent_activities: recentRecommendationsResult.rows.map((row) => ({
        type: row.recommendation_type,
        subject: `${row.recommendation_type} recommendation for ${row.company_name}`,
        created_at: row.created_at,
      })),
    };

    res.json(summary);
  } catch {
    res.json(ZERO_SUMMARY);
  }
});
