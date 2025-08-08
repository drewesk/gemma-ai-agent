import { Request, Response, NextFunction } from 'express';
import { scrape } from '../services/scrapeService';

/**
 * Controller for scrape-related endpoints. Accepts URL and optional
 * summarisation flag from the request body and delegates scraping
 * functionality to the scrape service. Handles errors and returns
 * either the raw HTML or the summary depending on the flag.
 */

export async function scrapeUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url, summarise } = req.body;
    if (typeof url !== 'string' || url.trim() === '') {
      res.status(400).json({ error: 'Missing or invalid URL' });
      return;
    }
    const result = await scrape(url, Boolean(summarise));
    res.json(result);
  } catch (err) {
    next(err);
  }
}