/**
 * Configuration system for Cloudflare Worker
 * Centralizes all configurable values with environment variable support
 */

/**
 * Get configuration values from environment with fallback defaults
 * @param {object} env - Environment variables
 * @returns {object} - Configuration object
 */
export function getConfig(env) {
  return {
    // Session Configuration
    session: {
      maxAge: parseInt(env.SESSION_MAX_AGE) || 604800000, // 7 days in milliseconds
      timeout: parseInt(env.SESSION_TIMEOUT) || 1800000, // 30 minutes in milliseconds
      expirationTtl: parseInt(env.SESSION_EXPIRATION_TTL) || 604800 // 7 days in seconds
    },
    
    // Rate Limiting Configuration
    rateLimit: {
      contact: {
        limit: parseInt(env.RATE_LIMIT_CONTACT_LIMIT) || 5,
        window: parseInt(env.RATE_LIMIT_CONTACT_WINDOW) || 900000 // 15 minutes
      },
      signup: {
        limit: parseInt(env.RATE_LIMIT_SIGNUP_LIMIT) || 3,
        window: parseInt(env.RATE_LIMIT_SIGNUP_WINDOW) || 3600000 // 1 hour
      },
      login: {
        limit: parseInt(env.RATE_LIMIT_LOGIN_LIMIT) || 10,
        window: parseInt(env.RATE_LIMIT_LOGIN_WINDOW) || 900000 // 15 minutes
      }
    },
    
    // Logging Configuration
    logging: {
      maxLogsPerHour: parseInt(env.MAX_LOGS_PER_HOUR) || 100,
      auditLogTtl: parseInt(env.AUDIT_LOG_TTL) || 2592000, // 30 days in seconds
      emailValidationTtl: parseInt(env.EMAIL_VALIDATION_LOG_TTL) || 2592000 // 30 days in seconds
    },
    
    // Email Validation Configuration
    emailValidation: {
      cacheDuration: parseInt(env.EMAIL_CACHE_DURATION) || 86400000, // 24 hours in milliseconds
      cacheRefreshInterval: parseInt(env.EMAIL_CACHE_REFRESH_INTERVAL) || 3600000 // 1 hour
    },
    
    // Security Configuration
    security: {
      honeypotFieldName: env.HONEYPOT_FIELD_NAME || 'website',
      turnstileEnabled: env.TURNSTILE_SECRET_KEY ? true : false
    },
    
    // Performance Configuration
    performance: {
      kvWriteRetryDelay: parseInt(env.KV_WRITE_RETRY_DELAY) || 1000, // 1 second
      maxKvWriteRetries: parseInt(env.MAX_KV_WRITE_RETRIES) || 3
    }
  };
}

/**
 * Validate required environment variables
 * @param {object} env - Environment variables
 * @returns {Array} - Array of missing required variables
 */
export function validateRequiredEnv(env) {
  const required = [
    'SESSION_SECRET',
    'BASE_URL'
  ];
  
  const missing = required.filter(key => !env[key]);
  return missing;
}

/**
 * Get configuration value with type conversion and validation
 * @param {object} env - Environment variables
 * @param {string} key - Environment variable key
 * @param {*} defaultValue - Default value
 * @param {string} type - Expected type ('string', 'number', 'boolean')
 * @returns {*} - Parsed and validated value
 */
export function getEnvValue(env, key, defaultValue, type = 'string') {
  const value = env[key];
  
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  
  switch (type) {
    case 'number':
      const num = parseInt(value);
      return isNaN(num) ? defaultValue : num;
      
    case 'boolean':
      return value === 'true' || value === '1';
      
    case 'string':
    default:
      return value;
  }
}
