import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, authSessions } from '../db/schema';
import { generateAuthNonce, verifySignature, createAuthMessage } from '../utils/signature';
import { generateToken } from '../utils/jwt';

// Request a nonce for wallet authentication
export const requestNonce = async (req: Request, res: Response): Promise<void> => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress || typeof walletAddress !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Wallet address is required'
            });
            return;
        }

        // Generate a new nonce
        const nonce = generateAuthNonce();

        // Create authentication message to be signed by the wallet
        const message = createAuthMessage(walletAddress, nonce);

        // Store or update user with nonce
        const userRecord = await createOrUpdateUser(walletAddress);

        // Update the user's last nonce
        await db
            .update(users)
            .set({ lastNonce: nonce })
            .where(eq(users.id, userRecord.id));

        res.status(200).json({
            success: true,
            data: {
                nonce,
                message,
            },
        });
    } catch (error) {
        console.error('Error in requestNonce:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Verify wallet signature and login user
export const verifyLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { walletAddress, signature, ensName } = req.body;

        if (!walletAddress || !signature) {
            res.status(400).json({
                success: false,
                message: 'Wallet address and signature are required'
            });
            return;
        }

        // Find user by wallet address
        const userRecord = await db.query.users.findFirst({
            where: eq(users.walletAddress, walletAddress.toLowerCase()),
        });

        if (!userRecord || !userRecord.lastNonce) {
            res.status(400).json({
                success: false,
                message: 'Invalid login attempt. Please request a new nonce.'
            });
            return;
        }

        // Create the message that was signed
        const message = createAuthMessage(walletAddress, userRecord.lastNonce);

        // Verify the signature
        const isSignatureValid = await verifySignature(
            walletAddress as `0x${string}`,
            message,
            signature as `0x${string}`
        );

        if (!isSignatureValid) {
            res.status(401).json({
                success: false,
                message: 'Invalid signature'
            });
            return;
        }

        // Update user with ENS name if provided
        const user = await createOrUpdateUser(walletAddress, ensName);

        // Clear the used nonce and save the signature
        await db
            .update(users)
            .set({
                lastNonce: null,
                lastSignature: signature,
                updatedAt: new Date()
            })
            .where(eq(users.id, user.id));

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            walletAddress: user.walletAddress,
        });

        // Store the authentication session
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

        await db.insert(authSessions).values({
            userId: user.id,
            token,
            expiresAt: expiryDate,
        });

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    walletAddress: user.walletAddress,
                    ensName: user.ensName,
                    impactLevel: user.impactLevel,
                    impactValue: user.impactValue,
                    totalDcuPoints: user.totalDcuPoints,
                },
            },
        });
    } catch (error) {
        console.error('Error in verifyLogin:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};


// Create or update user from wallet address
const createOrUpdateUser = async (walletAddress: string, ensName?: string) => {
    const existingUser = await db.query.users.findFirst({
        where: eq(users.walletAddress, walletAddress.toLowerCase()),
    });

    if (existingUser) {
        // Update user with latest ENS name if provided
        if (ensName && existingUser.ensName !== ensName) {
            await db
                .update(users)
                .set({
                    ensName,
                    updatedAt: new Date()
                })
                .where(eq(users.id, existingUser.id));

            return {
                ...existingUser,
                ensName,
            };
        }

        return existingUser;
    }

    // Create new user
    const [newUser] = await db
        .insert(users)
        .values({
            walletAddress: walletAddress.toLowerCase(),
            ensName: ensName || null,
        })
        .returning();

    return newUser;
};