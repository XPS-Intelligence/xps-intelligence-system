import test from "node:test";
import assert from "node:assert/strict";
import { extractLeadSignalsFromHtml, mergeExtractedSignals } from "./contact-extraction.js";

test("extractLeadSignalsFromHtml harvests json-ld, mailto/tel, and contact pages", () => {
  const html = `
    <html>
      <head>
        <title>Precision Floor Coatings | Industrial Epoxy Flooring</title>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Precision Floor Coatings",
            "telephone": "(561) 555-1212",
            "email": "sales@precisionfloor.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "123 Resin Way",
              "addressLocality": "West Palm Beach",
              "addressRegion": "FL",
              "postalCode": "33401"
            }
          }
        </script>
        <meta name="description" content="Commercial epoxy and concrete floor coating specialists across South Florida.">
      </head>
      <body>
        <a href="/contact">Contact Us</a>
        <a href="mailto:sales@precisionfloor.com">Email sales</a>
      </body>
    </html>
  `;

  const result = extractLeadSignalsFromHtml("https://precisionfloor.com", html);

  assert.equal(result.companyName, "Precision Floor Coatings");
  assert.equal(result.email, "sales@precisionfloor.com");
  assert.equal(result.phone, "+15615551212");
  assert.equal(result.location, "123 Resin Way, West Palm Beach, FL, 33401");
  assert.equal(result.vertical, "epoxy flooring");
  assert.equal(result.contactPageUrls[0], "https://precisionfloor.com/contact");
});

test("mergeExtractedSignals fills missing channels from supplemental page", () => {
  const primary = extractLeadSignalsFromHtml(
    "https://example.com",
    `
      <html>
        <head><title>Example Co</title></head>
        <body>
          <a href="/contact">Contact</a>
          <p>Welcome to Example Co.</p>
        </body>
      </html>
    `,
  );

  const supplemental = extractLeadSignalsFromHtml(
    "https://example.com/contact",
    `
      <html>
        <head><title>Contact Example Co</title></head>
        <body>
          <a href="mailto:john.doe@samplefloor.com">John Doe</a>
          <a href="tel:(305) 555-0101">Call us</a>
        </body>
      </html>
    `,
  );

  const merged = mergeExtractedSignals(primary, supplemental);

  assert.equal(merged.companyName, "Example Co");
  assert.equal(merged.contactName, "John Doe");
  assert.equal(merged.email, "john.doe@samplefloor.com");
  assert.equal(merged.phone, "+13055550101");
  assert.ok(merged.summary.includes("Example Co"));
});

test("extractLeadSignalsFromHtml cleans contact labels out of mailto anchor names", () => {
  const result = extractLeadSignalsFromHtml(
    "https://example.com/contact",
    `
      <html>
        <head><title>Contact Example Co</title></head>
        <body>
          <a href="mailto:info@samplefloor.com">Email John Doe: info@samplefloor.com</a>
          <a href="tel:(305) 555-0101">Call us</a>
        </body>
      </html>
    `,
  );

  assert.equal(result.contactName, "John Doe");
  assert.equal(result.email, "info@samplefloor.com");
});

test("extractLeadSignalsFromHtml ignores placeholder emails and company slogans as contacts", () => {
  const result = extractLeadSignalsFromHtml(
    "https://example.com/contact",
    `
      <html>
        <head><title>Miami's #1 Epoxy Flooring</title></head>
        <body>
          <a href="mailto:email@example.com">Miami's #1 Epoxy Flooring</a>
          <a href="tel:(305) 555-0101">Call us</a>
        </body>
      </html>
    `,
  );

  assert.equal(result.contactName, undefined);
  assert.equal(result.email, undefined);
  assert.equal(result.phone, "+13055550101");
});
