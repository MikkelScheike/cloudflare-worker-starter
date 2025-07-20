/**
 * Security audit and logging functions
 * Track security events, user actions, and system events for monitoring
 */

import { safeKVWrite } from './kv-utils.js';
import { getConfig } from './config.js';

export async function logSecurityEvent(env, event, details = {}) {
  try {
    // Only log if AUDIT namespace exists
    if (!env.AUDIT) {
      console.log(`Security event: ${event}`, details);
      return;
    }
    
    const config = getConfig(env);
    const now = new Date().toISOString();
    const logEntry = {
      event,
      details,
      time: now,
      ip: details.ip || null
    };
    
    // Use safe KV write to handle limits gracefully
    await safeKVWrite(async () => {
      await env.AUDIT.put(
        `audit:${now}:${Math.random().toString(36).slice(2, 8)}`,
        JSON.stringify(logEntry),
        { expirationTtl: config.logging.auditLogTtl }
      );
    }, `security event: ${event}`);
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw error to avoid breaking the main flow
  }
}

/**
 * Log user action for audit trail
 * @param {object} env - Environment object
 * @param {string} action - Action performed
 * @param {string} userId - User identifier (email/ID)
 * @param {object} metadata - Additional data
 */
export async function logUserAction(env, action, userId, metadata = {}) {
  await logSecurityEvent(env, 'user_action', {
    action,
    userId,
    ...metadata
  });
}

/**
 * Log system event
 * @param {object} env - Environment object
 * @param {string} event - System event
 * @param {object} metadata - Additional data
 */
export async function logSystemEvent(env, event, metadata = {}) {
  await logSecurityEvent(env, 'system_event', {
    event,
    ...metadata
  });
}
