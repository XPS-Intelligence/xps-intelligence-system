import { env } from "./env.js";

export type PromotableCandidate = {
  id: string;
  company_name: string;
  vertical: string | null;
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

export type HubSpotSyncResult = {
  crmSystem: "hubspot";
  companyId: string;
  contactId: string | null;
  lifecycleStage: string;
  pipelineStage: string;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
};

function requireHubSpotToken(): string {
  if (!env.HUBSPOT_ACCESS_TOKEN) {
    throw new Error("HUBSPOT_ACCESS_TOKEN is not configured");
  }
  return env.HUBSPOT_ACCESS_TOKEN;
}

async function hubspotRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://api.hubapi.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${requireHubSpotToken()}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`HubSpot request failed (${response.status}): ${(payload as { message?: string }).message || response.statusText}`);
  }

  return payload as T;
}

function buildCompanyProperties(candidate: PromotableCandidate, lifecycleStage: string, pipelineStage: string) {
  const website = typeof candidate.company_metadata.website === "string" ? candidate.company_metadata.website : null;
  const city = typeof candidate.company_metadata.city === "string" ? candidate.company_metadata.city : null;
  const state = typeof candidate.company_metadata.state_code === "string" ? candidate.company_metadata.state_code : null;

  return {
    name: candidate.company_name,
    domain: website ? website.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : undefined,
    phone: candidate.primary_contact.phone || undefined,
    city: city || undefined,
    state: state || undefined,
    industry: candidate.vertical || undefined,
    description: candidate.top_recommendation?.explanation || `Promoted from XPS lead candidate ${candidate.id}`,
    lifecyclestage: lifecycleStage,
    hs_lead_status: pipelineStage,
  };
}

function buildContactProperties(candidate: PromotableCandidate) {
  if (!candidate.primary_contact.email && !candidate.primary_contact.phone) {
    return null;
  }

  const [firstname, ...rest] = (candidate.primary_contact.name || "").split(" ").filter(Boolean);
  return {
    email: candidate.primary_contact.email || undefined,
    phone: candidate.primary_contact.phone || undefined,
    firstname: firstname || undefined,
    lastname: rest.join(" ") || undefined,
    company: candidate.company_name,
    jobtitle: candidate.territory || undefined,
  };
}

export async function syncCandidateToHubSpot(
  candidate: PromotableCandidate,
  options: {
    existingCompanyId?: string | null;
    lifecycleStage: string;
    pipelineStage: string;
  }
): Promise<HubSpotSyncResult> {
  const companyProperties = buildCompanyProperties(candidate, options.lifecycleStage, options.pipelineStage);
  const requestPayload: Record<string, unknown> = {
    company: { properties: companyProperties },
  };

  const companyResponse = options.existingCompanyId
    ? await hubspotRequest<{ id: string; properties?: Record<string, unknown> }>(`/crm/v3/objects/companies/${options.existingCompanyId}`, {
        method: "PATCH",
        body: JSON.stringify({ properties: companyProperties }),
      })
    : await hubspotRequest<{ id: string; properties?: Record<string, unknown> }>("/crm/v3/objects/companies", {
        method: "POST",
        body: JSON.stringify({ properties: companyProperties }),
      });

  let contactId: string | null = null;
  const contactProperties = buildContactProperties(candidate);
  if (contactProperties && !options.existingCompanyId) {
    requestPayload.contact = { properties: contactProperties };
    const contactResponse = await hubspotRequest<{ id: string; properties?: Record<string, unknown> }>("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties: contactProperties }),
    });
    contactId = contactResponse.id;
  }

  return {
    crmSystem: "hubspot",
    companyId: companyResponse.id,
    contactId,
    lifecycleStage: options.lifecycleStage,
    pipelineStage: options.pipelineStage,
    requestPayload,
    responsePayload: {
      company: companyResponse,
      contactId,
    },
  };
}
