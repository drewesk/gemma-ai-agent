"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.createDocument = createDocument;
exports.listDocuments = listDocuments;
exports.summariseDocuments = summariseDocuments;
const DocumentModel = __importStar(require("../models/document"));
const llmService_1 = require("../services/llmService");
/**
 * Controller for document-related endpoints. Controllers orchestrate
 * requests by validating input, invoking the appropriate model
 * functions and services, and formatting the output for the response.
 */
/**
 * Create a new document.
 *
 * POST /api/documents
 *
 * The request body should include a `content` field and may optionally
 * include an `id`. If the id is omitted the store will generate one.
 */
function createDocument(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { id, content } = req.body;
            const doc = yield DocumentModel.create(content, id);
            res.status(201).json(doc);
        }
        catch (err) {
            next(err);
        }
    });
}
/**
 * Get a list of all documents.
 *
 * GET /api/documents
 */
function listDocuments(_req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const docs = yield DocumentModel.findAll();
            res.json(docs);
        }
        catch (err) {
            next(err);
        }
    });
}
/**
 * Summarise all stored documents using the Python LLM service. This
 * endpoint aggregates the content of all documents into a single
 * string separated by two newlines, calls the LLM service to
 * generate a summary, and returns the result. If there are no
 * documents, an empty summary is returned.
 *
 * GET /api/documents/summary
 */
function summariseDocuments(_req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const docs = yield DocumentModel.findAll();
            if (!docs || docs.length === 0) {
                res.json({ summary: '' });
                return;
            }
            // Concatenate all document contents with separators. We include
            // document ids for context in case the LLM wishes to reference
            // them; this can help generate more meaningful summaries when
            // working with multiple documents.
            const aggregated = docs.map((d) => `Document ${d.id}: ${d.content}`).join('\n\n');
            const summary = yield (0, llmService_1.runLlm)(aggregated);
            res.json({ summary });
        }
        catch (err) {
            next(err);
        }
    });
}
