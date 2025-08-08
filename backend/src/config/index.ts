import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Centralised configuration for the backend. Environment variables can be
 * used to override these values at runtime without changing code.
 */

// Base directory for the simple JSON document store. You can override
// this via the DATA_DIR environment variable. When a MongoDB URI is
// provided, this directory will only be used as a fallback.
export const DATA_DIR: string =
  process.env.DATA_DIR || path.join(__dirname, "../../data");

// Absolute path to the Python LLM script. You can override this via
// the LLM_SCRIPT_PATH environment variable if your script lives elsewhere.
export const LLM_SCRIPT_PATH: string =
  process.env.LLM_SCRIPT_PATH || path.join(__dirname, "../../llm_service.py");

// Port for the Express server to listen on. Default to 3000.
export const PORT: number = parseInt(process.env.PORT || "3000", 10);

/**
 * MongoDB configuration. When MONGODB_URI is defined, documents will be
 * persisted to the specified database and collection instead of the
 * local JSON file. These values can be overridden via environment
 * variables. If no URI is provided, the JSON file will be used.
 */
export const MONGODB_URI: string | undefined = process.env.MONGODB_URI;
export const MONGODB_DB_NAME: string =
  process.env.MONGODB_DB_NAME || "firecrawl";
export const MONGODB_COLLECTION_NAME: string =
  process.env.MONGODB_COLLECTION_NAME || "documents";

/**
 * Firecrawl API configuration. When FIRECRAWL_API_KEY is defined, the
 * scraping service will call the Firecrawl API to fetch page content
 * instead of directly fetching HTML. This allows for robust scraping
 * across complex websites. You can override the base URL via
 * FIRECRAWL_API_URL. If no key is provided, the service falls back
 * to native fetch.
 */
export const FIRECRAWL_API_KEY: string | undefined =
  process.env.FIRECRAWL_API_KEY;
export const FIRECRAWL_API_URL: string =
  process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev/v1/scrape";
