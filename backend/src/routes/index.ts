import { Router } from 'express';
import scrapeRoutes from './scrape';
import docRoutes from './doc';

const router = Router();

// Mount each sub-route under its own path
router.use('/scrape', scrapeRoutes);
router.use('/documents', docRoutes);

export default router;