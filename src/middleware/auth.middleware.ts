import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, authSessions, userRoleEnum, type User } from '../db/schema';
import { verifyToken } from '../utils/jwt';

// Extend Express Request type to include user
declare module 'express' {
    interface Request {
        user?: User;
    }
}

// Middleware to authenticate requests with JWT
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'Authentication token required',
            });
            return;
        }

        const payload = verifyToken(token);
        if (!payload) {
            res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
            return;
        }

        const session = await db.query.authSessions.findFirst({
            where: eq(authSessions.token, token),
        });

        if (!session || !session.active) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired session',
            });
            return;
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });

        if (!user) {
            res.status(401).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({
            success: false,
            message: 'Authentication failed',
        });
    }
};

export const requireRole = (allowedRoles: (typeof userRoleEnum.enumValues)[number][]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userRole = req.user?.role;

        if (!userRole || !allowedRoles.includes(userRole)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions to access this resource',
            });
            return;
        }

        next();
    };
}; 