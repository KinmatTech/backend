import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

// Get user dashboard data
export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
    try {
        // The user's ID will be added to the request by the auth middleware
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }

        // Fetch user data
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

        // Return dashboard data
        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                walletAddress: user.walletAddress,
                ensName: user.ensName,
                impactLevel: user.impactLevel,
                impactValue: user.impactValue,
                dcuStats: {
                    total: user.totalDcuPoints,
                    fromSubmissions: user.dcuFromSubmissions,
                    fromReferrals: user.dcuFromReferrals,
                    fromStreaks: user.dcuFromStreaks,
                },
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
}; 