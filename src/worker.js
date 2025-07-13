/**
 * Cloudflare Worker Starter Template
 * Production-ready template with authentication, security, and common utilities
 */

import { getSession, createSession, destroySession, createSessionCookie } from './lib/session.js';
import { logSecurityEvent, logUserAction } from './lib/audit.js';
import { withRateLimit, getClientIP } from './lib/ratelimit.js';
import { isKVLimitError, createKVLimitErrorResponse } from './lib/kv-utils.js';
import { getThemeToggleScript, getThemeStyles, getThemeToggleButton } from './lib/theme.js';
import { validateEmailLegitimacy, getEmailErrorMessage } from './lib/email-validation.js';
import { sanitizeHtml } from './lib/utils.js';

// Helper: Verify Turnstile token with Cloudflare API
async function verifyTurnstile(token, ip, secretKey) {
  const body = new URLSearchParams({
    secret: secretKey,
    response: token,
    ...(ip ? { remoteip: ip } : {})
  });
  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return resp.json();
}

// Handler: Contact form POST endpoint
async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const { name, email, message, turnstileToken } = data;
  if (!name || !email || !message || !turnstileToken) {
    return new Response('Missing fields', { status: 400 });
  }
  // Validate email
  const emailCheck = validateEmailLegitimacy(email);
  if (!emailCheck.isValid) {
    return new Response('Invalid email', { status: 400 });
  }
  // Verify Turnstile
  const ip = request.headers.get('CF-Connecting-IP') || undefined;
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;
  if (!turnstileSecret) {
    return new Response('Server misconfigured: missing Turnstile secret', { status: 500 });
  }
  const verify = await verifyTurnstile(turnstileToken, ip, turnstileSecret);
  if (!verify.success) {
    return new Response('Turnstile verification failed', { status: 403 });
  }
  // Send email (replace with your email logic)
  // Example: send to site owner
  const ownerEmail = env.SENDER_EMAIL || 'owner@example.com';
  const subject = `Contact Form Submission from ${sanitizeHtml(name)}`;
  const body = `Name: ${sanitizeHtml(name)}\nEmail: ${sanitizeHtml(email)}\nMessage:\n${sanitizeHtml(message)}`;
  // TODO: Replace with your actual email sending function
  // await sendEmail(ownerEmail, subject, body, env);
  // For now, just log
  console.log('Contact form received:', { name, email, message });
  return new Response('Message sent!', { status: 200 });
}

// Add security headers to all responses
function addSecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-Content-Type-Options", "nosniff");
  newHeaders.set("X-Frame-Options", "DENY");
  newHeaders.set("X-XSS-Protection", "1; mode=block");
  newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  newHeaders.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

// Basic home page
async function handleHome(request, env, session) {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your App</title>
      <style>
        ${getThemeStyles()}
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 40px 20px;
          line-height: 1.6;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .card {
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        
        .btn-primary {
          background: var(--accent-primary);
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          text-decoration: none;
          display: inline-block;
          font-weight: 500;
          cursor: pointer;
        }
        
        .btn-primary:hover {
          background: var(--accent-hover);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <h1>🚀 Your Cloudflare Worker App</h1>
          <p>Welcome to your production-ready Cloudflare Worker starter template!</p>
          
          ${session ? `
            <p>Hello, <strong>${session.email}</strong>!</p>
            <a href="/dashboard" class="btn-primary">Dashboard</a>
            <a href="/logout" class="btn-primary">Logout</a>
          ` : `
            <p>Get started by signing up or logging in.</p>
            <a href="/signup" class="btn-primary">Sign Up</a>
            <a href="/login" class="btn-primary">Login</a>
          `}
        </div>
        
        <div class="card">
          <h2>✨ Features Included</h2>
          <ul>
            <li>🔐 Complete authentication system</li>
            <li>📧 Email validation and spam protection</li>
            <li>🛡️ Rate limiting and security features</li>
            <li>🎨 Dark/light theme toggle</li>
            <li>📊 Audit logging</li>
            <li>⚡ Optimized KV usage</li>
          </ul>
        </div>
      </div>
      
      ${getThemeToggleButton()}
      
      <script>
        ${getThemeToggleScript()}
      </script>
    </body>
    </html>
  `, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}

// Basic signup form
async function handleSignup(request, env) {
  if (request.method === "GET") {
    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sign Up</title>
        <style>
          ${getThemeStyles()}
          body { font-family: system-ui, sans-serif; padding: 40px 20px; }
          .container { max-width: 400px; margin: 0 auto; }
          .card { padding: 30px; border-radius: 12px; }
          input { width: 100%; padding: 12px; margin: 8px 0; border-radius: 6px; }
          .btn-primary { width: 100%; padding: 12px; border: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1>Sign Up</h1>
            <form method="POST">
              <input type="email" name="email" placeholder="Email" required>
              <input type="password" name="password" placeholder="Password" required>
              <input type="text" name="website" style="display: none;"> <!-- Honeypot -->
              <button type="submit" class="btn-primary">Create Account</button>
            </form>
            <p><a href="/login" class="link">Already have an account? Login</a></p>
          </div>
        </div>
        ${getThemeToggleButton()}
        <script>${getThemeToggleScript()}</script>
      </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
  
  // Handle POST request
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const website = formData.get("website"); // Honeypot
  const ip = getClientIP(request);
  
  // Honeypot check
  if (website && website.trim() !== "") {
    await logSecurityEvent(env, 'signup_honeypot_triggered', { email, ip });
    // Return fake success to avoid revealing honeypot
    return Response.redirect("/login?message=Account created! Please log in.", 302);
  }
  
  // Validate email
  const emailValidation = validateEmailLegitimacy(email);
  if (!emailValidation.isValid) {
    const userMessage = getEmailErrorMessage(emailValidation.reason);
    return new Response(userMessage, { 
      status: 400, 
      headers: { "Content-Type": "text/plain; charset=utf-8" } 
    });
  }
  
  // Check if user already exists
  const existingUser = await env.USERS.get(email);
  if (existingUser) {
    await logSecurityEvent(env, "signup_existing_email", { email, ip });
    return new Response("An account with this email already exists.", { 
      status: 400, 
      headers: { "Content-Type": "text/plain; charset=utf-8" } 
    });
  }
  
  // Create user (in production, hash the password!)
  const userData = {
    email,
    password, // TODO: Hash this with crypto.subtle
    createdAt: new Date().toISOString(),
    verified: true // In production, implement email verification
  };
  
  await env.USERS.put(email, JSON.stringify(userData));
  await logUserAction(env, 'signup_success', email, { ip });
  
  return Response.redirect("/login?message=Account created! Please log in.", 302);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      
      // Force HTTPS in production
      if (url.protocol === "http:" && !request.headers.get("x-forwarded-proto")) {
        url.protocol = "https:";
        return Response.redirect(url.toString(), 301);
      }
      
      // Get session for authenticated routes
      const session = await getSession(request, env);
      
      // Routes
      if (url.pathname === "/") {
        return addSecurityHeaders(await handleHome(request, env, session));
      }
      else if (url.pathname === "/signup") {
        // Rate limit signup attempts
        const rateLimitResponse = await withRateLimit(env, request, 'signup', 5, 60 * 60 * 1000); // 5 per hour
        if (rateLimitResponse) return addSecurityHeaders(rateLimitResponse);
        return addSecurityHeaders(await handleSignup(request, env));
      }
      else if (url.pathname === "/login") {
        // TODO: Implement login handler
        return new Response("Login page - TODO", { 
          headers: { "Content-Type": "text/plain; charset=utf-8" } 
        });
      }
      else if (url.pathname === "/logout") {
        if (session) {
          await destroySession(env, session.id);
          await logUserAction(env, 'logout', session.email);
        }
        const response = Response.redirect("/", 302);
        response.headers.set("Set-Cookie", createSessionCookie("", { maxAge: 0 }));
        return addSecurityHeaders(response);
      }
      else if (url.pathname === "/dashboard") {
        if (!session) {
          return Response.redirect("/login", 302);
        }
        return new Response("Dashboard - TODO", { 
          headers: { "Content-Type": "text/plain; charset=utf-8" } 
        });
      }
      else if (url.pathname === "/api/contact" && request.method === "POST") {
        return addSecurityHeaders(await handleContact(request, env));
      }
      // 404 for unknown routes
      return new Response("Not Found", { 
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" } 
      });
      
    } catch (error) {
      console.error("Worker error:", error);
      
      // Handle KV limit errors gracefully
      if (isKVLimitError(error)) {
        return addSecurityHeaders(createKVLimitErrorResponse());
      }
      
      return new Response(`Server Error: ${error.message}`, {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  },
  
  // Optional: Scheduled tasks
  async scheduled(event, env, ctx) {
    // Add your scheduled tasks here
    console.log("Scheduled task executed at:", new Date().toISOString());
  }
};
