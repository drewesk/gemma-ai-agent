import { Router } from 'express';
import * as documentController from '../controllers/documentController';

const router = Router();

// Delegate POST /api/documents to the controller
router.post('/', documentController.createDocument);

// Delegate GET /api/documents to the controller
router.get('/', documentController.listDocuments);

// New endpoint: GET /api/documents/summary
router.get('/summary', documentController.summariseDocuments);

export default router;