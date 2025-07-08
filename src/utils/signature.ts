import { verifyMessage } from 'viem';
import { generateNonce } from 'siwe';

// Generate a random nonce for authentication
export const generateAuthNonce = (): string => {
    return generateNonce();
};

// Verify a message signature from an Ethereum wallet
export const verifySignature = async (
    address: `0x${string}`,
    message: string,
    signature: `0x${string}`
): Promise<boolean> => {
    try {
        const valid = await verifyMessage({
            address,
            message,
            signature,
        });
        return valid;
    } catch (error) {
        console.error('Error verifying signature:', error);
        return false;
    }
};

// Create authentication message for signing
export const createAuthMessage = (
    address: string,
    nonce: string,
    chainId: number = 1 // Default to Ethereum Mainnet
): string => {
    const message = `Please sign this message to authenticate with DeCleanup Network\n\nNonce: ${nonce}`;
    return message;
}; 