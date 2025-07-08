import { Router } from 'express';
import { claimReward } from '../controllers/rewards.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/claim', authenticate, claimReward);

export default router; 