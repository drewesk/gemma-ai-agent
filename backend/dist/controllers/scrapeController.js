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
exports.scrapeUrl = scrapeUrl;
const scrapeService_1 = require("../services/scrapeService");
/**
 * Controller for scrape-related endpoints. Accepts URL and optional
 * summarisation flag from the request body and delegates scraping
 * functionality to the scrape service. Handles errors and returns
 * either the raw HTML or the summary depending on the flag.
 */
function scrapeUrl(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { url, summarise } = req.body;
            if (typeof url !== 'string' || url.trim() === '') {
                res.status(400).json({ error: 'Missing or invalid URL' });
                return;
            }
            const result = yield (0, scrapeService_1.scrape)(url, Boolean(summarise));
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    });
}
