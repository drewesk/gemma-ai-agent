import { runLlm } from './llmService';
import { FIRECRAWL_API_KEY, FIRECRAWL_API_URL } from '../config';

/**
 * Fetch the HTML for a given URL using the native fetch API. This
 * service function allows for easier testing and reuse.
 *
 * @param url The URL to fetch
 */
export async function fetchHtml(url: string): Promise<string> {
  // If a Firecrawl API key is provided, call the Firecrawl scrape API
  if (FIRECRAWL_API_KEY) {
    const reqBody = { url };
    const response = await globalThis.fetch(FIRECRAWL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify(reqBody)
    });
    if (!response.ok) {
      throw new Error(`Firecrawl request failed: ${response.statusText}`);
    }
    const data: any = await response.json();
    // The Firecrawl response can include html, markdown, rawHtml or content
    return data.html || data.markdown || data.rawHtml || data.content || '';
  }
  // Otherwise fall back to native fetch of the URL
  const response = await globalThis.fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
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
export async function scrape(url: string, summarise: boolean = false): Promise<{ html?: string; summary?: string }> {
  const html = await fetchHtml(url);
  if (summarise) {
    const summary = await runLlm(html);
    return { summary };
  }
  return { html };
}