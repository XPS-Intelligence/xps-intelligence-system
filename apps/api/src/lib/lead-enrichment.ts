import type { LeadIntelligenceOutput } from "./lead-intelligence.js";

export type LeadEnrichmentInput = {
  score: number;
  vertical: string;
  territory: string | null;
  primary_domain: string | null;
  primary_contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  intelligence: LeadIntelligenceOutput;
};

export type ContactCoverage = {
  score: number;
  max_score: number;
  percent: number;
  label: "strong" | "partial" | "thin";
  channels: Array<"email" | "sms">;
  signals: {
    has_email: boolean;
    has_phone: boolean;
    has_website: boolean;
    has_contact_name: boolean;
    has_named_contact: boolean;
    has_direct_email: boolean;
  };
  missing: string[];
};

export type Qualification = {
  label: "crm_ready" | "outreach_ready" | "nurture" | "research_required";
  reason: string;
  ready_for_outreach: boolean;
  ready_for_crm: boolean;
  recommendation_type: "outreach" | "sync_crm" | "enrich_more";
};

export type DraftPayload = {
  channel: "email" | "sms";
  body: string;
};

export type LeadEnrichmentRecord = {
  coverage: ContactCoverage;
  qualification: Qualification;
  drafts: DraftPayload[];
};

function clampPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((value / max) * 100);
}

const GENERIC_CONTACT_NAMES = new Set([
  "team",
  "sales team",
  "contact us",
  "office",
  "front desk",
  "customer service",
  "support",
  "admin",
  "owner",
  "manager",
]);

function hasNamedContact(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized || GENERIC_CONTACT_NAMES.has(normalized) || /\d/.test(normalized)) {
    return false;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 2 || tokens.length > 4) {
    return false;
  }

  return tokens.every((token) => /^[a-z][a-z'.-]+$/i.test(token));
}

function hasDirectEmail(value: string | null | undefined): boolean {
  if (!value) return false;
  const localPart = value.split("@")[0]?.trim().toLowerCase() ?? "";
  if (!localPart) return false;
  return !/^(info|sales|contact|hello|office|support|admin|team|service|billing)$/i.test(localPart);
}

export function evaluateContactCoverage(input: Omit<LeadEnrichmentInput, "intelligence" | "score" | "vertical" | "territory">): ContactCoverage {
  const hasEmail = Boolean(input.primary_contact.email);
  const hasPhone = Boolean(input.primary_contact.phone);
  const hasWebsite = Boolean(input.primary_domain);
  const hasContactName = Boolean(input.primary_contact.name);
  const hasSpecificContactName = hasNamedContact(input.primary_contact.name);
  const hasSpecificEmail = hasDirectEmail(input.primary_contact.email);

  const score =
    (hasSpecificEmail ? 2 : hasEmail ? 1 : 0) +
    (hasPhone ? 1 : 0) +
    (hasWebsite ? 1 : 0) +
    (hasSpecificContactName ? 1 : 0);
  const maxScore = 5;
  const label = score >= 4 ? "strong" : score >= 2 ? "partial" : "thin";
  const missing = [
    !hasEmail ? "email" : null,
    hasEmail && !hasSpecificEmail ? "direct_email" : null,
    !hasPhone ? "phone" : null,
    !hasWebsite ? "website" : null,
    !hasSpecificContactName ? "decision_maker_name" : null,
  ].filter((item): item is string => Boolean(item));

  return {
    score,
    max_score: maxScore,
    percent: clampPercent(score, maxScore),
    label,
    channels: [hasEmail ? "email" : null, hasPhone ? "sms" : null].filter((item): item is "email" | "sms" => Boolean(item)),
    signals: {
      has_email: hasEmail,
      has_phone: hasPhone,
      has_website: hasWebsite,
      has_contact_name: hasContactName,
      has_named_contact: hasSpecificContactName,
      has_direct_email: hasSpecificEmail,
    },
    missing,
  };
}

export function evaluateQualification(input: LeadEnrichmentInput, coverage: ContactCoverage): Qualification {
  const directOutreachReady = coverage.signals.has_direct_email || (coverage.signals.has_phone && coverage.signals.has_named_contact);

  if (
    input.score >= 75 &&
    coverage.score >= 4 &&
    coverage.signals.has_website &&
    coverage.signals.has_email &&
    coverage.signals.has_named_contact
  ) {
    return {
      label: "crm_ready",
      reason: "High score plus strong contact coverage make this candidate ready for CRM promotion.",
      ready_for_outreach: true,
      ready_for_crm: true,
      recommendation_type: "sync_crm",
    };
  }

  if (input.score >= 60 && directOutreachReady && coverage.score >= 3) {
    return {
      label: "outreach_ready",
      reason: "Lead quality is strong enough for outbound follow-up while CRM promotion remains gated by additional validation.",
      ready_for_outreach: true,
      ready_for_crm: false,
      recommendation_type: "outreach",
    };
  }

  if (input.score >= 45) {
    return {
      label: "nurture",
      reason: directOutreachReady
        ? "Lead is worth keeping warm, but the score is not strong enough for immediate promotion."
        : "Lead score is acceptable, but the contact path is still too generic for reliable outreach.",
      ready_for_outreach: false,
      ready_for_crm: false,
      recommendation_type: "enrich_more",
    };
  }

  return {
    label: "research_required",
    reason: "Lead requires more evidence before outreach or CRM movement.",
    ready_for_outreach: false,
    ready_for_crm: false,
    recommendation_type: "enrich_more",
  };
}

export function buildLeadEnrichmentRecord(input: LeadEnrichmentInput): LeadEnrichmentRecord {
  const coverage = evaluateContactCoverage({
    primary_domain: input.primary_domain,
    primary_contact: input.primary_contact,
  });
  const qualification = evaluateQualification(input, coverage);
  const drafts: DraftPayload[] = [];
  const canDraftEmail = coverage.signals.has_email && (coverage.signals.has_direct_email || coverage.signals.has_named_contact);
  const canDraftSms = coverage.signals.has_phone && coverage.signals.has_named_contact;

  if ((qualification.ready_for_outreach || qualification.ready_for_crm) && canDraftEmail && input.intelligence.outreach_email.trim()) {
    drafts.push({
      channel: "email",
      body: input.intelligence.outreach_email.trim(),
    });
  }

  if ((qualification.ready_for_outreach || qualification.ready_for_crm) && canDraftSms && input.intelligence.outreach_sms.trim()) {
    drafts.push({
      channel: "sms",
      body: input.intelligence.outreach_sms.trim(),
    });
  }

  return {
    coverage,
    qualification,
    drafts,
  };
}
