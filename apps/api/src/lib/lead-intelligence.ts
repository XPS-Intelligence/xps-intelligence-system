import { env } from "./env.js";

type LeadIntelligenceInput = {
  company_name: string;
  vertical: string;
  territory: string | null;
  candidate_status: string;
  score: number;
  company_metadata: Record<string, unknown>;
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

type LeadIntelligenceOutput = {
  provider: "ollama" | "heuristic";
  model: string;
  summary: string;
  qualification: string;
  outreach_email: string;
  outreach_sms: string;
  next_action: string;
};

type OllamaResponse = {
  response?: string;
};

function buildPrompt(input: LeadIntelligenceInput): string {
  return [
    "You are an enterprise B2B lead intelligence assistant.",
    "Return valid JSON only with keys: summary, qualification, outreach_email, outreach_sms, next_action.",
    "Be concise, practical, and truthful. Do not invent contact details.",
    "",
    `Company: ${input.company_name}`,
    `Vertical: ${input.vertical}`,
    `Territory: ${input.territory ?? "unknown"}`,
    `Candidate status: ${input.candidate_status}`,
    `Score: ${input.score}`,
    `Primary contact name: ${input.primary_contact.name ?? "unknown"}`,
    `Primary contact email: ${input.primary_contact.email ?? "unknown"}`,
    `Primary contact phone: ${input.primary_contact.phone ?? "unknown"}`,
    `Top recommendation type: ${input.top_recommendation?.type ?? "none"}`,
    `Top recommendation explanation: ${input.top_recommendation?.explanation ?? "none"}`,
    `Company metadata: ${JSON.stringify(input.company_metadata).slice(0, 4000)}`,
  ].join("\n");
}

function extractJsonBlock(value: string): LeadIntelligenceOutput | null {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as Partial<LeadIntelligenceOutput>;
    if (
      typeof parsed.summary === "string" &&
      typeof parsed.qualification === "string" &&
      typeof parsed.outreach_email === "string" &&
      typeof parsed.outreach_sms === "string" &&
      typeof parsed.next_action === "string"
    ) {
      return {
        provider: "ollama",
        model: env.OLLAMA_MODEL,
        summary: parsed.summary.trim(),
        qualification: parsed.qualification.trim(),
        outreach_email: parsed.outreach_email.trim(),
        outreach_sms: parsed.outreach_sms.trim(),
        next_action: parsed.next_action.trim(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function buildHeuristicFallback(input: LeadIntelligenceInput): LeadIntelligenceOutput {
  const contactLabel = input.primary_contact.name || input.company_name;
  const recommendation = input.top_recommendation?.type ?? "enrich_more";
  const channelHint = input.primary_contact.email
    ? "email first"
    : input.primary_contact.phone
      ? "sms or call first"
      : "research contact details first";

  return {
    provider: "heuristic",
    model: "xps-heuristic-fallback",
    summary: `${input.company_name} is currently tagged as ${input.vertical} in ${input.territory ?? "an unassigned territory"} with a score of ${input.score}. The lead is in ${input.candidate_status} status and should remain in governed review until contact coverage and recommendation quality improve.`,
    qualification: `The lead appears promising enough to keep in the queue, but the current posture is ${recommendation}. Prioritize contact enrichment, site quality review, and territory fit before CRM activation.`,
    outreach_email: `Subject: Quick intro for ${input.company_name}\n\nHi ${contactLabel},\n\nI reviewed ${input.company_name} and thought there may be a fit to compare flooring and coating opportunities in ${input.territory ?? "your market"}. If helpful, I can send a short recommendation tailored to your current services and growth goals.\n\nBest,\nXPS Intelligence`,
    outreach_sms: `Hi ${contactLabel}, this is XPS Intelligence. I reviewed ${input.company_name} and have a quick recommendation for ${input.vertical} opportunities in ${input.territory ?? "your market"}. Open to a short follow-up?`,
    next_action: `Keep ${input.company_name} in the qualified review queue and use ${channelHint}.`,
  };
}

export async function generateLeadIntelligence(input: LeadIntelligenceInput): Promise<LeadIntelligenceOutput> {
  const prompt = buildPrompt(input);

  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS),
    });

    if (response.ok) {
      const payload = (await response.json()) as OllamaResponse;
      const parsed = payload.response ? extractJsonBlock(payload.response) : null;
      if (parsed) {
        return parsed;
      }
    }
  } catch {
    // fall through to heuristic
  }

  return buildHeuristicFallback(input);
}
