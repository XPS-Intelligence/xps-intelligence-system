import test from "node:test";
import assert from "node:assert/strict";

import { buildLeadEnrichmentRecord, evaluateContactCoverage, evaluateQualification, type LeadEnrichmentInput } from "./lead-enrichment.js";

function buildInput(overrides: Partial<LeadEnrichmentInput> = {}): LeadEnrichmentInput {
  return {
    score: 82,
    vertical: "industrial coatings",
    territory: "Miami, FL",
    primary_domain: "acme.example",
    primary_contact: {
      name: "Ava Mason",
      email: "ava@acme.example",
      phone: "+13055550123",
    },
    intelligence: {
      provider: "ollama",
      model: "qwen2.5:latest",
      provider_reason: "ollama_generate_ok",
      summary: "summary",
      qualification: "qualification",
      contact_coverage: "coverage",
      contact_gap: "gap",
      outreach_email: "Subject: Hello\n\nBody",
      outreach_sms: "Hello from XPS",
      next_action: "Call next",
      generated_at: new Date().toISOString(),
      coverage_score: 100,
      qualification_label: "ready_now",
      recommended_channel: "email",
    },
    ...overrides,
  };
}

test("evaluateContactCoverage downgrades generic shared inboxes without a named contact", () => {
  const coverage = evaluateContactCoverage({
    primary_domain: "acme.example",
    primary_contact: {
      name: "Sales Team",
      email: "info@acme.example",
      phone: "+13055550123",
    },
  });

  assert.equal(coverage.label, "partial");
  assert.equal(coverage.score, 3);
  assert.equal(coverage.signals.has_direct_email, false);
  assert.equal(coverage.signals.has_named_contact, false);
  assert.ok(coverage.missing.includes("direct_email"));
  assert.ok(coverage.missing.includes("decision_maker_name"));
});

test("evaluateQualification requires a direct path before outreach is ready", () => {
  const input = buildInput({
    primary_contact: {
      name: "Sales Team",
      email: "info@acme.example",
      phone: "+13055550123",
    },
  });

  const coverage = evaluateContactCoverage({
    primary_domain: input.primary_domain,
    primary_contact: input.primary_contact,
  });
  const qualification = evaluateQualification(input, coverage);

  assert.equal(qualification.label, "nurture");
  assert.equal(qualification.ready_for_outreach, false);
});

test("buildLeadEnrichmentRecord only drafts when a direct outreach path exists", () => {
  const generic = buildLeadEnrichmentRecord(
    buildInput({
      primary_contact: {
        name: "Sales Team",
        email: "info@acme.example",
        phone: "+13055550123",
      },
    }),
  );
  const direct = buildLeadEnrichmentRecord(buildInput());

  assert.equal(generic.drafts.length, 0);
  assert.deepEqual(
    direct.drafts.map((draft) => draft.channel),
    ["email", "sms"],
  );
});
