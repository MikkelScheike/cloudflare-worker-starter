/**
 * Utilities for handling KV limit errors gracefully
 * Production-ready error handling and KV write optimization
 */

import { createKVLimitErrorResponse } from './error-responses.js';
import { getConfig } from './config.js';

/**
 * Check if an error is a KV limit exceeded error
 * @param {Error} error - The error to check
 * @returns {boolean} - True if it's a KV limit error
 */
export function isKVLimitError(error) {
  return error && error.message && error.message.includes('KV put() limit exceeded');
}

// Re-export the KV limit error response for backward compatibility
export { createKVLimitErrorResponse };/**
 * Safely perform a KV write operation with fallback
 * @param {Function} writeOperation - Function that performs the KV write
 * @param {string} operation - Description of the operation for logging
 * @returns {Promise<boolean>} - True if successful, false if failed due to limits
 */
export async function safeKVWrite(writeOperation, operation = 'KV write') {
  try {
    await writeOperation();
    return true;
  } catch (error) {
    if (isKVLimitError(error)) {
      console.warn(`KV write limit exceeded during ${operation}, skipping`);
      return false;
    } else {
      console.error(`Error during ${operation}:`, error);
      throw error; // Re-throw non-limit errors
    }
  }
}

/**
 * Create a rate-limited logger that reduces writes when approaching limits
 */
export class ThrottledLogger {
  constructor(env, maxLogsPerHour = null) {
    this.env = env;
    const config = getConfig(env);
    this.maxLogsPerHour = maxLogsPerHour || config.logging.maxLogsPerHour;
    this.logCount = 0;
    this.hourStart = Date.now();
  }

  async log(type, data, expirationTtl = null) {
    const config = getConfig(this.env);
    const ttl = expirationTtl || config.logging.auditLogTtl;
    const now = Date.now();
    
    // Reset counter every hour
    if (now - this.hourStart > 60 * 60 * 1000) {
      this.logCount = 0;
      this.hourStart = now;
    }

    // Skip logging if we've exceeded the hourly limit
    if (this.logCount >= this.maxLogsPerHour) {
      return false;
    }

    const success = await safeKVWrite(async () => {
      const key = `throttled_${type}_${now}_${Math.random().toString(36).substr(2, 9)}`;
      await this.env.AUDIT.put(key, JSON.stringify({
        timestamp: new Date().toISOString(),
        type,
        ...data
      }), { expirationTtl: ttl });
    }, `throttled log: ${type}`);

    if (success) {
      this.logCount++;
    }

    return success;
  }
}
