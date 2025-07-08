import jwt from 'jsonwebtoken';
import { config } from '../config';

interface TokenPayload {
    userId: string;
    walletAddress: string;
}

/**
 * Generate a JWT token for a user
 */
export const generateToken = (payload: TokenPayload): string => {
    return jwt.sign(
        payload,
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
    );
};

/**
 * Verify a JWT token
 */
export const verifyToken = (token: string): TokenPayload | null => {
    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        return decoded as TokenPayload;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}; 