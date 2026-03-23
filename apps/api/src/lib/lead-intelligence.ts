import { env } from "./env.js";

export type LeadIntelligenceInput = {
  company_name: string;
  vertical: string;
  territory: string | null;
  candidate_status: string;
  score: number;
  primary_domain: string | null;
  primary_phone?: string | null;
  company_metadata: Record<string, unknown>;
  contact_coverage: {
    contact_count: number;
    contacts_with_email: number;
    contacts_with_phone: number;
    contacts_with_linkedin: number;
    primary_contact_ready: boolean;
    coverage_ratio: number;
    gaps: string[];
  };
  known_contacts?: Array<{
    name: string | null;
    title: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    is_primary: boolean;
  }>;
  recent_observations?: Array<{
    website: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    service_lines: string[];
    keywords: string[];
  }>;
  primary_contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  top_recommendation: {
    type: string;
    payload: Record<string, unknown>;
    explanation: string | null;
  } | null;
};

export type LeadIntelligenceOutput = {
  provider: "ollama" | "heuristic";
  model: string;
  provider_reason: string;
  summary: string;
  qualification: string;
  contact_coverage: string;
  contact_gap: string;
  outreach_email: string;
  outreach_sms: string;
  next_action: string;
  generated_at: string;
  coverage_score: number;
  qualification_label: "ready_now" | "needs_review" | "research_first";
  recommended_channel: "email" | "sms" | "call" | "research";
};

type OllamaResponse = {
  response?: string;
};

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

const PERSON_RECIPIENT_PATTERN = /^[A-Z][a-z]+(?:['-][A-Z]?[a-z]+)*(?:\s+[A-Z][a-z]+(?:['-][A-Z]?[a-z]+)*){1,3}$/;
const NON_PERSON_RECIPIENT_PATTERN =
  /\b(epoxy|floor|flooring|coating|concrete|contractor|contractors|company|services|solutions|miami|palm|beach|florida|county)\b/i;
const OLLAMA_NUM_PREDICT = 260;
const OLLAMA_CHAT_FALLBACK_TIMEOUT_MS = Math.min(env.OLLAMA_TIMEOUT_MS, 10_000);

function extractJsonCandidate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return candidate.slice(start, end + 1);
}

function buildPrompt(input: LeadIntelligenceInput): string {
  const compactContacts = (input.known_contacts ?? []).slice(0, 5).map((contact) => ({
    name: contact.name,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    linkedin_url: contact.linkedin_url,
    is_primary: contact.is_primary,
  }));
  const compactObservations = (input.recent_observations ?? []).slice(0, 3).map((observation) => ({
    website: observation.website,
    email: observation.email,
    phone: observation.phone,
    location: observation.location,
    service_lines: observation.service_lines.slice(0, 4),
    keywords: observation.keywords.slice(0, 6),
  }));

  return [
    "You are an enterprise B2B lead intelligence assistant.",
    "Return valid JSON only with keys: summary, qualification, contact_coverage, contact_gap, outreach_email, outreach_sms, next_action.",
    "Optional keys: qualification_label, recommended_channel.",
    "Be concise, practical, and truthful. Do not invent contact details.",
    "Use the available coverage to decide whether this lead is outreach-ready or still requires enrichment.",
    "Keep every field concise enough for a CRM operator panel.",
    "",
    `Company: ${input.company_name}`,
    `Vertical: ${input.vertical}`,
    `Territory: ${input.territory ?? "unknown"}`,
    `Candidate status: ${input.candidate_status}`,
    `Score: ${input.score}`,
    `Primary domain: ${input.primary_domain ?? "unknown"}`,
    `Primary company phone: ${input.primary_phone ?? "unknown"}`,
    `Primary contact name: ${input.primary_contact.name ?? "unknown"}`,
    `Primary contact email: ${input.primary_contact.email ?? "unknown"}`,
    `Primary contact phone: ${input.primary_contact.phone ?? "unknown"}`,
    `Contact count: ${input.contact_coverage.contact_count}`,
    `Contacts with email: ${input.contact_coverage.contacts_with_email}`,
    `Contacts with phone: ${input.contact_coverage.contacts_with_phone}`,
    `Contacts with LinkedIn: ${input.contact_coverage.contacts_with_linkedin}`,
    `Coverage ratio: ${input.contact_coverage.coverage_ratio}`,
    `Primary contact ready: ${input.contact_coverage.primary_contact_ready}`,
    `Coverage gaps: ${input.contact_coverage.gaps.join(", ") || "none"}`,
    `Known contacts: ${JSON.stringify(compactContacts).slice(0, 900)}`,
    `Recent observations: ${JSON.stringify(compactObservations).slice(0, 900)}`,
    `Top recommendation type: ${input.top_recommendation?.type ?? "none"}`,
    `Top recommendation explanation: ${input.top_recommendation?.explanation ?? "none"}`,
    `Company metadata: ${JSON.stringify(input.company_metadata).slice(0, 1200)}`,
  ].join("\n");
}

export function computeCoverageScore(input: LeadIntelligenceInput): number {
  let score = 0;

  if (input.contact_coverage.contact_count > 0) score += 25;
  if (input.contact_coverage.contacts_with_email > 0) score += 35;
  if (input.contact_coverage.contacts_with_phone > 0) score += 25;
  if (input.contact_coverage.contacts_with_linkedin > 0) score += 10;
  if (input.contact_coverage.primary_contact_ready) score += 5;

  return Math.min(100, score);
}

export function deriveQualificationLabel(
  input: LeadIntelligenceInput,
  coverageScore = computeCoverageScore(input),
): LeadIntelligenceOutput["qualification_label"] {
  if (input.score >= 78 && coverageScore >= 65) {
    return "ready_now";
  }
  if (input.score >= 55 || coverageScore >= 35) {
    return "needs_review";
  }
  return "research_first";
}

export function deriveRecommendedChannel(
  input: LeadIntelligenceInput,
): LeadIntelligenceOutput["recommended_channel"] {
  if (input.primary_contact.email) return "email";
  if (input.primary_contact.phone) return "sms";
  if (input.contact_coverage.contacts_with_phone > 0) return "call";
  return "research";
}

function normalizeQualificationLabel(
  value: string | undefined,
  fallback: LeadIntelligenceOutput["qualification_label"],
): LeadIntelligenceOutput["qualification_label"] {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "ready_now") return "ready_now";
  if (normalized === "needs_review") return "needs_review";
  if (normalized === "research_first") return "research_first";
  return fallback;
}

function normalizeRecommendedChannel(
  value: string | undefined,
  fallback: LeadIntelligenceOutput["recommended_channel"],
): LeadIntelligenceOutput["recommended_channel"] {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("email")) return "email";
  if (normalized === "sms" || normalized.includes("text")) return "sms";
  if (normalized === "call" || normalized.includes("phone")) return "call";
  if (normalized === "research") return "research";
  return fallback;
}

function finalizeOutput(
  input: LeadIntelligenceInput,
  output: Omit<
    LeadIntelligenceOutput,
    "provider" | "model" | "provider_reason" | "generated_at" | "coverage_score" | "qualification_label" | "recommended_channel"
  > &
    Partial<Pick<LeadIntelligenceOutput, "provider_reason" | "qualification_label" | "recommended_channel">>,
  provider: LeadIntelligenceOutput["provider"],
  model: string,
): LeadIntelligenceOutput {
  const coverageScore = computeCoverageScore(input);
  const fallbackQualificationLabel = deriveQualificationLabel(input, coverageScore);
  const fallbackRecommendedChannel = deriveRecommendedChannel(input);

  return {
    provider,
    model,
    provider_reason: output.provider_reason ?? (provider === "ollama" ? "ollama_generate_ok" : "heuristic_fallback"),
    summary: output.summary.trim(),
    qualification: output.qualification.trim(),
    contact_coverage: output.contact_coverage.trim(),
    contact_gap: output.contact_gap.trim(),
    outreach_email: output.outreach_email.trim(),
    outreach_sms: output.outreach_sms.trim(),
    next_action: output.next_action.trim(),
    generated_at: new Date().toISOString(),
    coverage_score: coverageScore,
    qualification_label: normalizeQualificationLabel(output.qualification_label, fallbackQualificationLabel),
    recommended_channel: normalizeRecommendedChannel(output.recommended_channel, fallbackRecommendedChannel),
  };
}

export function extractJsonBlock(value: string): LeadIntelligenceOutput | null {
  const candidate = extractJsonCandidate(value);
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate) as Partial<LeadIntelligenceOutput>;
    if (
      typeof parsed.summary === "string" &&
      typeof parsed.qualification === "string" &&
      typeof parsed.contact_coverage === "string" &&
      typeof parsed.contact_gap === "string" &&
      typeof parsed.outreach_email === "string" &&
      typeof parsed.outreach_sms === "string" &&
      typeof parsed.next_action === "string"
    ) {
      return {
        provider: "ollama",
        model: env.OLLAMA_MODEL,
        provider_reason: "ollama_generate_ok",
        summary: parsed.summary.trim(),
        qualification: parsed.qualification.trim(),
        contact_coverage: parsed.contact_coverage.trim(),
        contact_gap: parsed.contact_gap.trim(),
        outreach_email: parsed.outreach_email.trim(),
        outreach_sms: parsed.outreach_sms.trim(),
        next_action: parsed.next_action.trim(),
        generated_at: new Date().toISOString(),
        coverage_score: 0,
        qualification_label: parsed.qualification_label ?? "needs_review",
        recommended_channel: parsed.recommended_channel ?? "research",
      };
    }
  } catch {
    return null;
  }

  return null;
}

function isLikelyPersonName(value?: string | null): value is string {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized || !PERSON_RECIPIENT_PATTERN.test(normalized)) return false;
  return !NON_PERSON_RECIPIENT_PATTERN.test(normalized);
}

function selectOutreachRecipient(input: LeadIntelligenceInput): string {
  const candidates = [
    input.primary_contact.name,
    ...(input.known_contacts ?? []).map((contact) => contact.name),
  ];

  return candidates.find((candidate) => isLikelyPersonName(candidate)) ?? "there";
}

async function callOllamaChat(baseUrl: string, prompt: string): Promise<LeadIntelligenceOutput | null> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content:
            "You generate concise B2B lead intelligence as strict JSON. Never wrap the JSON in markdown and never invent unavailable facts.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      options: {
        temperature: 0.2,
        num_predict: OLLAMA_NUM_PREDICT,
      },
    }),
    signal: AbortSignal.timeout(OLLAMA_CHAT_FALLBACK_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as OllamaChatResponse;
  return payload.message?.content ? extractJsonBlock(payload.message.content) : null;
}

export function buildHeuristicFallback(input: LeadIntelligenceInput): LeadIntelligenceOutput {
  return buildHeuristicFallbackForReason(input, "heuristic_fallback");
}

export function buildHeuristicFallbackForReason(
  input: LeadIntelligenceInput,
  providerReason: string,
): LeadIntelligenceOutput {
  const knownContacts = input.known_contacts ?? [];
  const recentObservations = input.recent_observations ?? [];
  const contactLabel = selectOutreachRecipient(input);
  const recommendation = input.top_recommendation?.type ?? "enrich_more";
  const contactCoverageParts: string[] = [];

  if (input.contact_coverage.contact_count > 0) {
    contactCoverageParts.push(`${input.contact_coverage.contact_count} contact${input.contact_coverage.contact_count === 1 ? "" : "s"} on file`);
  } else {
    contactCoverageParts.push("no named contacts on file");
  }
  if (input.contact_coverage.contacts_with_email > 0) {
    contactCoverageParts.push(`${input.contact_coverage.contacts_with_email} email${input.contact_coverage.contacts_with_email === 1 ? "" : "s"}`);
  }
  if (input.contact_coverage.contacts_with_phone > 0) {
    contactCoverageParts.push(`${input.contact_coverage.contacts_with_phone} phone${input.contact_coverage.contacts_with_phone === 1 ? "" : "s"}`);
  }
  if (input.contact_coverage.contacts_with_linkedin > 0) {
    contactCoverageParts.push(`${input.contact_coverage.contacts_with_linkedin} LinkedIn profile${input.contact_coverage.contacts_with_linkedin === 1 ? "" : "s"}`);
  }

  const contactGap =
    input.contact_coverage.gaps.length > 0
      ? `Still missing ${input.contact_coverage.gaps.join(" and ")}.`
      : "Current contact coverage supports direct operator review.";
  const channelHint = input.primary_contact.email
    ? "email first"
    : input.primary_contact.phone
      ? "sms or call first"
      : input.primary_domain || input.primary_phone
        ? "website research first"
        : "research contact details first";
  const qualificationLabel = deriveQualificationLabel(input);
  const websiteHint = input.primary_domain
    ? `Use ${input.primary_domain} as the governed source of truth for validation and personalization.`
    : "No governed domain is on file yet, so web validation remains incomplete.";
  const observationHint = recentObservations.length > 0
    ? `Recent observations suggest ${
        recentObservations
          .flatMap((observation) => observation.service_lines)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ") || "service-line evidence is still thin"
      }.`
    : "No recent parsed observations are attached yet.";

  return finalizeOutput(
    input,
    {
      summary: `${input.company_name} is currently tagged as ${input.vertical} in ${input.territory ?? "an unassigned territory"} with a score of ${input.score}. ${websiteHint} ${observationHint}`,
      qualification: `The posture is ${recommendation}. Prioritize site quality review, service-line confirmation, and contact enrichment before CRM activation unless the operator can verify fit immediately. Qualification status: ${input.contact_coverage.primary_contact_ready ? "outreach-ready" : "needs-more-coverage"}.`,
      contact_coverage: `${contactCoverageParts.join(", ")}. Coverage ratio ${input.contact_coverage.coverage_ratio}/100.`,
      contact_gap: contactGap,
      outreach_email: `Subject: Quick intro for ${input.company_name}\n\nHi ${contactLabel},\n\nI reviewed ${input.company_name} and thought there may be a fit to compare flooring and coating opportunities in ${input.territory ?? "your market"}. If helpful, I can send a short recommendation tailored to your current services and growth goals.\n\nBest,\nXPS Intelligence`,
      outreach_sms: `Hi ${contactLabel}, this is XPS Intelligence. I reviewed ${input.company_name} and have a quick recommendation for ${input.vertical} opportunities in ${input.territory ?? "your market"}. Open to a short follow-up?`,
      next_action: `Keep ${input.company_name} in the qualified review queue and use ${channelHint}. ${contactGap}`,
      provider_reason: providerReason,
      qualification_label: qualificationLabel,
      recommended_channel: deriveRecommendedChannel(input),
    },
    "heuristic",
    providerReason === "heuristic_fallback" ? "xps-heuristic-fallback" : `xps-heuristic-fallback:${providerReason}`,
  );
}

export async function generateLeadIntelligence(input: LeadIntelligenceInput): Promise<LeadIntelligenceOutput> {
  const prompt = buildPrompt(input);
  const ollamaBaseUrl = env.OLLAMA_BASE_URL.replace(/\/$/, "");

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt,
        format: "json",
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: OLLAMA_NUM_PREDICT,
        },
      }),
      signal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS),
    });

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      const missingModel = response.status === 404 && /model/i.test(responseText);
      return buildHeuristicFallbackForReason(input, missingModel ? "ollama_model_missing" : `ollama_http_${response.status}`);
    }

    const payload = (await response.json()) as OllamaResponse;
    if (!payload.response?.trim()) {
      return buildHeuristicFallbackForReason(input, "ollama_empty_response");
    }

    const parsed = extractJsonBlock(payload.response);
    if (parsed) {
      return finalizeOutput(input, parsed, "ollama", env.OLLAMA_MODEL);
    }

    const chatResult = await callOllamaChat(ollamaBaseUrl, prompt);
    if (chatResult) {
      return finalizeOutput(input, chatResult, "ollama", env.OLLAMA_MODEL);
    }

    return buildHeuristicFallbackForReason(input, "ollama_invalid_json_block");
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const reason =
      message.includes("timeout")
        ? "ollama_timeout"
        : message.includes("fetch failed") || message.includes("econnrefused") || message.includes("network")
          ? "ollama_unreachable"
          : "ollama_error";
    return buildHeuristicFallbackForReason(input, reason);
  }
}
