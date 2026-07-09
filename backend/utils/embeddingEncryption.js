/**
 * Embedding Encryption Utility
 *
 * Provides AES-256-GCM encryption/decryption for face embeddings.
 * Face embeddings are sensitive biometric data and must be encrypted at rest.
 *
 * Security Features:
 * - AES-256-GCM (Galois/Counter Mode) for authenticated encryption
 * - Unique IV (Initialization Vector) for each encryption
 * - Authentication tag to prevent tampering
 * - Key derived from environment variable or secure key management
 *
 * @module embeddingEncryption
 */

const crypto = require('crypto');

// Algorithm configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment or generate default
 *
 * IMPORTANT: In production, use a secure key management service (AWS KMS, Azure Key Vault, etc.)
 * The key should be stored in environment variables, not hardcoded.
 *
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
  const envKey = process.env.FR_EMBEDDING_ENCRYPTION_KEY;

  if (envKey) {
    // Use provided key from environment
    if (envKey.length !== 64) {
      throw new Error('FR_EMBEDDING_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(envKey, 'hex');
  }

  // Development fallback - generate deterministic key from app secret
  // NEVER use this in production!
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FR_EMBEDDING_ENCRYPTION_KEY must be set in production');
  }

  const appSecret = process.env.JWT_SECRET || 'dev-secret-key';
  return crypto.createHash('sha256').update(appSecret + '-fr-embeddings').digest();
}

/**
 * Encrypt face embedding array
 *
 * @param {Array<number>} embedding - Face embedding (128-d float array from Human library)
 * @returns {string} Encrypted embedding as hex string format: iv:authTag:encryptedData
 * @throws {Error} If embedding is invalid or encryption fails
 *
 * @example
 * const embedding = [0.123, -0.456, 0.789, ...]; // 128 floats
 * const encrypted = encryptEmbedding(embedding);
 * // Returns: "a1b2c3d4...iv:e5f6g7h8...tag:i9j0k1l2...data"
 */
function encryptEmbedding(embedding) {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Embedding must be a non-empty array');
  }

  try {
    // Convert embedding array to JSON string, then to buffer
    const embeddingJSON = JSON.stringify(embedding);
    const embeddingBuffer = Buffer.from(embeddingJSON, 'utf8');

    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Get encryption key
    const key = getEncryptionKey();

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(embeddingBuffer),
      cipher.final()
    ]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Return format: iv:authTag:encryptedData (all in hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    throw new Error(`Failed to encrypt embedding: ${error.message}`);
  }
}

/**
 * Decrypt face embedding
 *
 * @param {string} encryptedEmbedding - Encrypted embedding string (format: iv:authTag:encryptedData)
 * @returns {Array<number>} Decrypted face embedding (128-d float array)
 * @throws {Error} If decryption fails or data is tampered
 *
 * @example
 * const encrypted = "a1b2c3d4...iv:e5f6g7h8...tag:i9j0k1l2...data";
 * const embedding = decryptEmbedding(encrypted);
 * // Returns: [0.123, -0.456, 0.789, ...] // 128 floats
 */
function decryptEmbedding(encryptedEmbedding) {
  if (!encryptedEmbedding || typeof encryptedEmbedding !== 'string') {
    throw new Error('Encrypted embedding must be a non-empty string');
  }

  try {
    // Parse the encrypted format: iv:authTag:encryptedData
    const parts = encryptedEmbedding.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted embedding format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    // Convert from hex back to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length');
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid auth tag length');
    }

    // Get encryption key
    const key = getEncryptionKey();

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final() // This will throw if authentication fails (tampered data)
    ]);

    // Convert back from JSON string to array
    const embeddingJSON = decrypted.toString('utf8');
    const embedding = JSON.parse(embeddingJSON);

    if (!Array.isArray(embedding)) {
      throw new Error('Decrypted data is not an array');
    }

    return embedding;
  } catch (error) {
    // Authentication failure or decryption error
    throw new Error(`Failed to decrypt embedding: ${error.message}`);
  }
}

/**
 * Generate a new encryption key (for initial setup)
 *
 * Use this to generate a secure random key for FR_EMBEDDING_ENCRYPTION_KEY
 *
 * @returns {string} 64-character hex string (32 bytes)
 *
 * @example
 * const newKey = generateKey();
 * console.log('Add to .env file:');
 * console.log(`FR_EMBEDDING_ENCRYPTION_KEY=${newKey}`);
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

module.exports = {
  encryptEmbedding,
  decryptEmbedding,
  generateKey,
};
