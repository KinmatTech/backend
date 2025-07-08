import type { Request, Response } from 'express';
import { db } from '../db';
import { users, socialPosts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { TwitterApi } from 'twitter-api-v2';
import { config } from '../config';

// Twitter OAuth configuration
const twitterClient = new TwitterApi({
    clientId: config.TWITTER_CLIENT_ID,
    clientSecret: config.TWITTER_CLIENT_SECRET,
});

export const connectX = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code, state } = req.query;

        // Handle callback
        if (code && state) {
            // Find user by state
            const user = await db.query.users.findFirst({
                where: eq(users.twitterState, state as string),
            });

            if (!user?.twitterCodeVerifier) {
                res.status(400).json({ error: 'Invalid state parameter' });
                return;
            }

            // Exchange the code for access token
            const { accessToken, refreshToken } = await twitterClient.loginWithOAuth2({
                code: code as string,
                codeVerifier: user.twitterCodeVerifier,
                redirectUri: config.TWITTER_CALLBACK_URL,
            });

            // Get user info
            const userClient = new TwitterApi(accessToken);
            const { data: userInfo } = await userClient.v2.me();

            // Update user with Twitter credentials
            await db.update(users)
                .set({
                    twitterHandle: userInfo.username,
                    twitterAccessToken: accessToken,
                    twitterRefreshToken: refreshToken,
                    twitterState: null,
                    twitterCodeVerifier: null,
                })
                .where(eq(users.id, user.id));

            // Show success page
            res.send(`
                <html>
                    <body>
                        <h1>Twitter Connected Successfully!</h1>
                        <p>You can close this window and return to the app.</p>
                        <p>Connected Twitter handle: @${userInfo.username}</p>
                    </body>
                </html>
            `);
            return;
        }

        // Initial connection request
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Generate authorization URL
        const { url, codeVerifier, state: newState } = twitterClient.generateOAuth2AuthLink(
            config.TWITTER_CALLBACK_URL,
            { scope: ['tweet.read', 'tweet.write', 'users.read'] }
        );

        // Store state and code verifier
        await db.update(users)
            .set({
                twitterState: newState,
                twitterCodeVerifier: codeVerifier,
            })
            .where(eq(users.id, userId));

        res.json({ 
            success: true,
            data: {
                authUrl: url
            }
        });
    } catch (error) {
        console.error('Error connecting Twitter account:', error);
        const errorMessage = 'Failed to connect Twitter account';
        if (req.query.code) {
            res.send(`
                <html>
                    <body>
                        <h1>Error Connecting Twitter</h1>
                        <p>${errorMessage}</p>
                        <p>Please try again.</p>
                    </body>
                </html>
            `);
        } else {
            res.status(500).json({ error: errorMessage });
        }
    }
};

export const shareX = async (req: Request, res: Response): Promise<void> => {
    try {
        const { impactLevel } = req.body;
        const userId = req.user?.id;

        if (!impactLevel || !userId) {
            res.status(400).json({ error: 'Missing required parameters' });
            return;
        }

        // Get user's Twitter credentials
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user?.twitterAccessToken) {
            res.status(400).json({ error: 'Twitter account not connected' });
            return;
        }

        // Determine post type and content
        let postType: string;
        let content: string;
        const referralLink = `https://decleanup.xyz/ref/${user.walletAddress}`;

        if (impactLevel === 1) {
            postType = 'first_claim';
            content = `🚀 I just started my #DeCleanup journey! 🌱 Claimed my first Impact Product and making real-world cleanups count on-chain. Join the movement & earn rewards! 💚\n\n👉 ${referralLink}`;
        } else if (impactLevel === 10) {
            postType = 'final_level';
            content = `🎉 Mission Complete! I just finished all 10 levels of my #DeCleanup journey! 🌍♻️\n\nExcited for what's next – join the movement and start your own impact journey!\n\n👉 ${referralLink}`;
        } else {
            postType = 'level_up';
            content = `🔥 Level up! Just upgraded my DeCleanup Impact Product!\n\nMy cleanups are tokenized, tracked, and making a difference. Let's clean up together! ♻️\n\n👉 ${referralLink}`;
        }

        // Create Twitter client with user's access token
        const userClient = new TwitterApi(user.twitterAccessToken);

        // Post tweet
        const tweet = await userClient.v2.tweet(content);

        // Save post record
        await db.insert(socialPosts).values({
            userId,
            platform: 'twitter',
            postId: tweet.data.id,
            postType,
            impactLevel,
        });

        res.json({ success: true, tweetId: tweet.data.id });
    } catch (error) {
        console.error('Error sharing on Twitter:', error);
        res.status(500).json({ error: 'Failed to share on Twitter' });
    }
}; 