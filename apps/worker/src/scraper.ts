import { env } from "./lib/env.js";

export interface ScrapeTask {
  taskId: string;
  userId?: string;
  url?: string;
  company_name?: string;
  query?: string;
  mode?: "firecrawl" | "steel" | "auto";
}

export interface ScrapedLead {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  vertical?: string;
  location?: string;
  score?: number;
  raw_data?: Record<string, unknown>;
}

export interface ScrapeResult {
  company?: string;
  url?: string;
  content?: string;
  leads?: ScrapedLead[];
  metadata?: Record<string, unknown>;
}

type FetchAttempt = {
  url: string;
  html: string;
  finalUrl: string;
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractMatch(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  if (!match?.[1]) return undefined;
  return decodeHtml(match[1]).replace(/\s+/g, " ").trim();
}

function deriveCompanyName(url: string, html: string): string {
  const title = extractMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
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

function buildUrlCandidates(inputUrl: string): string[] {
  const normalized = new URL(inputUrl);
  const hostname = normalized.hostname.replace(/^www\./, "");
  const hosts = [hostname, `www.${hostname}`];
  const protocols = normalized.protocol === "https:" ? ["https:", "http:"] : [normalized.protocol];
  const candidates: string[] = [];

  for (const protocol of protocols) {
    for (const host of hosts) {
      const candidate = new URL(normalized.toString());
      candidate.protocol = protocol;
      candidate.hostname = host;
      candidate.pathname = candidate.pathname || "/";
      candidates.push(candidate.toString());
    }
  }

  return [...new Set([inputUrl, ...candidates])];
}

async function fetchHtmlWithFallback(inputUrl: string): Promise<FetchAttempt> {
  const failures: string[] = [];

  for (const candidateUrl of buildUrlCandidates(inputUrl)) {
    try {
      const response = await fetch(candidateUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; XPS-Intelligence/1.0; +https://xps.local)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return {
        url: candidateUrl,
        html: await response.text(),
        finalUrl: response.url || candidateUrl,
      };
    } catch (error) {
      failures.push(`${candidateUrl} -> ${(error as Error).message}`);
    }
  }

  throw new Error(`All direct crawl attempts failed: ${failures.join(" | ")}`);
}

async function scrapeWithFirecrawl(url: string): Promise<ScrapeResult> {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY not configured");
  }

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "extract"],
      extract: {
        prompt: "Extract company name, contact names, emails, phone numbers, location, business type/vertical, and any relevant business intelligence.",
        schema: {
          type: "object",
          properties: {
            company_name: { type: "string" },
            contact_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            location: { type: "string" },
            vertical: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl error: ${response.statusText}`);
  }

  const result = await response.json() as {
    success: boolean;
    error?: string;
    markdown?: string;
    extract?: Record<string, unknown>;
  };

  if (!result.success) {
    throw new Error(`Firecrawl scrape failed: ${result.error || "unknown error"}`);
  }

  const extracted = result.extract || {};
  const lead: ScrapedLead = {
    company_name: (extracted.company_name as string) || new URL(url).hostname,
    contact_name: extracted.contact_name as string | undefined,
    email: extracted.email as string | undefined,
    phone: extracted.phone as string | undefined,
    website: url,
    location: extracted.location as string | undefined,
    vertical: extracted.vertical as string | undefined,
    score: 70,
    raw_data: extracted,
  };

  return {
    company: lead.company_name,
    url,
    content: result.markdown || "",
    leads: [lead],
    metadata: { source: "firecrawl", scraped_at: new Date().toISOString() },
  };
}

async function scrapeWithSteel(url: string): Promise<ScrapeResult> {
  if (!env.STEEL_API_KEY) {
    const fetched = await fetchHtmlWithFallback(url);
    const companyName = deriveCompanyName(fetched.finalUrl, fetched.html);
    const title = extractMatch(fetched.html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const summary = fetched.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5_000);

    return {
      company: companyName,
      url: fetched.finalUrl,
      content: summary,
      leads: [{
        company_name: companyName,
        website: fetched.finalUrl,
        score: 58,
        raw_data: {
          source: "direct_fetch",
          source_url: fetched.url,
          final_url: fetched.finalUrl,
          title,
          summary,
        },
      }],
      metadata: {
        source: "direct_fetch",
        scraped_at: new Date().toISOString(),
        company_name: companyName,
        source_url: fetched.url,
        final_url: fetched.finalUrl,
      },
    };
  }

  const sessionResponse = await fetch("https://api.steel.dev/v1/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Steel-Api-Key": env.STEEL_API_KEY },
    body: JSON.stringify({ use_proxy: true, solve_captcha: true }),
  });

  const session = await sessionResponse.json() as { id: string };

  try {
    const scrapeResponse = await fetch("https://api.steel.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Steel-Api-Key": env.STEEL_API_KEY },
      body: JSON.stringify({ url, session_id: session.id, format: "markdown" }),
    });
    const data = await scrapeResponse.json() as { content?: string; metadata?: Record<string, unknown> };
    const companyName = new URL(url).hostname.replace("www.", "");

    return {
      company: companyName,
      url,
      content: data.content || "",
      leads: [{ company_name: companyName, website: url, score: 65 }],
      metadata: { source: "steel", ...(data.metadata || {}), scraped_at: new Date().toISOString() },
    };
  } finally {
    await fetch(`https://api.steel.dev/v1/sessions/${session.id}/release`, {
      method: "POST",
      headers: { "Steel-Api-Key": env.STEEL_API_KEY },
    });
  }
}

export async function runScrapeTask(task: ScrapeTask): Promise<ScrapeResult> {
  const sanitizedName = task.company_name
    ? task.company_name.toLowerCase().replace(/[^a-z0-9]/g, "")
    : null;
  const url = task.url || (sanitizedName ? `https://www.${sanitizedName}.com` : null);

  if (!url) {
    if (task.query) {
      return { metadata: { source: "query_placeholder", query: task.query, scraped_at: new Date().toISOString() } };
    }
    throw new Error("Either url, company_name, or query is required");
  }

  if (task.mode === "steel") {
    return scrapeWithSteel(url);
  }

  if (task.mode === "firecrawl" || env.FIRECRAWL_API_KEY) {
    try {
      return await scrapeWithFirecrawl(url);
    } catch (error) {
      console.warn("[Scraper] Firecrawl failed, falling back to Steel:", (error as Error).message);
      return scrapeWithSteel(url);
    }
  }

  return scrapeWithSteel(url);
}
