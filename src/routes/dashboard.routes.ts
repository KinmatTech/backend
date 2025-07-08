import express from 'express';
import { getDashboardData } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// Protected route that requires authentication
router.get('/data', requireAuth, getDashboardData);

export default router; 