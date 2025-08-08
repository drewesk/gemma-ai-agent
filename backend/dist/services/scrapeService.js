"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHtml = fetchHtml;
exports.scrape = scrape;
const llmService_1 = require("./llmService");
const config_1 = require("../config");
/**
 * Fetch the HTML for a given URL using the native fetch API. This
 * service function allows for easier testing and reuse.
 *
 * @param url The URL to fetch
 */
function fetchHtml(url) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        if (config_1.FIRECRAWL_API_KEY) {
            const apiUrl = config_1.FIRECRAWL_API_URL || "https://api.firecrawl.dev/v1/scrape";
            const reqBody = {
                url,
                formats: ["html", "markdown"], // match your working curl exactly
                onlyMainContent: true,
            };
            const response = yield fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${config_1.FIRECRAWL_API_KEY.trim()}`,
                },
                body: JSON.stringify(reqBody),
            });
            if (!response.ok) {
                throw new Error(`Firecrawl request failed: ${response.status} ${response.statusText}`);
            }
            const data = yield response.json();
            console.log("Full Firecrawl response:", data);
            return (((_a = data.data) === null || _a === void 0 ? void 0 : _a.markdown) ||
                ((_b = data.data) === null || _b === void 0 ? void 0 : _b.html) ||
                ((_c = data.data) === null || _c === void 0 ? void 0 : _c.rawHtml) ||
                ((_d = data.data) === null || _d === void 0 ? void 0 : _d.content) ||
                "");
        }
        // Fallback: direct fetch
        const response = yield globalThis.fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        return response.text();
    });
}
/**
 * Scrape a URL and optionally summarise its contents via the LLM
 * service. Returns an object containing either the raw HTML or the
 * summary. If summarise is true, only the summary is returned.
 *
 * @param url The URL to fetch
 * @param summarise Whether to summarise using the LLM
 */
function scrape(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, summarise = false) {
        const html = yield fetchHtml(url);
        if (summarise) {
            const summary = yield (0, llmService_1.runLlm)(html);
            return { summary };
        }
        return { html };
    });
}
