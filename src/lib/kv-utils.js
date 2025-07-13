/**
 * Utilities for handling KV limit errors gracefully
 * Production-ready error handling and KV write optimization
 */

/**
 * Check if an error is a KV limit exceeded error
 * @param {Error} error - The error to check
 * @returns {boolean} - True if it's a KV limit error
 */
export function isKVLimitError(error) {
  return error && error.message && error.message.includes('KV put() limit exceeded');
}

/**
 * Create a user-friendly error response for KV limit exceeded
 * @param {string} userMessage - Optional custom message for users
 * @returns {Response} - Error response
 */
export function createKVLimitErrorResponse(userMessage = null) {
  const defaultMessage = `
    <div style="
      padding: 40px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      max-width: 600px; 
      margin: 50px auto; 
      background: #fff; 
      border-radius: 12px; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      border-left: 4px solid #f59e0b;
    ">
      <h2 style="color: #dc2626; margin: 0 0 20px;">⚠️ Service Temporarily Unavailable</h2>
      <p style="color: #374151; line-height: 1.5; margin: 0 0 20px;">
        Our service is experiencing high usage and has temporarily reached its daily write limit. 
        This is a temporary limitation that will reset automatically.
      </p>
      <p style="color: #374151; line-height: 1.5; margin: 0 0 20px;">
        <strong>What this means:</strong><br>
        • Core functionality is still active<br>
        • Some features may be temporarily limited<br>
        • No data has been lost
      </p>
      <p style="color: #374151; line-height: 1.5; margin: 0 0 30px;">
        <strong>What to do:</strong><br>
        Please try again in a few hours. This limit resets automatically every 24 hours.
      </p>
      <div style="text-align: center;">
        <a href="/" style="
          background: #2563eb; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          display: inline-block;
          font-weight: 500;
        ">← Back to Home</a>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0; text-align: center;">
        If this persists, please contact support. We're working on upgrading our infrastructure.
      </p>
    </div>
  `;

  return new Response(userMessage || defaultMessage, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": "3600" // Suggest retry after 1 hour
    }
  });
}

/**
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
  constructor(env, maxLogsPerHour = 100) {
    this.env = env;
    this.maxLogsPerHour = maxLogsPerHour;
    this.logCount = 0;
    this.hourStart = Date.now();
  }

  async log(type, data, expirationTtl = 86400) {
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
      }), { expirationTtl });
    }, `throttled log: ${type}`);

    if (success) {
      this.logCount++;
    }

    return success;
  }
}
