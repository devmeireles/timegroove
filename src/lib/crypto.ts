import "server-only";

import crypto from "crypto";
import { serverEnv } from "@/lib/env";

/**
 * Encrypts sensitive data (like tokens) using AES-256-GCM.
 * Returns a JSON string containing the encrypted data, IV, and auth tag.
 */
export function encryptToken(plaintext: string): string {
  const key = crypto
    .createHash("sha256")
    .update(serverEnv.encryptionKey)
    .digest();

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    encrypted,
    authTag: authTag.toString("hex"),
  });
}

/**
 * Decrypts a token that was encrypted with encryptToken().
 */
export function decryptToken(encrypted: string): string {
  const key = crypto
    .createHash("sha256")
    .update(serverEnv.encryptionKey)
    .digest();

  const { iv, encrypted: encryptedData, authTag } = JSON.parse(
    encrypted,
  ) as {
    iv: string;
    encrypted: string;
    authTag: string;
  };

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
