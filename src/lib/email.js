/**
 * Generic email sending utility for Brevo (Sendinblue) API
 * Usage: await sendEmail(env, toEmail, subject, body[, senderName, tags])
 */

/**
 * Send an email using Brevo API
 * @param {Object} env - Environment with BREVO_API_KEY and SENDER_EMAIL
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body (plain text)
 * @param {string} [senderName] - Optional sender name (default: "Your App")
 * @param {string|string[]} [tags] - Optional tag or array of tags
 * @returns {Promise<boolean>} - True if sent, false if error
 */
export async function sendEmail(env, toEmail, subject, body, senderName = "Your App", tags = undefined) {
  try {
    const sanitizedSubject = String(subject).replace(/[\r\n]/g, "").slice(0, 200);
    const sanitizedBody = String(body).slice(0, 2000);
    let tagArr = [];
    if (tags) {
      tagArr = Array.isArray(tags) ? tags : [tags];
      tagArr = tagArr.map(t => String(t).replace(/[^a-zA-Z0-9\-\.\_\:\/]/g, "").slice(0, 50));
    }
    const brevoUrl = "https://api.brevo.com/v3/smtp/email";
    const emailPayload = {
      sender: {
        name: senderName,
        email: env.SENDER_EMAIL
      },
      to: [{ email: toEmail }],
      subject: sanitizedSubject,
      textContent: sanitizedBody
    };
    if (tagArr.length > 0) {
      emailPayload.tags = tagArr;
    }
    const response = await fetch(brevoUrl, {
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
      console.error(`Brevo API error: ${response.status} - ${error}`);
      return false;
    }
    console.log(`Email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}
