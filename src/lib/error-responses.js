/**
 * Centralized error response system
 * Provides consistent, modular error pages for all HTTP error codes
 */

import { renderPage } from './templates.js';

// Error response configuration
const ERROR_CONFIG = {
  // 4xx Client Errors
  400: {
    title: '400 - Bad Request',
    heading: '⚠️ Bad Request',
    message: 'The request could not be understood by the server.',
    suggestion: 'Please check your request and try again.'
  },
  401: {
    title: '401 - Unauthorized',
    heading: '🔒 Access Denied',
    message: 'You need to be authenticated to access this resource.',
    suggestion: 'Please log in and try again.',
    showLoginLink: true
  },
  403: {
    title: '403 - Forbidden',
    heading: '🚫 Access Forbidden',
    message: 'You don\'t have permission to access this resource.',
    suggestion: 'Contact support if you believe this is an error.'
  },
  404: {
    title: '404 - Not Found',
    heading: '🔍 Page Not Found',
    message: 'The page you\'re looking for doesn\'t exist.',
    suggestion: 'Check the URL or return to the homepage.'
  },
  429: {
    title: '429 - Too Many Requests',
    heading: '⏳ Rate Limited',
    message: 'You\'ve made too many requests in a short time.',
    suggestion: 'Please wait a moment before trying again.'
  },
  
  // 5xx Server Errors
  500: {
    title: '500 - Internal Server Error',
    heading: '💥 Something Went Wrong',
    message: 'An unexpected error occurred on our servers.',
    suggestion: 'We\'ve been notified and are working to fix it. Please try again later.'
  },
  502: {
    title: '502 - Bad Gateway',
    heading: '🌐 Service Unavailable',
    message: 'We\'re experiencing connectivity issues.',
    suggestion: 'Please try again in a few minutes.'
  },
  503: {
    title: '503 - Service Unavailable',
    heading: '⚠️ Service Temporarily Unavailable',
    message: 'Our service is temporarily unavailable due to high load or maintenance.',
    suggestion: 'Please try again in a few minutes. This issue usually resolves automatically.'
  },
  504: {
    title: '504 - Gateway Timeout',
    heading: '⏱️ Request Timeout',
    message: 'The request took too long to process.',
    suggestion: 'Please try again. If the problem persists, contact support.'
  }
};

/**
 * Create a standardized error response
 * @param {number} statusCode - HTTP status code
 * @param {object} options - Customization options
 * @returns {Response} - HTML error response
 */
export function createErrorResponse(statusCode, options = {}) {
  const config = ERROR_CONFIG[statusCode] || ERROR_CONFIG[500];
  
  const {
    title = config.title,
    heading = config.heading,
    message = config.message,
    suggestion = config.suggestion,
    customMessage = null,
    showHomeLink = true,
    showLoginLink = config.showLoginLink || false,
    additionalInfo = null
  } = options;

  const content = `
    <div class="container">
      <div class="error-page" style="
        text-align: center;
        padding: 60px 20px;
        max-width: 600px;
        margin: 0 auto;
      ">
        <div class="error-icon" style="font-size: 72px; margin-bottom: 20px;">
          ${getErrorIcon(statusCode)}
        </div>
        
        <h1 style="color: #dc2626; margin: 0 0 16px; font-size: 2rem;">
          ${heading}
        </h1>
        
        <p style="color: #374151; font-size: 1.1rem; margin: 0 0 16px; line-height: 1.6;">
          ${customMessage || message}
        </p>
        
        <p style="color: #6b7280; margin: 0 0 32px;">
          ${suggestion}
        </p>
        
        ${additionalInfo ? `
          <div class="additional-info" style="
            background: #f9fafb; 
            border: 1px solid #e5e7eb; 
            border-radius: 8px; 
            padding: 16px; 
            margin: 24px 0;
            text-align: left;
          ">
            ${additionalInfo}
          </div>
        ` : ''}
        
        <div class="error-actions" style="margin-top: 32px;">
          ${showHomeLink ? `
            <a href="/" class="btn-primary" style="margin: 0 8px;">
              ← Back to Home
            </a>
          ` : ''}
          
          ${showLoginLink ? `
            <a href="/login" class="btn-primary" style="margin: 0 8px;">
              🔒 Login
            </a>
          ` : ''}
          
          <button onclick="history.back()" class="btn-secondary" style="
            background: #6b7280; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 6px; 
            margin: 0 8px;
            cursor: pointer;
          ">
            ← Go Back
          </button>
        </div>
        
        <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 40px;">
          Error Code: ${statusCode} • 
          <span id="timestamp">${new Date().toLocaleString()}</span>
        </p>
      </div>
    </div>
  `;

  const html = renderPage({
    title,
    content,
    includeThemeToggle: false
  });

  return new Response(html, {
    status: statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(statusCode === 503 && { "Retry-After": "3600" }) // 1 hour for service unavailable
    }
  });
}

/**
 * Get appropriate icon for error code
 */
function getErrorIcon(statusCode) {
  if (statusCode >= 400 && statusCode < 500) {
    switch (statusCode) {
      case 401: return '🔒';
      case 403: return '🚫';
      case 404: return '🔍';
      case 429: return '⏳';
      default: return '⚠️';
    }
  }
  
  if (statusCode >= 500) {
    switch (statusCode) {
      case 502: return '🌐';
      case 503: return '⚠️';
      case 504: return '⏱️';
      default: return '💥';
    }
  }
  
  return '❓';
}

/**
 * Specialized KV limit error response (maintains backward compatibility)
 */
export function createKVLimitErrorResponse(userMessage = null) {
  const additionalInfo = `
    <h4 style="margin: 0 0 8px; color: #374151;">What this means:</h4>
    <ul style="text-align: left; color: #6b7280; margin: 0 0 16px;">
      <li>Core functionality is still active</li>
      <li>Some features may be temporarily limited</li>
      <li>No data has been lost</li>
    </ul>
    
    <h4 style="margin: 0 0 8px; color: #374151;">What to do:</h4>
    <p style="text-align: left; color: #6b7280; margin: 0;">
      This limit resets automatically every 24 hours. 
      If this persists, please contact support.
    </p>
  `;

  return createErrorResponse(503, {
    heading: '⚠️ Service Temporarily Unavailable',
    message: 'Our service is experiencing high usage and has temporarily reached its daily write limit.',
    customMessage: userMessage,
    additionalInfo,
    showHomeLink: true,
    showLoginLink: false
  });
}

/**
 * Quick error response helpers
 */
export const ErrorResponses = {
  notFound: (message) => createErrorResponse(404, { customMessage: message }),
  unauthorized: (message) => createErrorResponse(401, { customMessage: message }),
  forbidden: (message) => createErrorResponse(403, { customMessage: message }),
  badRequest: (message) => createErrorResponse(400, { customMessage: message }),
  rateLimit: (resetTime) => createErrorResponse(429, { 
    additionalInfo: resetTime ? `<p>Try again after: ${new Date(resetTime).toLocaleTimeString()}</p>` : null 
  }),
  serverError: (message) => createErrorResponse(500, { customMessage: message }),
  serviceUnavailable: (retryAfter) => createErrorResponse(503, {
    additionalInfo: retryAfter ? `<p>Estimated recovery time: ${retryAfter}</p>` : null
  })
};
