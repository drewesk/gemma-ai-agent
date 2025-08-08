import { runLlm } from "./llmService";
import { FIRECRAWL_API_KEY, FIRECRAWL_API_URL } from "../config";

/**
 * Fetch the HTML for a given URL using the native fetch API. This
 * service function allows for easier testing and reuse.
 *
 * @param url The URL to fetch
 */

export async function fetchHtml(url: string): Promise<string> {
  if (FIRECRAWL_API_KEY) {
    const apiUrl = FIRECRAWL_API_URL || "https://api.firecrawl.dev/v1/scrape";
    const reqBody = {
      url,
      formats: ["html", "markdown"], // match your working curl exactly
      onlyMainContent: true,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${FIRECRAWL_API_KEY.trim()}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!response.ok) {
      throw new Error(
        `Firecrawl request failed: ${response.status} ${response.statusText}`
      );
    }

    const data: any = await response.json();
    console.log("Full Firecrawl response:", data);

    return (
      data.data?.markdown ||
      data.data?.html ||
      data.data?.rawHtml ||
      data.data?.content ||
      ""
    );
  }

  // Fallback: direct fetch
  const response = await globalThis.fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch URL: ${response.status} ${response.statusText}`
    );
  }
  return response.text();
}

/**
 * Scrape a URL and optionally summarise its contents via the LLM
 * service. Returns an object containing either the raw HTML or the
 * summary. If summarise is true, only the summary is returned.
 *
 * @param url The URL to fetch
 * @param summarise Whether to summarise using the LLM
 */
export async function scrape(
  url: string,
  summarise: boolean = false
): Promise<{ html?: string; summary?: string }> {
  const html = await fetchHtml(url);
  if (summarise) {
    const summary = await runLlm(html);
    return { summary };
  }
  return { html };
}
