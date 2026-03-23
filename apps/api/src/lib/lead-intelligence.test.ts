import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHeuristicFallback,
  buildHeuristicFallbackForReason,
  computeCoverageScore,
  deriveQualificationLabel,
  deriveRecommendedChannel,
  extractJsonBlock,
  type LeadIntelligenceInput,
} from "./lead-intelligence.js";

function buildInput(overrides: Partial<LeadIntelligenceInput> = {}): LeadIntelligenceInput {
  return {
    company_name: "Acme Coatings",
    vertical: "industrial coatings",
    territory: "Miami, FL",
    candidate_status: "enriched",
    score: 82,
    primary_domain: "acme.example",
    primary_phone: "555-123-4567",
    company_metadata: {},
    contact_coverage: {
      contact_count: 1,
      contacts_with_email: 1,
      contacts_with_phone: 1,
      contacts_with_linkedin: 1,
      primary_contact_ready: true,
      coverage_ratio: 85,
      gaps: [],
    },
    known_contacts: [],
    recent_observations: [],
    primary_contact: {
      name: "Ava Mason",
      email: "ava@acme.example",
      phone: "555-123-4567",
    },
    top_recommendation: {
      type: "outreach",
      payload: {},
      explanation: "Good territory fit",
    },
    ...overrides,
  };
}

test("coverage score rewards complete reachable contact coverage", () => {
  assert.equal(computeCoverageScore(buildInput()), 100);
});

test("qualification becomes research_first when score and coverage are weak", () => {
  const input = buildInput({
    score: 38,
    primary_domain: null,
    primary_phone: null,
    primary_contact: {
      name: null,
      email: null,
      phone: null,
    },
    contact_coverage: {
      contact_count: 0,
      contacts_with_email: 0,
      contacts_with_phone: 0,
      contacts_with_linkedin: 0,
      primary_contact_ready: false,
      coverage_ratio: 0,
      gaps: ["named contact", "email coverage", "phone coverage"],
    },
  });

  assert.equal(deriveQualificationLabel(input), "research_first");
  assert.equal(deriveRecommendedChannel(input), "research");
});

test("recommended channel prefers email before phone-only lanes", () => {
  const emailFirst = buildInput();
  const phoneOnly = buildInput({
    primary_contact: {
      name: "Ava Mason",
      email: null,
      phone: "555-123-4567",
    },
    contact_coverage: {
      contact_count: 1,
      contacts_with_email: 0,
      contacts_with_phone: 1,
      contacts_with_linkedin: 1,
      primary_contact_ready: true,
      coverage_ratio: 60,
      gaps: ["email coverage"],
    },
  });

  assert.equal(deriveRecommendedChannel(emailFirst), "email");
  assert.equal(deriveRecommendedChannel(phoneOnly), "sms");
});

test("heuristic fallback preserves the upstream provider reason", () => {
  const output = buildHeuristicFallbackForReason(buildInput(), "ollama_unreachable");

  assert.equal(output.provider, "heuristic");
  assert.equal(output.provider_reason, "ollama_unreachable");
  assert.match(output.model, /xps-heuristic-fallback:ollama_unreachable/);
});

test("extractJsonBlock accepts fenced JSON responses from ollama", () => {
  const parsed = extractJsonBlock(`\`\`\`json
{
  "summary": "Strong local fit.",
  "qualification": "Outreach-ready.",
  "contact_coverage": "One email and one phone on file.",
  "contact_gap": "Still missing LinkedIn coverage.",
  "outreach_email": "Subject: Intro\\n\\nHi Jane,",
  "outreach_sms": "Hi Jane, quick intro.",
  "next_action": "Send the email first."
}
\`\`\``);

  assert.ok(parsed);
  assert.equal(parsed?.provider, "ollama");
  assert.equal(parsed?.summary, "Strong local fit.");
  assert.equal(parsed?.recommended_channel, "research");
});

test("heuristic fallback uses a neutral greeting when only company-style names are available", () => {
  const output = buildHeuristicFallback(
    buildInput({
      primary_contact: {
        name: "Miami Epoxy Company",
        email: null,
        phone: "555-123-4567",
      },
      known_contacts: [
        {
          name: "Epoxy Flooring Miami",
          title: null,
          email: null,
          phone: "555-123-4567",
          linkedin_url: null,
          is_primary: true,
        },
      ],
    }),
  );

  assert.match(output.outreach_email, /Hi there,/);
});
