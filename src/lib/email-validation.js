/**
 * Email validation utilities to block spam, disposable, and suspicious email addresses
 * Production-tested patterns to prevent fake signups and bot registrations
 */

/**
 * Log email validation events for audit purposes
 * @param {object} env - Environment object with KV bindings
 * @param {string} email - Email that was validated
 * @param {object} result - Validation result
 * @param {string} ip - User's IP address
 * @param {string} action - Action context (signup, forgot_password, etc.)
 */
export async function logEmailValidation(env, email, result, ip, action = 'unknown') {
  try {
    if (!env.AUDIT) return;
    
    // Only log blocked emails to reduce KV writes (valid emails don't need logging)
    if (result.isValid) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'email_validation',
      action,
      email: email.toLowerCase(),
      ip,
      result: {
        isValid: result.isValid,
        reason: result.reason || null
      },
      domain: email.split('@')[1]?.toLowerCase() || null
    };
    
    const key = `email_validation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.AUDIT.put(key, JSON.stringify(logEntry), { expirationTtl: 30 * 24 * 60 * 60 }); // 30 days
  } catch (error) {
    if (error.message && error.message.includes('KV put() limit exceeded')) {
      console.warn('KV write limit exceeded, skipping email validation log');
    } else {
      console.error('Failed to log email validation:', error);
    }
  }
}

// Default disposable email domains (fallback if external fetch fails)
const FALLBACK_DISPOSABLE_DOMAINS = new Set([
  // Most common disposable services
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'tempmail.org', 'throwaway.email', 'yopmail.com', 'maildrop.cc',
  'example.com', 'test.com', 'fake.com', 'localhost.com'
]);

// Cache for the external disposable domains list
let DISPOSABLE_DOMAINS_CACHE = null;
let CACHE_TIMESTAMP = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetches the latest disposable email domains from external repository
 * @param {object} env - Environment object
 * @returns {Promise<Set>} - Set of disposable domains
 */
async function fetchDisposableDomains(env) {
  try {
    // Check if we have a valid cache
    const now = Date.now();
    if (DISPOSABLE_DOMAINS_CACHE && (now - CACHE_TIMESTAMP) < CACHE_DURATION) {
      return DISPOSABLE_DOMAINS_CACHE;
    }

    // Try to get cached domains from KV storage first
    let cachedDomains = null;
    if (env.SESSIONS) {
      try {
        const kvCache = await env.SESSIONS.get('disposable_domains_cache');
        if (kvCache) {
          const parsed = JSON.parse(kvCache);
          if ((now - parsed.timestamp) < CACHE_DURATION) {
            DISPOSABLE_DOMAINS_CACHE = new Set(parsed.domains);
            CACHE_TIMESTAMP = parsed.timestamp;
            return DISPOSABLE_DOMAINS_CACHE;
          }
        }
      } catch (kvError) {
        console.warn('Failed to get cached domains from KV:', kvError.message);
      }
    }

    // Fetch from external source
    const response = await fetch(
      'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf',
      {
        headers: {
          'User-Agent': 'Cloudflare-Worker-Email-Validator/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const domains = text
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line && !line.startsWith('#') && line.includes('.'))
      .filter(domain => {
        // Basic domain validation
        return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain);
      });

    // Update cache
    DISPOSABLE_DOMAINS_CACHE = new Set(domains);
    CACHE_TIMESTAMP = now;

    // Store in KV for persistence across worker instances
    if (env.SESSIONS) {
      try {
        await env.SESSIONS.put('disposable_domains_cache', JSON.stringify({
          domains: Array.from(DISPOSABLE_DOMAINS_CACHE),
          timestamp: CACHE_TIMESTAMP
        }), { expirationTtl: Math.floor(CACHE_DURATION / 1000) });
      } catch (kvError) {
        console.warn('Failed to cache domains in KV:', kvError.message);
      }
    }

    console.log(`Updated disposable domains cache: ${DISPOSABLE_DOMAINS_CACHE.size} domains`);
    return DISPOSABLE_DOMAINS_CACHE;

  } catch (error) {
    console.warn('Failed to fetch disposable domains:', error.message);
    
    // Return cached version if available, otherwise fallback
    if (DISPOSABLE_DOMAINS_CACHE) {
      return DISPOSABLE_DOMAINS_CACHE;
    }
    
    return FALLBACK_DISPOSABLE_DOMAINS;
  }
}

// Suspicious patterns in email addresses
const SUSPICIOUS_PATTERNS = [
  /^[a-z]{1,3}\d{4,}@/i,           // Short name + many numbers (e.g., abc12345@)
  /^\d{6,}@/,                      // Starts with 6+ digits
  /^[a-z]+\d{10,}@/i,              // Name + 10+ digits
  /^test\d*@/i,                    // Starts with "test"
  /^spam\d*@/i,                    // Starts with "spam"
  /^fake\d*@/i,                    // Starts with "fake"
  /^temp\d*@/i,                    // Starts with "temp"
  /^noreply\d*@/i,                 // Starts with "noreply"
  /^info\d*@/i,                    // Generic "info" emails
  /^[a-z]{1,2}@/i,                 // Very short usernames (1-2 chars)
  /^[a-z]+[._-][a-z]+[._-][a-z]+@/i, // Multiple separators (often bots)
  /\+.*\+.*@/,                     // Multiple + signs
  /\.{2,}/,                        // Multiple consecutive dots
  /^.*\.(ru|tk|ml|ga|cf)$/i        // Suspicious TLDs
];

/**
 * Validates if an email address is legitimate (not spam/disposable)
 * @param {string} email - Email address to validate
 * @param {object} env - Environment object for fetching disposable domains
 * @returns {Promise<object>} - { isValid: boolean, reason?: string }
 */
export async function validateEmailLegitimacy(email, env) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, reason: 'Invalid email format' };
  }

  const emailLower = email.toLowerCase().trim();
  
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return { isValid: false, reason: 'Invalid email format' };
  }

  // Extract domain
  const domain = emailLower.split('@')[1];
  if (!domain) {
    return { isValid: false, reason: 'Invalid domain' };
  }

  // Get up-to-date disposable email domains list
  const disposableDomains = await fetchDisposableDomains(env);
  
  // Check against disposable email domains
  if (disposableDomains.has(domain)) {
    return { isValid: false, reason: 'Disposable email address not allowed' };
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(emailLower)) {
      return { isValid: false, reason: 'Email pattern not allowed' };
    }
  }

  // Check for domains with only numbers
  if (/^\d+\.\w+$/.test(domain)) {
    return { isValid: false, reason: 'Numeric domains not allowed' };
  }

  // Check for domains without proper TLD
  const parts = domain.split('.');
  if (parts.length < 2 || parts[parts.length - 1].length < 2) {
    return { isValid: false, reason: 'Invalid domain structure' };
  }

  // All checks passed
  return { isValid: true };
}

/**
 * Get a user-friendly error message for email validation failures
 * @param {string} reason - The validation failure reason
 * @returns {string} - User-friendly error message
 */
export function getEmailErrorMessage(reason) {
  const messages = {
    'Invalid email format': 'Please enter a valid email address.',
    'Invalid domain': 'Please enter a valid email address.',
    'Disposable email address not allowed': 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
    'Email pattern not allowed': 'This email format is not allowed. Please use a different email address.',
    'Domain too short': 'Please use an email with a valid domain name.',
    'Numeric domains not allowed': 'Please use an email with a standard domain name.',
    'Invalid domain structure': 'Please enter a valid email address with a proper domain.'
  };

  return messages[reason] || 'Please enter a valid email address.';
}
