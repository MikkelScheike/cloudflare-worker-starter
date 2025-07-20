/**
 * Provider-agnostic email sending utility
 * Supports multiple email providers: Brevo, SES, SMTP2GO, etc.
 * Usage: await sendEmail(env, toEmail, subject, body[, senderName, tags])
 */

// Email provider implementations
const emailProviders = {
  brevo: async (env, toEmail, subject, body, senderName, tags) => {
    const tagArr = tags ? (Array.isArray(tags) ? tags : [tags]) : [];
    const emailPayload = {
      sender: { name: senderName, email: env.SENDER_EMAIL },
      to: [{ email: toEmail }],
      subject,
      textContent: body,
      ...(tagArr.length > 0 && { tags: tagArr })
    };
    
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(emailPayload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brevo API error: ${response.status} - ${error}`);
    }
    return true;
  },

  ses: async (env, toEmail, subject, body, senderName, tags) => {
    // AWS SES implementation (requires AWS credentials)
    const message = {
      Source: `${senderName} <${env.SENDER_EMAIL}>`,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } }
      },
      ...(tags && { Tags: Array.isArray(tags) ? tags.map(t => ({ Name: 'category', Value: t })) : [{ Name: 'category', Value: tags }] })
    };

    // Note: This would require AWS SDK or custom signing for SES
    // Implementation depends on your AWS setup
    throw new Error("SES provider not fully implemented - please add your AWS SES logic here");
  },

  smtp2go: async (env, toEmail, subject, body, senderName, tags) => {
    const emailPayload = {
      api_key: env.SMTP2GO_API_KEY,
      to: [toEmail],
      sender: `${senderName} <${env.SENDER_EMAIL}>`,
      subject,
      text_body: body,
      ...(tags && { custom_headers: { 'X-Tags': Array.isArray(tags) ? tags.join(',') : tags } })
    };

    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SMTP2GO API error: ${response.status} - ${error}`);
    }
    return true;
  }
};

/**
 * Send an email using the configured provider
 * @param {Object} env - Environment with provider credentials and SENDER_EMAIL
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (plain text)
 * @param {string} [senderName] - Optional sender name (default: "Your App")
 * @param {string|string[]} [tags] - Optional tag or array of tags
 * @returns {Promise<boolean>} - True if sent, false if error
 */
export async function sendEmail(env, toEmail, subject, body, senderName = "Your App", tags = undefined) {
  try {
    // Input sanitization
    const sanitizedSubject = String(subject).replace(/[\r\n]/g, "").slice(0, 200);
    const sanitizedBody = String(body).slice(0, 2000);
    const sanitizedTags = tags ? (Array.isArray(tags) ? tags : [tags]).map(t => 
      String(t).replace(/[^a-zA-Z0-9\-\.\_\:\/]/g, "").slice(0, 50)
    ) : undefined;

    // Determine provider from environment (default to brevo for backward compatibility)
    const provider = env.EMAIL_PROVIDER || 'brevo';
    
    if (!emailProviders[provider]) {
      throw new Error(`Unknown email provider: ${provider}. Supported: ${Object.keys(emailProviders).join(', ')}`);
    }

    await emailProviders[provider](env, toEmail, sanitizedSubject, sanitizedBody, senderName, sanitizedTags);
    console.log(`Email sent successfully to ${toEmail} via ${provider}`);
    return true;

  } catch (error) {
    console.error(`Email sending failed: ${error.message}`);
    return false;
  }
}

/**
 * Add a custom email provider
 * @param {string} name - Provider name
 * @param {Function} implementation - Provider function (env, toEmail, subject, body, senderName, tags) => Promise<boolean>
 */
export function addEmailProvider(name, implementation) {
  emailProviders[name] = implementation;
}
