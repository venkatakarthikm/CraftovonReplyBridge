/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a base64 string: iv(12) + tag(16) + ciphertext, all concatenated.
 */
export declare function encrypt(plaintext: string): string;
/**
 * Decrypt a base64 AES-256-GCM envelope produced by encrypt().
 * Throws on authentication failure (tampered ciphertext).
 */
export declare function decrypt(cipher: string): string;
//# sourceMappingURL=crypto.d.ts.map