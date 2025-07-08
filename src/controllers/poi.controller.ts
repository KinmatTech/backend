import type { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import exifr from 'exifr';
import { create } from 'ipfs-http-client';
import { eq, and, desc, asc, sql, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { poiSubmissions, submissionStatusEnum, type User } from '../db/schema';


// Configure IPFS client
const ipfs = create({ url: process.env.IPFS_NODE_URL || 'http://localhost:5001' });

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/heic'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file format. Only JPEG, JPG, and HEIC formats are allowed.'));
        }
    },
}).fields([
    { name: 'beforeImage', maxCount: 1 },
    { name: 'afterImage', maxCount: 1 },
]);

// Helper function to process and validate image
async function processImage(file: Express.Multer.File) {
    // Convert image to JPEG format and optimize
    const processedImage = await sharp(file.buffer)
        .jpeg({ quality: 80 })
        .toBuffer();

    // Extract metadata
    const metadata = await exifr.parse(file.buffer, {
        pick: ['GPSLatitude', 'GPSLongitude', 'DateTimeOriginal'],
    });

    return {
        buffer: processedImage,
        metadata,
    };
}

// Submit PoI
export const submitPoI = async (req: Request, res: Response): Promise<void> => {
    try {
        // Handle file upload using multer
        upload(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                res.status(400).json({
                    success: false,
                    message: 'File upload error',
                    error: err.message,
                });
                return;
            } else if (err) {
                res.status(400).json({
                    success: false,
                    message: err.message,
                });
                return;
            }

            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const userId = req.user?.id;

            if (!userId) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            // Validate that both images are provided
            if (!files.beforeImage?.[0] || !files.afterImage?.[0]) {
                res.status(400).json({
                    success: false,
                    message: 'Both before and after images are required',
                });
                return;
            }

            try {
                // Process both images
                const beforeImageResult = await processImage(files.beforeImage[0]);
                const afterImageResult = await processImage(files.afterImage[0]);

                // Upload images to IPFS
                const beforeImageCid = (await ipfs.add(beforeImageResult.buffer)).cid.toString();
                const afterImageCid = (await ipfs.add(afterImageResult.buffer)).cid.toString();

                // Extract location from either image (prefer before image)
                const latitude = beforeImageResult.metadata?.GPSLatitude?.toString() ||
                    afterImageResult.metadata?.GPSLatitude?.toString();
                const longitude = beforeImageResult.metadata?.GPSLongitude?.toString() ||
                    afterImageResult.metadata?.GPSLongitude?.toString();

                // Get image timestamp (prefer before image)
                const imageTimestamp = beforeImageResult.metadata?.DateTimeOriginal ||
                    afterImageResult.metadata?.DateTimeOriginal;

                // Create submission record
                const [submission] = await db.insert(poiSubmissions)
                    .values({
                        userId,
                        beforeImageCid,
                        afterImageCid,
                        latitude: latitude || null,
                        longitude: longitude || null,
                        submissionTimestamp: new Date(),
                        imageTimestamp: imageTimestamp ? new Date(imageTimestamp) : null,
                    })
                    .returning();

                res.status(200).json({
                    success: true,
                    data: {
                        submissionId: submission.id,
                        status: submission.status,
                    },
                });
            } catch (error) {
                console.error('Error processing submission:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error processing submission',
                });
            }
        });
    } catch (error) {
        console.error('Error in submitPoI:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
};


// Get pending submissions with pagination
export const getPendingSubmissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count of pending submissions
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(poiSubmissions)
            .where(eq(poiSubmissions.status, 'PENDING'));

        // Get paginated pending submissions
        const submissions = await db.query.poiSubmissions.findMany({
            where: eq(poiSubmissions.status, 'PENDING'),
            limit,
            offset,
            orderBy: desc(poiSubmissions.createdAt),
            with: {
                user: true,
            },
        });

        res.status(200).json({
            success: true,
            data: {
                submissions,
                pagination: {
                    total: Number(count),
                    page,
                    limit,
                    totalPages: Math.ceil(Number(count) / limit),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching pending submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
};

// Verify a submission
export const verifySubmission = async (req: Request, res: Response): Promise<void> => {
    try {
        const { submissionId } = req.params;
        const { status, notes } = req.body as { status: typeof submissionStatusEnum.enumValues[number]; notes?: string };
        const validatorId = req.user?.id;

        if (!submissionId || !status || !validatorId) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields',
            });
            return;
        }

        if (!Object.values(submissionStatusEnum.enumValues).includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid status value',
            });
            return;
        }

        const [updatedSubmission] = await db
            .update(poiSubmissions)
            .set({
                status,
                verifiedBy: validatorId,
                verificationTimestamp: new Date(),
                verificationNotes: notes,
                isEligibleForClaim: status === 'VERIFIED',
                updatedAt: new Date(),
            })
            .where(eq(poiSubmissions.id, submissionId))
            .returning();

        if (!updatedSubmission) {
            res.status(404).json({
                success: false,
                message: 'Submission not found',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: updatedSubmission,
        });
    } catch (error) {
        console.error('Error verifying submission:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
};

// Get submission verification status
export const getSubmissionStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { submissionId } = req.params;
        const user = req.user as User;

        const submission = await db.query.poiSubmissions.findFirst({
            where: eq(poiSubmissions.id, submissionId),
        });

        if (!submission) {
            res.status(404).json({
                success: false,
                message: 'Submission not found',
            });
            return;
        }

        // Only allow users to view their own submissions unless they're validators/admins
        if (submission.userId !== user.id && user.role === 'USER') {
            res.status(403).json({
                success: false,
                message: 'Unauthorized to view this submission',
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: submission,
        });
    } catch (error) {
        console.error('Error fetching submission status:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
};

// Interface for POI query parameters
interface PoiQueryParams {
    status?: typeof submissionStatusEnum.enumValues[number];
    userId?: string;
    startDate?: string;
    endDate?: string;
    isEligibleForClaim?: boolean;
    sortBy?: 'createdAt' | 'submissionTimestamp' | 'verificationTimestamp';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

// Get POIs with filtering and pagination
export const getPois = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            status,
            userId,
            startDate,
            endDate,
            isEligibleForClaim,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            page = 1,
            limit = 10,
        } = req.query as PoiQueryParams;

        // Build where conditions
        const whereConditions: SQL[] = [];

        if (status) {
            whereConditions.push(eq(poiSubmissions.status, status));
        }

        if (userId) {
            whereConditions.push(eq(poiSubmissions.userId, userId));
        }

        if (startDate) {
            whereConditions.push(sql`${poiSubmissions.submissionTimestamp} >= ${new Date(startDate)}`);
        }

        if (endDate) {
            whereConditions.push(sql`${poiSubmissions.submissionTimestamp} <= ${new Date(endDate)}`);
        }

        if (typeof isEligibleForClaim === 'boolean') {
            whereConditions.push(eq(poiSubmissions.isEligibleForClaim, isEligibleForClaim));
        }

        // Calculate pagination
        const offset = (page - 1) * limit;

        // Get total count for pagination
        const [{ count }] = await db
            .select({ count: sql<number>`count(*)` })
            .from(poiSubmissions)
            .where(and(...whereConditions));

        // Build sort condition
        const sortColumn = {
            createdAt: poiSubmissions.createdAt,
            submissionTimestamp: poiSubmissions.submissionTimestamp,
            verificationTimestamp: poiSubmissions.verificationTimestamp,
        }[sortBy];

        // Get paginated results
        const submissions = await db.query.poiSubmissions.findMany({
            where: and(...whereConditions),
            limit,
            offset,
            orderBy: sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn),
            with: {
                user: true,
                verifier: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        ensName: true,
                    },
                },
            },
        });

        res.status(200).json({
            success: true,
            data: {
                submissions,
                pagination: {
                    total: Number(count),
                    page,
                    limit,
                    totalPages: Math.ceil(Number(count) / limit),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching POIs:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
        });
    }
}; 