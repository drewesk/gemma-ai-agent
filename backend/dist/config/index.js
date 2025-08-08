"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIRECRAWL_API_URL = exports.FIRECRAWL_API_KEY = exports.MONGODB_COLLECTION_NAME = exports.MONGODB_DB_NAME = exports.MONGODB_URI = exports.PORT = exports.LLM_SCRIPT_PATH = exports.DATA_DIR = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../../.env") });
console.log("Firecrawl API Key:", process.env.FIRECRAWL_API_KEY); // debug check
/**
 * Centralised configuration for the backend. Environment variables can be
 * used to override these values at runtime without changing code.
 */
// Base directory for the simple JSON document store. You can override
// this via the DATA_DIR environment variable. When a MongoDB URI is
// provided, this directory will only be used as a fallback.
exports.DATA_DIR = process.env.DATA_DIR || path_1.default.join(__dirname, "../../data");
// Absolute path to the Python LLM script. You can override this via
// the LLM_SCRIPT_PATH environment variable if your script lives elsewhere.
exports.LLM_SCRIPT_PATH = process.env.LLM_SCRIPT_PATH || path_1.default.join(__dirname, "../../llm_service.py");
// Port for the Express server to listen on. Default to 3000.
exports.PORT = parseInt(process.env.PORT || "3000", 10);
/**
 * MongoDB configuration. When MONGODB_URI is defined, documents will be
 * persisted to the specified database and collection instead of the
 * local JSON file. These values can be overridden via environment
 * variables. If no URI is provided, the JSON file will be used.
 */
exports.MONGODB_URI = process.env.MONGODB_URI;
exports.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "firecrawl";
exports.MONGODB_COLLECTION_NAME = process.env.MONGODB_COLLECTION_NAME || "documents";
/**
 * Firecrawl API configuration. When FIRECRAWL_API_KEY is defined, the
 * scraping service will call the Firecrawl API to fetch page content
 * instead of directly fetching HTML. This allows for robust scraping
 * across complex websites. You can override the base URL via
 * FIRECRAWL_API_URL. If no key is provided, the service falls back
 * to native fetch.
 */
exports.FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
exports.FIRECRAWL_API_URL = process.env.FIRECRAWL_API_URL || "https://api.firecrawl.dev/v1/scrape";
