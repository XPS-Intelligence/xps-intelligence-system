import { Router } from "express";
import { z } from "zod";
import { getDb } from "../lib/db.js";
import { env } from "../lib/env.js";
import { syncCandidateToHubSpot } from "../lib/hubspot.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const leadCandidatesRouter = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(25),
  status: z.string().optional(),
  territory: z.string().optional(),
  vertical: z.string().optional(),
});

const promoteSchema = z.object({
  lifecycle_stage: z.string().optional(),
  pipeline_stage: z.string().optional(),
});

leadCandidatesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters" });
    }

    const db = getDb();
    const { limit, status, territory, vertical } = parsed.data;

    const filters: string[] = [];
    const values: Array<string | number> = [];

    if (status) {
      values.push(status);
      filters.push(`lc.candidate_status = $${values.length}`);
    }
    if (territory) {
      values.push(territory);
      filters.push(`lc.territory = $${values.length}`);
    }
    if (vertical) {
      values.push(vertical);
      filters.push(`cc.vertical = $${values.length}`);
    }

    values.push(limit);

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const result = await db.query<{
      id: string;
      company_name: string;
      primary_contact_name: string | null;
      primary_contact_email: string | null;
      score: string | null;
      vertical: string | null;
      territory: string | null;
      candidate_status: string;
      recommendation_type: string | null;
      updated_at: string;
    }>(
      `SELECT
         lc.id,
         cc.display_name AS company_name,
         contact.full_name AS primary_contact_name,
         contact.email AS primary_contact_email,
         score.total_score::text AS score,
         cc.vertical,
         lc.territory,
         lc.candidate_status,
         recommendation.recommendation_type,
         lc.updated_at::text AS updated_at
       FROM lead_candidates lc
       JOIN canonical_companies cc ON cc.id = lc.company_id
       LEFT JOIN canonical_contacts contact ON contact.id = lc.primary_contact_id
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
       ${whereClause}
       ORDER BY lc.updated_at DESC, lc.created_at DESC
       LIMIT $${values.length}`,
      values
    );

    return res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        company_name: row.company_name,
        primary_contact_name: row.primary_contact_name,
        primary_contact_email: row.primary_contact_email,
        score: Number(row.score ?? 0),
        vertical: row.vertical ?? "unclassified",
        territory: row.territory,
        candidate_status: row.candidate_status,
        recommendation_type: row.recommendation_type,
        updated_at: row.updated_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

leadCandidatesRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query<{
      id: string;
      company_name: string;
      vertical: string | null;
      territory: string | null;
      candidate_status: string;
      score: string | null;
      company_metadata: Record<string, unknown> | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      recommendation_type: string | null;
      recommendation_payload: Record<string, unknown> | null;
      explanation: string | null;
    }>(
      `SELECT
         lc.id,
         cc.display_name AS company_name,
         cc.vertical,
         lc.territory,
         lc.candidate_status,
         score.total_score::text AS score,
         cc.metadata AS company_metadata,
         contact.full_name AS contact_name,
         contact.email AS contact_email,
         contact.phone AS contact_phone,
         recommendation.recommendation_type,
         recommendation.recommendation_payload,
         recommendation.explanation
       FROM lead_candidates lc
       JOIN canonical_companies cc ON cc.id = lc.company_id
       LEFT JOIN canonical_contacts contact ON contact.id = lc.primary_contact_id
       LEFT JOIN LATERAL (
         SELECT total_score
         FROM lead_scores
         WHERE lead_candidate_id = lc.id
         ORDER BY scored_at DESC, created_at DESC
         LIMIT 1
       ) score ON TRUE
       LEFT JOIN LATERAL (
         SELECT recommendation_type, recommendation_payload, explanation
         FROM recommendations
         WHERE lead_candidate_id = lc.id
         ORDER BY recommendation_rank ASC, created_at DESC
         LIMIT 1
       ) recommendation ON TRUE
       WHERE lc.id = $1
       LIMIT 1`,
      [req.params.id]
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: "Lead candidate not found" });
    }

    return res.json({
      id: row.id,
      company_name: row.company_name,
      vertical: row.vertical ?? "unclassified",
      territory: row.territory,
      candidate_status: row.candidate_status,
      score: Number(row.score ?? 0),
      company_metadata: row.company_metadata ?? {},
      primary_contact: {
        name: row.contact_name,
        email: row.contact_email,
        phone: row.contact_phone,
      },
      top_recommendation: row.recommendation_type
        ? {
            type: row.recommendation_type,
            payload: row.recommendation_payload ?? {},
            explanation: row.explanation,
          }
        : null,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

leadCandidatesRouter.post("/:id/promote", requireAuth, requireRole("manager", "owner", "admin"), async (req, res) => {
  try {
    const parsed = promoteSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid promotion payload" });
    }

    if (!env.HUBSPOT_ACCESS_TOKEN) {
      return res.status(503).json({ error: "HubSpot is not configured" });
    }

    const db = getDb();
    const result = await db.query<{
      id: string;
      company_name: string;
      vertical: string | null;
      territory: string | null;
      candidate_status: string;
      score: string | null;
      company_metadata: Record<string, unknown> | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      recommendation_type: string | null;
      recommendation_payload: Record<string, unknown> | null;
      explanation: string | null;
      crm_lead_id: string | null;
      crm_record_id: string | null;
    }>(
      `SELECT
         lc.id,
         cc.display_name AS company_name,
         cc.vertical,
         lc.territory,
         lc.candidate_status,
         score.total_score::text AS score,
         cc.metadata AS company_metadata,
         contact.full_name AS contact_name,
         contact.email AS contact_email,
         contact.phone AS contact_phone,
         recommendation.recommendation_type,
         recommendation.recommendation_payload,
         recommendation.explanation,
         crm.id AS crm_lead_id,
         crm.crm_record_id
       FROM lead_candidates lc
       JOIN canonical_companies cc ON cc.id = lc.company_id
       LEFT JOIN canonical_contacts contact ON contact.id = lc.primary_contact_id
       LEFT JOIN crm_leads crm ON crm.lead_candidate_id = lc.id
       LEFT JOIN LATERAL (
         SELECT total_score
         FROM lead_scores
         WHERE lead_candidate_id = lc.id
         ORDER BY scored_at DESC, created_at DESC
         LIMIT 1
       ) score ON TRUE
       LEFT JOIN LATERAL (
         SELECT recommendation_type, recommendation_payload, explanation
         FROM recommendations
         WHERE lead_candidate_id = lc.id
         ORDER BY recommendation_rank ASC, created_at DESC
         LIMIT 1
       ) recommendation ON TRUE
       WHERE lc.id = $1
       LIMIT 1`,
      [req.params.id]
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: "Lead candidate not found" });
    }

    const score = Number(row.score ?? 0);
    if (!row.company_name || score < 40) {
      return res.status(422).json({ error: "Lead candidate is not promotable yet" });
    }

    if (!row.contact_email && !row.contact_phone) {
      return res.status(422).json({ error: "Candidate requires at least one contact method before CRM promotion" });
    }

    const syncResult = await syncCandidateToHubSpot(
      {
        id: row.id,
        company_name: row.company_name,
        vertical: row.vertical,
        territory: row.territory,
        candidate_status: row.candidate_status,
        score,
        company_metadata: row.company_metadata ?? {},
        primary_contact: {
          name: row.contact_name,
          email: row.contact_email,
          phone: row.contact_phone,
        },
        top_recommendation: row.recommendation_type
          ? {
              type: row.recommendation_type,
              payload: row.recommendation_payload ?? {},
              explanation: row.explanation,
            }
          : null,
      },
      {
        existingCompanyId: row.crm_record_id,
        lifecycleStage: parsed.data.lifecycle_stage || env.HUBSPOT_LIFECYCLE_STAGE,
        pipelineStage: parsed.data.pipeline_stage || env.HUBSPOT_PIPELINE_STAGE,
      }
    );

    const crmLeadResult = await db.query<{ id: string }>(
      `INSERT INTO crm_leads (
         lead_candidate_id, crm_system, crm_record_id, lifecycle_stage, pipeline_stage, owner_id, synced_at, metadata
       )
       VALUES ($1,'hubspot',$2,$3,$4,$5,NOW(),$6)
       ON CONFLICT (lead_candidate_id)
       DO UPDATE SET
         crm_record_id = EXCLUDED.crm_record_id,
         lifecycle_stage = EXCLUDED.lifecycle_stage,
         pipeline_stage = EXCLUDED.pipeline_stage,
         owner_id = EXCLUDED.owner_id,
         synced_at = NOW(),
         metadata = crm_leads.metadata || EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING id`,
      [
        row.id,
        syncResult.companyId,
        syncResult.lifecycleStage,
        syncResult.pipelineStage,
        req.user?.id ?? null,
        JSON.stringify({
          contact_id: syncResult.contactId,
          last_sync_at: new Date().toISOString(),
        }),
      ]
    );

    await db.query(
      `INSERT INTO hubspot_sync_events (
         crm_lead_id, sync_direction, event_type, request_payload, response_payload, status, metadata
       )
       VALUES ($1,'outbound',$2,$3,$4,'synced',$5)`,
      [
        crmLeadResult.rows[0].id,
        row.crm_lead_id ? "update" : "create",
        JSON.stringify(syncResult.requestPayload),
        JSON.stringify(syncResult.responsePayload),
        JSON.stringify({
          promoted_by: req.user?.id ?? null,
          candidate_id: row.id,
        }),
      ]
    );

    await db.query(
      `UPDATE lead_candidates
       SET candidate_status = 'activated',
           updated_at = NOW()
       WHERE id = $1`,
      [row.id]
    );

    return res.json({
      status: "synced",
      crm_lead_id: crmLeadResult.rows[0].id,
      crm_record_id: syncResult.companyId,
      contact_id: syncResult.contactId,
      lifecycle_stage: syncResult.lifecycleStage,
      pipeline_stage: syncResult.pipelineStage,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});
