export type ExtractedLeadSignals = {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  location?: string;
  vertical?: string;
  summary: string;
  title?: string;
  contactPageUrls: string[];
  raw: Record<string, unknown>;
};

type JsonLdRecord = Record<string, unknown>;

const IGNORE_EMAIL_PATTERNS = [
  /^example@/i,
  /^email@example\.(?:com|org|net|edu)$/i,
  /\.png$/i,
  /\.jpe?g$/i,
  /\.webp$/i,
  /\.svg$/i,
  /\.gif$/i,
];

const BUSINESS_NAME_TOKENS = new Set([
  "beach",
  "co",
  "coating",
  "coatings",
  "company",
  "concrete",
  "contractor",
  "contractors",
  "county",
  "custom",
  "deck",
  "epoxy",
  "fl",
  "floor",
  "flooring",
  "florida",
  "garage",
  "industrial",
  "miami",
  "palm",
  "polished",
  "pool",
  "services",
  "solutions",
  "specialty",
  "west",
]);

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanText(value: string): string {
  return decodeHtml(value).replace(/\s+/g, " ").trim();
}

function extractMatch(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  if (!match?.[1]) return undefined;
  return cleanText(match[1]);
}

function stripTags(value: string): string {
  return cleanText(value.replace(/<[^>]+>/g, " "));
}

function extractTitle(html: string): string | undefined {
  return extractMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
}

function deriveCompanyName(url: string, html: string): string {
  const title = extractTitle(html);
  if (title) {
    const primary = title.split(/[|\-–—]/)[0]?.trim();
    if (primary) return primary;
  }

  const ogSiteName = extractMatch(html, /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (ogSiteName) return ogSiteName;

  const appName = extractMatch(html, /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i);
  if (appName) return appName;

  return new URL(url).hostname.replace(/^www\./, "");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeEmail(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return undefined;
  if (IGNORE_EMAIL_PATTERNS.some((pattern) => pattern.test(normalized))) return undefined;
  return normalized;
}

function normalizePhone(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D+/g, "");
  if (digits.length < 10) return undefined;
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return `+${digits}`;
}

function normalizeLocation(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = cleanText(value);
  return normalized || undefined;
}

function normalizeCompanyName(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = cleanText(value);
  return normalized || undefined;
}

function normalizeContactName(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = cleanText(value)
    .replace(/^(?:email|call|phone|contact|reach(?:\s+out)?(?:\s+to)?)\s+/i, "")
    .replace(/\s*[:|-]\s*[^\s@]+@[^\s@]+\.[^\s@]+$/i, "")
    .trim();
  if (!normalized) return undefined;
  if (normalized.includes("@")) return undefined;
  if (/[|/&#+]|\.{3,}/.test(normalized)) return undefined;
  const tokens = normalized.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 5) return undefined;
  if (/\d/.test(normalized)) return undefined;
  if (!tokens.every((token) => /^[A-Z][a-z]+(?:['-][A-Z]?[a-z]+)*$/.test(token))) return undefined;
  const businessTokenCount = tokens.filter((token) =>
    BUSINESS_NAME_TOKENS.has(token.toLowerCase().replace(/[^a-z]/g, "")),
  ).length;
  if (businessTokenCount >= Math.ceil(tokens.length / 2)) return undefined;
  return normalized;
}

function deriveNameFromEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const localPart = email.split("@")[0] ?? "";
  if (!localPart || /^(info|hello|sales|contact|support|admin|office|team|service|email)$/i.test(localPart)) {
    return undefined;
  }

  const tokens = localPart
    .split(/[._-]+/)
    .map((token) => token.trim())
    .filter((token) => /^[a-z]{2,}$/i.test(token));

  if (tokens.length < 2 || tokens.length > 3) return undefined;
  return tokens.map((token) => token[0].toUpperCase() + token.slice(1)).join(" ");
}

function parseJsonLdRecords(html: string): JsonLdRecord[] {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const results: JsonLdRecord[] = [];

  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const queue = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of queue) {
        if (item && typeof item === "object") {
          results.push(item as JsonLdRecord);
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}

function getJsonLdValue(record: JsonLdRecord, key: string): string | undefined {
  const value = record[key];
  if (typeof value === "string") return cleanText(value);
  return undefined;
}

function getJsonLdAddress(record: JsonLdRecord): string | undefined {
  const address = record.address;
  if (!address || typeof address !== "object") return undefined;

  const typedAddress = address as JsonLdRecord;
  const parts = [
    getJsonLdValue(typedAddress, "streetAddress"),
    getJsonLdValue(typedAddress, "addressLocality"),
    getJsonLdValue(typedAddress, "addressRegion"),
    getJsonLdValue(typedAddress, "postalCode"),
  ].filter((value): value is string => Boolean(value));

  return parts.length ? parts.join(", ") : undefined;
}

function extractEmails(html: string): string[] {
  const mailtoMatches = [...html.matchAll(/mailto:([^"'?#\s>]+)/gi)].map((match) => match[1] ?? "");
  const textMatches = [...html.matchAll(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi)].map((match) => match[1] ?? "");

  return unique(
    [...mailtoMatches, ...textMatches]
      .map((value) => decodeHtml(value))
      .map((value) => value.replace(/^mailto:/i, ""))
      .map((value) => value.split("?")[0] ?? value)
      .map((value) => normalizeEmail(value))
      .filter((value): value is string => Boolean(value)),
  );
}

function extractPhones(html: string): string[] {
  const telMatches = [...html.matchAll(/tel:([^"'?#\s>]+)/gi)].map((match) => match[1] ?? "");
  const textMatches = [...html.matchAll(/(?:\+?1[\s.\-]?)?(?:\(?\d{3}\)?[\s.\-]?)\d{3}[\s.\-]?\d{4}/g)].map((match) => match[0] ?? "");

  return unique(
    [...telMatches, ...textMatches]
      .map((value) => decodeHtml(value))
      .map((value) => value.replace(/^tel:/i, ""))
      .map((value) => normalizePhone(value))
      .filter((value): value is string => Boolean(value)),
  );
}

function extractVertical(html: string): string | undefined {
  const metaDescription = extractMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (!metaDescription) return undefined;

  const normalized = metaDescription.toLowerCase();
  if (normalized.includes("epoxy")) return "epoxy flooring";
  if (normalized.includes("floor coating")) return "floor coatings";
  if (normalized.includes("concrete")) return "concrete services";
  if (normalized.includes("roof")) return "roofing";
  if (normalized.includes("hvac") || normalized.includes("air conditioning")) return "hvac";
  if (normalized.includes("plumb")) return "plumbing";
  if (normalized.includes("electric")) return "electrical";
  return metaDescription.slice(0, 120);
}

function extractContactName(html: string): string | undefined {
  const namedPerson = [...html.matchAll(/\b(?:contact|ask for|reach out to|owner|founder|president|manager)[:\s-]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/g)]
    .map((match) => normalizeContactName(match[1]))
    .find((value): value is string => Boolean(value));
  if (namedPerson) return namedPerson;

  const hCardName = extractMatch(html, /class=["'][^"']*(?:contact-name|team-name|vcard)[^"']*["'][^>]*>([\s\S]*?)</i);
  if (hCardName) {
    return normalizeContactName(hCardName);
  }

  const mailtoAnchor = [...html.matchAll(/<a[^>]+href=["']mailto:[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => normalizeContactName(stripTags(match[1] ?? "")))
    .find((value): value is string => Boolean(value));
  if (mailtoAnchor) return mailtoAnchor;

  const firstEmail = extractEmails(html)[0];
  return deriveNameFromEmail(firstEmail);
}

function pickBestEmail(emails: string[], hostname: string): string | undefined {
  const preferred = emails.find((email) => email.endsWith(`@${hostname}`));
  if (preferred) return preferred;

  const generic = emails.find((email) => /^(info|sales|contact|office|hello|support)@/i.test(email));
  if (generic) return generic;

  return emails[0];
}

function pickBestPhone(phones: string[]): string | undefined {
  return phones[0];
}

function extractContactPageUrls(baseUrl: string, html: string): string[] {
  const base = new URL(baseUrl);
  const anchors = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const candidates: string[] = [];

  for (const anchor of anchors) {
    const href = decodeHtml(anchor[1] ?? "").trim();
    const label = stripTags(anchor[2] ?? "").toLowerCase();
    if (!href) continue;
    if (!/(contact|about|team|staff|get in touch|reach us|locations?)/i.test(`${href} ${label}`)) continue;

    try {
      const resolved = new URL(href, base);
      if (!["http:", "https:"].includes(resolved.protocol)) continue;
      if (resolved.hostname !== base.hostname) continue;
      candidates.push(resolved.toString());
    } catch {
      continue;
    }
  }

  return unique(candidates).slice(0, 3);
}

export function extractLeadSignalsFromHtml(url: string, html: string): ExtractedLeadSignals {
  const title = extractTitle(html);
  const companyName = deriveCompanyName(url, html);
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const jsonLd = parseJsonLdRecords(html);

  const jsonLdNames = jsonLd
    .map((record) => normalizeCompanyName(getJsonLdValue(record, "name")))
    .filter((value): value is string => Boolean(value));
  const jsonLdEmails = jsonLd
    .map((record) => normalizeEmail(getJsonLdValue(record, "email")))
    .filter((value): value is string => Boolean(value));
  const jsonLdPhones = jsonLd
    .map((record) => normalizePhone(getJsonLdValue(record, "telephone")))
    .filter((value): value is string => Boolean(value));
  const jsonLdLocations = jsonLd
    .map((record) => normalizeLocation(getJsonLdAddress(record)))
    .filter((value): value is string => Boolean(value));

  const emails = unique([...jsonLdEmails, ...extractEmails(html)]);
  const phones = unique([...jsonLdPhones, ...extractPhones(html)]);
  const location = jsonLdLocations[0] ?? normalizeLocation(extractMatch(html, /<address[^>]*>([\s\S]*?)<\/address>/i));
  const contactName = extractContactName(html);
  const contactPageUrls = extractContactPageUrls(url, html);
  const summary = stripTags(html).slice(0, 5_000);

  return {
    companyName: jsonLdNames[0] ?? companyName,
    contactName,
    email: pickBestEmail(emails, hostname),
    phone: pickBestPhone(phones),
    location,
    vertical: extractVertical(html),
    summary,
    title,
    contactPageUrls,
    raw: {
      title,
      emails,
      phones,
      location,
      contactPageUrls,
      jsonLdRecordCount: jsonLd.length,
    },
  };
}

export function mergeExtractedSignals(primary: ExtractedLeadSignals, supplement: ExtractedLeadSignals): ExtractedLeadSignals {
  return {
    companyName: primary.companyName || supplement.companyName,
    contactName: primary.contactName ?? supplement.contactName,
    email: primary.email ?? supplement.email,
    phone: primary.phone ?? supplement.phone,
    location: primary.location ?? supplement.location,
    vertical: primary.vertical ?? supplement.vertical,
    summary: primary.summary.length >= supplement.summary.length ? primary.summary : supplement.summary,
    title: primary.title ?? supplement.title,
    contactPageUrls: unique([...primary.contactPageUrls, ...supplement.contactPageUrls]).slice(0, 3),
    raw: {
      ...supplement.raw,
      ...primary.raw,
      merged: true,
    },
  };
}
