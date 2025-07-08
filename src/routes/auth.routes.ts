import express from 'express';
import { requestNonce, verifyLogin } from '../controllers/auth.controller';

const router = express.Router();

// Route to request a nonce for authentication
router.post('/nonce', requestNonce);

// Route to verify wallet signature and login
router.post('/verify', verifyLogin);

export default router; 