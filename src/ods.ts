/**
 * Minimal client for the Opendatasoft Explore API v2.1 of data.gr.ch.
 * Mirrors the retry/timeout/429 behaviour of the mcp-data-gr server.
 */

const rawDomain = process.env.DATA_PORTAL_DOMAIN ?? "data.gr.ch";
export const DOMAIN = rawDomain
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");
export const BASE_URL = `https://${DOMAIN}/api/explore/v2.1`;

export function datasetPortalUrl(datasetId: string): string {
  return `https://${DOMAIN}/explore/dataset/${encodeURIComponent(datasetId)}/`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function odsFetch(
  endpoint: string,
  params: Record<string, string | number | undefined> = {},
): Promise<any> {
  const url = new URL(BASE_URL + endpoint);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      break;
    } catch (error) {
      if (attempt === 2) {
        throw new Error(`ODS network error after 3 attempts: ${String(error)}`);
      }
      await sleep(2 ** attempt * 1000);
    }
  }
  if (!response) throw new Error("ODS request failed");

  if (response.status === 429) {
    throw new Error(
      `ODS 429: domain quota exhausted, retry later (Retry-After: ${
        response.headers.get("Retry-After") ?? "unknown"
      })`,
    );
  }
  if (response.status >= 400) {
    let message = await response.text();
    try {
      const parsed = JSON.parse(message);
      message = parsed.message ?? message;
    } catch {
      // keep raw text
    }
    throw new Error(`ODS ${response.status}: ${message}`);
  }
  return response.json();
}

export function escapeOdsql(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function stripHtml(text: string): string {
  return (text ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
