// src/api.js
export const API_BASE = "http://localhost:8000/api"; // update port if needed

export async function scrapeUrl(url, summarise = false) {
  const res = await fetch(`${API_BASE}/scrape`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, summarise }),
  });
  if (!res.ok) throw new Error(`Scrape failed: ${res.statusText}`);
  return res.json();
}

export async function createDocument(document) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(document),
  });
  if (!res.ok) throw new Error(`Create document failed: ${res.statusText}`);
  return res.json();
}

export async function listDocuments() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(`List documents failed: ${res.statusText}`);
  return res.json();
}

export async function summariseDocuments() {
  const res = await fetch(`${API_BASE}/documents/summary`);
  if (!res.ok) throw new Error(`Summary failed: ${res.statusText}`);
  return res.json();
}
