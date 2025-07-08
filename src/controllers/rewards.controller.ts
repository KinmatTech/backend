import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

// Map numeric levels to impact level enum
function getImpactLevel(level: number): 'NEWBIE' | 'PRO' | 'HERO' | 'GUARDIAN' {
    if (level <= 3) return 'NEWBIE';
    if (level <= 6) return 'PRO';
    if (level <= 9) return 'HERO';
    return 'GUARDIAN';
}

export const claimReward = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { impactLevel } = req.body;

        if (!userId || !impactLevel) {
            res.status(400).json({
                success: false,
                message: 'Missing required parameters',
            });
            return;
        }

        // Convert numeric level to enum
        const level = parseInt(impactLevel);
        if (isNaN(level) || level < 1 || level > 10) {
            res.status(400).json({
                success: false,
                message: 'Invalid impact level. Must be between 1 and 10.',
            });
            return;
        }

        // Get user data
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }

        // Check if user has connected Twitter
        const hasTwitter = !!user.twitterHandle;
        
        // Update user's impact level
        await db.update(users)
            .set({
                impactLevel: getImpactLevel(level),
                updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

        res.status(200).json({
            success: true,
            data: {
                numericLevel: level,
                impactLevel: getImpactLevel(level),
                shouldConnectTwitter: !hasTwitter,
                twitterShareUrl: hasTwitter ? `/api/social/share-x` : null,
            },
        });
    } catch (error) {
        console.error('Error claiming reward:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
}; 