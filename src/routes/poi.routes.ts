import { Router } from 'express';
import { submitPoI, getPois, getPendingSubmissions, verifySubmission, getSubmissionStatus } from '../controllers/poi.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Submit PoI (requires authentication)
router.post('/submit', requireAuth, submitPoI);


// Get submission status (requires authentication)
router.get('/:submissionId', requireAuth, getSubmissionStatus);

router.get('/', requireAuth, requireRole(['VALIDATOR', 'ADMIN']), getPois);
router.get('/pending', requireAuth, requireRole(['VALIDATOR', 'ADMIN']), getPendingSubmissions);
router.post('/:submissionId/verify', requireAuth, requireRole(['VALIDATOR', 'ADMIN']), verifySubmission);

export default router; 