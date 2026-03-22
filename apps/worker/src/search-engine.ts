import { env } from "./lib/env.js";
import type { ScrapedLead } from "./scraper.js";

export interface SearchQuery {
  city: string;
  state: string;
  industry: string;
  keyword?: string;
  max_results?: number;
}

interface GooglePlace {
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  place_id?: string;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripTags(value: string): string {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchGooglePlaceDetails(placeId: string, apiKey: string): Promise<Partial<GooglePlace>> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,formatted_address,formatted_phone_number,website,rating");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return {};
  const data = await response.json() as { result?: Partial<GooglePlace> };
  return data.result || {};
}

async function searchGoogleMaps(query: SearchQuery): Promise<ScrapedLead[]> {
  const googleMapsApiKey = env.GOOGLE_MAPS_API_KEY;
  if (!googleMapsApiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

  const searchQuery = `${query.industry}${query.keyword ? ` ${query.keyword}` : ""} in ${query.city}, ${query.state}`;
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", searchQuery);
  url.searchParams.set("key", googleMapsApiKey);
  url.searchParams.set("type", "establishment");

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`);

  const data = await response.json() as { results?: GooglePlace[]; status: string };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Maps API status: ${data.status}`);
  }

  const places = (data.results || []).slice(0, query.max_results ?? 30);

  return Promise.all(
    places.map(async (place) => {
      let details: Partial<GooglePlace> = {};
      if (place.place_id && places.length <= 20) {
        try {
          details = await fetchGooglePlaceDetails(place.place_id, googleMapsApiKey);
        } catch {
          // Best effort enrichment.
        }
      }

      const score = Math.min(
        100,
        Math.max(40, 50 + Math.round((place.rating ?? 0) * 6) + (details.website ? 10 : 0) + (details.formatted_phone_number ? 5 : 0))
      );

      return {
        company_name: place.name,
        location: place.formatted_address || details.formatted_address || `${query.city}, ${query.state}`,
        phone: details.formatted_phone_number,
        website: details.website,
        vertical: query.industry,
        score,
        raw_data: {
          source: "google_maps",
          place_id: place.place_id,
          rating: place.rating,
        },
      } satisfies ScrapedLead;
    })
  );
}

async function searchSerpApi(query: SearchQuery): Promise<ScrapedLead[]> {
  if (!env.SERPAPI_KEY) throw new Error("SERPAPI_KEY not configured");

  const searchQuery = `${query.industry}${query.keyword ? ` ${query.keyword}` : ""} ${query.city} ${query.state}`;
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_maps");
  url.searchParams.set("q", searchQuery);
  url.searchParams.set("type", "search");
  url.searchParams.set("api_key", env.SERPAPI_KEY);

  const response = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);

  const data = await response.json() as { local_results?: Array<{ title: string; address?: string; phone?: string; website?: string; rating?: number; type?: string }>; error?: string };
  if (data.error) throw new Error(`SerpAPI: ${data.error}`);

  return (data.local_results || []).slice(0, query.max_results ?? 30).map((result) => ({
    company_name: result.title,
    location: result.address || `${query.city}, ${query.state}`,
    phone: result.phone,
    website: result.website,
    vertical: query.industry,
    score: Math.min(100, Math.max(40, 50 + Math.round((result.rating ?? 0) * 6) + (result.website ? 10 : 0) + (result.phone ? 5 : 0))),
    raw_data: { source: "serpapi", rating: result.rating, type: result.type },
  }));
}

async function searchFirecrawl(query: SearchQuery): Promise<ScrapedLead[]> {
  if (!env.FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

  const searchQuery = `${query.industry}${query.keyword ? ` ${query.keyword}` : ""} ${query.city} ${query.state} businesses`;
  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: searchQuery,
      limit: Math.min(query.max_results ?? 30, 10),
      scrapeOptions: { formats: ["markdown"] },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) throw new Error(`Firecrawl search error: ${response.status} ${response.statusText}`);
  const data = await response.json() as { success: boolean; data?: Array<{ url?: string; title?: string; description?: string }>; error?: string };
  if (!data.success) throw new Error(`Firecrawl search failed: ${data.error || "unknown"}`);

  return (data.data || []).map((doc) => {
    const url = doc.url ?? "";
    let hostname = url || "unknown";
    try {
      hostname = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // noop
    }

    return {
      company_name: doc.title || hostname,
      website: url || undefined,
      vertical: query.industry,
      location: `${query.city}, ${query.state}`,
      score: 55,
      raw_data: { source: "firecrawl_search", description: doc.description },
    } satisfies ScrapedLead;
  });
}

async function searchDuckDuckGo(query: SearchQuery): Promise<ScrapedLead[]> {
  const searchQuery = `${query.industry}${query.keyword ? ` ${query.keyword}` : ""} ${query.city} ${query.state}`;
  const url = new URL("https://html.duckduckgo.com/html/");
  url.searchParams.set("q", searchQuery);

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; XPS-Intelligence/1.0; +https://xps.local)",
    },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo error: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const matches = [...html.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

  return matches.slice(0, query.max_results ?? 15).map((match) => {
    const rawUrl = decodeURIComponent(match[1]);
    const title = stripTags(match[2]);
    let website: string | undefined;
    let hostname = title;

    try {
      website = rawUrl.startsWith("http") ? rawUrl : undefined;
      hostname = website ? new URL(website).hostname.replace(/^www\./, "") : title;
    } catch {
      website = undefined;
    }

    return {
      company_name: title || hostname,
      website,
      vertical: query.industry,
      location: `${query.city}, ${query.state}`,
      score: 52,
      raw_data: {
        source: "duckduckgo_html",
        title,
        search_query: searchQuery,
      },
    } satisfies ScrapedLead;
  });
}

export async function searchBusinesses(query: SearchQuery): Promise<{ leads: ScrapedLead[]; source: string; error?: string }> {
  try {
    const leads = await searchGoogleMaps(query);
    return { leads, source: "google_maps" };
  } catch (error) {
    console.warn("[SearchEngine] Google Maps failed:", (error as Error).message);
  }

  try {
    const leads = await searchSerpApi(query);
    return { leads, source: "serpapi" };
  } catch (error) {
    console.warn("[SearchEngine] SerpAPI failed:", (error as Error).message);
  }

  try {
    const leads = await searchFirecrawl(query);
    return { leads, source: "firecrawl_search" };
  } catch (error) {
    console.warn("[SearchEngine] Firecrawl failed:", (error as Error).message);
  }

  try {
    const leads = await searchDuckDuckGo(query);
    return { leads, source: "duckduckgo_html" };
  } catch (error) {
    console.warn("[SearchEngine] DuckDuckGo failed:", (error as Error).message);
  }

  return {
    leads: [],
    source: "none",
    error: "All search providers failed - check provider keys or network access",
  };
}
