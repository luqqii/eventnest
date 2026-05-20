const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
// Key must be 32 bytes (256 bits).
// We hash process.env.COOKIE_ENCRYPTION_KEY or a fallback to ensure we get a cryptographically strong 32-byte key.
const ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY
  ? crypto.createHash("sha256").update(process.env.COOKIE_ENCRYPTION_KEY).digest()
  : crypto.createHash("sha256").update("eventnest_default_cookie_encryption_key_secret_2026").digest();

const IV_LENGTH = 16; // AES block size is 16 bytes

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text
 * @returns {string} iv:ciphertext (hex format)
 */
function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt an iv:ciphertext string using AES-256-CBC
 * @param {string} text
 * @returns {string|null} original text or null on failure
 */
function decrypt(text) {
  if (!text) return text;
  try {
    const textParts = text.split(":");
    if (textParts.length < 2) return null;
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[crypto] Decryption failed:", err.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
