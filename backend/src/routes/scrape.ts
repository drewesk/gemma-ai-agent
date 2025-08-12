import { Router } from 'express';
import * as scrapeController from '../controllers/scrapeController';

const router = Router();

/**
 * POST /api/scrape
 *
 * Accepts a JSON body with a `url` and optional `summarise` flag. The
 * controller validates the input and delegates the scraping logic to
 * the scrape service. On success it returns the scraped HTML or
 * summary.
 */
router.post('/', scrapeController.scrapeUrl);

export default router;