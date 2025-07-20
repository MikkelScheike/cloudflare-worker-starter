/**
 * Template system for modular HTML generation
 * Centralizes all HTML templates and provides theme-aware rendering
 */

import { getThemeStyles, getThemeToggleButton, getThemeToggleScript } from './theme.js';

// Base template structure
export function renderPage({ title, content, styles = '', scripts = '', includeThemeToggle = true }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        ${getThemeStyles()}
        ${getBaseStyles()}
        ${styles}
      </style>
    </head>
    <body>
      ${content}
      ${includeThemeToggle ? getThemeToggleButton() : ''}
      <script>
        ${includeThemeToggle ? getThemeToggleScript() : ''}
        ${scripts}
      </script>
    </body>
    </html>
  `;
}

// Base styles used across all pages
function getBaseStyles() {
  return `
    body { 
      font-family: system-ui, sans-serif; 
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
      margin: 20px 0;
    }
    .btn-primary { 
      background: #2563eb; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 6px; 
      display: inline-block;
      font-weight: 500;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    input[type="text"], input[type="email"], input[type="password"] { 
      width: 100%; 
      padding: 12px; 
      margin: 8px 0; 
      border: 1px solid #d1d5db;
      border-radius: 6px; 
    }
  `;
}

// Home page template
export function renderHomePage(session = null) {
  const content = `
    <div class="container">
      <div class="card">
        <h1>🚀 Cloudflare Workers Starter</h1>
        <p>Welcome to your production-ready Cloudflare Worker with authentication, security, and utilities.</p>
        
        ${session ? `
          <p>Welcome back, <strong>${session.email}</strong>!</p>
          <div style="margin: 20px 0;">
            <a href="/dashboard" class="btn-primary">Dashboard</a>
            <a href="/logout" class="btn-primary" style="margin-left: 10px;">Logout</a>
          </div>
        ` : `
          <p>Get started by signing up or logging in.</p>
          <div style="margin: 20px 0;">
            <a href="/signup" class="btn-primary">Sign Up</a>
            <a href="/login" class="btn-primary" style="margin-left: 10px;">Login</a>
          </div>
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
  `;
  
  return renderPage({
    title: 'Cloudflare Workers Starter',
    content
  });
}

// Authentication form template
export function renderAuthForm({ 
  title, 
  action, 
  submitText, 
  extraFields = '', 
  message = '',
  alternateLink = null 
}) {
  const content = `
    <div class="container">
      <div class="card">
        <h1>${title}</h1>
        
        ${message ? `
          <div class="message ${message.type || 'info'}" style="
            padding: 12px; 
            margin: 16px 0; 
            border-radius: 6px;
            background: ${message.type === 'error' ? '#fee2e2' : '#dbeafe'};
            color: ${message.type === 'error' ? '#dc2626' : '#1e40af'};
          ">
            ${message.text}
          </div>
        ` : ''}
        
        <form method="POST" action="${action}">
          <input type="email" name="email" placeholder="Email" required>
          <input type="password" name="password" placeholder="Password" required>
          ${extraFields}
          <button type="submit" class="btn-primary" style="width: 100%; border: none; cursor: pointer;">
            ${submitText}
          </button>
        </form>
        
        ${alternateLink ? `
          <p style="text-align: center; margin-top: 20px;">
            <a href="${alternateLink.href}">${alternateLink.text}</a>
          </p>
        ` : ''}
      </div>
    </div>
  `;
  
  return renderPage({
    title,
    content
  });
}

// Dashboard template
export function renderDashboard(session) {
  const content = `
    <div class="container">
      <div class="card">
        <h1>📊 Dashboard</h1>
        <p>Welcome to your dashboard, <strong>${session.email}</strong>!</p>
        
        <div style="margin: 24px 0;">
          <h3>Account Information</h3>
          <p><strong>Email:</strong> ${session.email}</p>
          <p><strong>Last Activity:</strong> ${new Date(session.lastActivity).toLocaleString()}</p>
          <p><strong>Session Created:</strong> ${new Date(session.createdAt).toLocaleString()}</p>
        </div>
        
        <div style="margin: 24px 0;">
          <h3>Quick Actions</h3>
          <a href="/" class="btn-primary" style="margin: 4px;">Home</a>
          <a href="/logout" class="btn-primary" style="margin: 4px; background: #dc2626;">Logout</a>
        </div>
      </div>
    </div>
  `;
  
  return renderPage({
    title: 'Dashboard',
    content
  });
}
