# Firecrawl Hybrid Backend

This directory contains a fully structured hybrid backend implementation
that uses Express.js (TypeScript) for API orchestration, web
scraping and document storage, and Python for integrating with a
language model. The code follows a clear MVC (Model–View–Controller)
organisation: business logic lives in `src/controllers`, data access
is encapsulated in `src/models`, reusable logic is in `src/services`,
and the Express routes in `src/routes` simply delegate to these
modules. This separation keeps the codebase human‑readable and easy
to maintain. The Streamlit interface has been removed. You can
develop your own front‑end in React or another framework to call
these APIs.

## Requirements

- Node.js >= 18 (for native `fetch` support). If using an older
  version of Node, install `node-fetch` and adjust the import in
  `src/routes/scrape.ts` accordingly.
- Python >= 3.7 (for the LLM service). The script assumes
  availability of standard Python and does not require external
  packages, but in a real system you would add your LLM dependencies
  here.

## Setup

1. Install the Node dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Install any Python dependencies needed for your LLM implementation.
   The updated `llm_service.py` uses only the Python standard library by
   default. If you plan to call a remote LLM service (e.g. via the
   `requests` library), install those packages in your Python environment.

3. Copy or create a `.env` file in the `backend` directory if you
   wish to override configuration values. The server uses
   `dotenv` to load variables from this file and makes them available
   to both the Express app and the Python LLM service. See
   **Environment variables** below for available settings. A typical
   `.env` might look like:

   ```dotenv
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB_NAME=firecrawl
   MONGODB_COLLECTION_NAME=documents
   FIRECRAWL_API_KEY=your-firecrawl-key
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama3
   ```

4. Build the TypeScript code:

   ```bash
   npm run build
   ```

5. Start the API server:

   ```bash
   npm start
   ```

   By default the server listens on port `3000`. You can override the
   port by setting the `PORT` environment variable.

## Environment variables

The backend can be configured via the following environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Port for the Express server | `3000` |
| `DATA_DIR` | Directory for JSON document fallback | `backend/data` |
| `MONGODB_URI` | MongoDB connection URI. When provided, the app will store and fetch documents from MongoDB instead of the local JSON file. | *(unset)* |
| `MONGODB_DB_NAME` | Name of the MongoDB database to use | `firecrawl` |
| `MONGODB_COLLECTION_NAME` | Name of the MongoDB collection to use for documents | `documents` |
| `FIRECRAWL_API_KEY` | API key for Firecrawl. When set, the scrape service will call the Firecrawl `/v1/scrape` endpoint to retrieve page content. | *(unset)* |
| `FIRECRAWL_API_URL` | Override the base URL for the Firecrawl API | `https://api.firecrawl.dev/v1/scrape` |
| `LLM_SCRIPT_PATH` | Path to the Python LLM script | `backend/llm_service.py` |
| `OLLAMA_URL` | Endpoint for the local ollama service. When defined, the Python script will call this endpoint to generate language model responses. | `http://localhost:11434/api/generate` |
| `OLLAMA_MODEL` | Model name to pass to ollama when generating responses | `llama3` |

When you set these variables in your `.env` file, the Express
application loads them via `dotenv.config()` and they are inherited
by the Python process spawned by the Node service. This allows the
Python script to access the same configuration without additional
parsing.

## API Overview

### Health Check

`GET /health` – returns a simple JSON status message.

### Scraping

`POST /api/scrape`

Body:

```json
{
  "url": "https://example.com",
  "summarise": true
}
```

The endpoint fetches the HTML content from the provided `url`. If
`summarise` is set to `true`, the server will call the Python LLM
service to generate a short summary of the page and return it. If
omitted or false, the raw HTML is returned. If you set
`FIRECRAWL_API_KEY`, the server will call the Firecrawl `/v1/scrape`
endpoint to retrieve page content instead of fetching the URL directly.
This is useful for scraping dynamic or JavaScript‑heavy sites. The
scraping logic lives in `src/services/scrapeService.ts`.

### Document Storage

`POST /api/documents`

Body:

```json
{
  "content": "Some text to store"
}
```

Saves a new document to persistent storage. If `MONGODB_URI` is set
the document will be inserted into the configured MongoDB collection
(`MONGODB_DB_NAME`/`MONGODB_COLLECTION_NAME`). Otherwise it will
fallback to the JSON file located in `backend/data/documents.json`.
Returns the saved document with a generated `id` and timestamp.

`GET /api/documents`

Returns all stored documents from the configured store (MongoDB or
JSON file).

### Document Summary

`GET /api/documents/summary`

Aggregates all stored document contents into a single string and
passes it to the Python LLM service to generate a summary. Returns
a JSON object like `{ "summary": "..." }`. If no documents are
stored, returns an empty summary. This endpoint demonstrates how the
backend bridges the gap between the database and the LLM service.

## LLM Service

The Python script `llm_service.py` now supports calling a local
`ollama` service to generate language model responses. When
`OLLAMA_URL` is defined, the script will issue a `POST` request to
the `ollama` API with the model name provided via `OLLAMA_MODEL`.
The response is prefixed with `"LLM output: "` to maintain
compatibility with the existing tests. If the call fails or
`OLLAMA_URL` is not set, the script falls back to a simple stub that
returns the first 200 characters of the input with a label. You can
replace this logic with any custom LLM integration as needed. The
Node service uses the `python-shell` package to spawn the script,
inherit its environment variables, and capture its output. The
Python code is intentionally kept readable and modular; feel free
to extend it with additional functionality such as embedding
generation or direct database access.

## Extending the Backend

- **Authentication / Authorization**: Add middleware in
  `src/app.ts` to secure your endpoints.
- **Database Integration**: Replace the JSON file storage with a
  proper database (e.g., MongoDB) by adding a client library and
  refactoring the document persistence in `src/models/document.ts` and
  `src/services/store.ts`.
- **Advanced Scraping**: Use libraries like `cheerio` or
  `puppeteer` in `src/routes/scrape.ts` to extract structured data
  instead of returning raw HTML. For large scrape jobs, consider
  delegating scraping to a background worker.
- **Auto‑indexing**: After scraping or inserting a document, call
  your Python LLM service to generate embeddings and store them in a
  vector database. You can extend `src/services/llm.ts` to support
  embedding extraction.