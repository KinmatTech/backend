import { Router } from 'express';
import { connectX, shareX } from '../controllers/social.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Twitter OAuth routes
router.get('/connect-x', authenticate, connectX);
router.get('/connect-x/callback', connectX); 
router.post('/share-x', authenticate, shareX);

export default router; 