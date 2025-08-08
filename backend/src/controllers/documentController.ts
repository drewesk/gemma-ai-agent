import { Request, Response, NextFunction } from 'express';
import * as DocumentModel from '../models/document';
import { runLlm } from '../services/llmService';

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
export async function createDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, content } = req.body;
    const doc = await DocumentModel.create(content, id);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

/**
 * Get a list of all documents.
 *
 * GET /api/documents
 */
export async function listDocuments(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const docs = await DocumentModel.findAll();
    res.json(docs);
  } catch (err) {
    next(err);
  }
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
export async function summariseDocuments(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const docs = await DocumentModel.findAll();
    if (!docs || docs.length === 0) {
      res.json({ summary: '' });
      return;
    }
    // Concatenate all document contents with separators. We include
    // document ids for context in case the LLM wishes to reference
    // them; this can help generate more meaningful summaries when
    // working with multiple documents.
    const aggregated = docs.map((d) => `Document ${d.id}: ${d.content}`).join('\n\n');
    const summary = await runLlm(aggregated);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
}