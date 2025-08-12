# Backend Server

Express (TypeScript) API. All endpoints are mounted under `/api`.

## Base URL

- Local (default): `http://localhost:<PORT>` (defaults to `3000` if not set)
- Health check (not under `/api`): `GET /health` → `{"status":"ok"}`

---

## Routes

### 1) Scrape a URL

**POST** `/api/scrape`  
Request body:

```json
{
  "url": "https://example.com",
  "summarise": false
}

--

### EDIT ME for updated Routes and React Front-end integration, in-progress.
```
