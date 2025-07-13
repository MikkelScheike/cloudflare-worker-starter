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

// Common disposable/temporary email domains
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // 10MinuteMail and similar
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'mailinator.com', 'mailinator.net', 'mailinator2.com',
  'tempmail.org', 'temp-mail.org', 'temporary-mail.net',
  'throwaway.email', 'trashmail.com', 'yopmail.com',
  'maildrop.cc', 'sharklasers.com', 'grr.la',
  'dispostable.com', 'tempail.com', 'getnada.com',
  
  // Fake/test domains
  'example.com', 'example.org', 'test.com', 'test.org',
  'fake.com', 'invalid.com', 'localhost.com',
  
  // Common spam domains
  'spam4.me', 'spamgourmet.com', 'spamhole.com',
  'emailondeck.com', 'fakeinbox.com', 'mytrashmail.com',
  'no-spam.ws', 'nospam.ze.tc', 'deadaddress.com',
  
  // More disposable services
  'mohmal.com', 'rootfest.net', 'anonymbox.com',
  'bugmenot.com', 'deadfake.cf', 'mailcatch.com',
  'mailscrap.com', 'us.to', 'mvrht.com',
  
  // Single-letter domains (often suspicious)
  'a.com', 'b.com', 'c.com', 'd.com', 'e.com', 'f.com', 'g.com',
  'h.com', 'i.com', 'j.com', 'k.com', 'l.com', 'm.com', 'n.com',
  'o.com', 'p.com', 'q.com', 'r.com', 's.com', 't.com', 'u.com',
  'v.com', 'w.com', 'x.com', 'y.com', 'z.com'
]);

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
 * @returns {object} - { isValid: boolean, reason?: string }
 */
export function validateEmailLegitimacy(email) {
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

  // Check against disposable email domains
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, reason: 'Disposable email address not allowed' };
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(emailLower)) {
      return { isValid: false, reason: 'Email pattern not allowed' };
    }
  }

  // Check domain patterns
  if (domain.length < 4) {
    return { isValid: false, reason: 'Domain too short' };
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
