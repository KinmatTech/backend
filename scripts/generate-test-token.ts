import { generateToken } from '../src/utils/jwt';
import { db } from '../src/db';
import { users, authSessions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// I added this for testing purposes
// So I can generate a test token for the user

async function main() {
    
    const testWalletAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
    const userId = '123e4567-e89b-12d3-a456-426614174000';

    // Generate a test token
    const token = generateToken({
        userId,
        walletAddress: testWalletAddress
    });

    // Create or update test user
    const existingUser = await db.query.users.findFirst({
        where: eq(users.walletAddress, testWalletAddress),
    });

    if (!existingUser) {
        await db.insert(users).values({
            id: userId,
            walletAddress: testWalletAddress,
        });
    }

    // Create session
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

    await db.insert(authSessions).values({
        userId,
        token,
        expiresAt: expiryDate,
        active: true,
    });

    console.log('Test JWT Token:');
    console.log(token);
    console.log('\nUser and session created successfully!');
}

main().catch(console.error); 