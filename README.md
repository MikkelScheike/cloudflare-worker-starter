# 🚀 Cloudflare Workers Starter Pack

[![GitHub license](https://img.shields.io/github/license/duabiht/cloudflare-worker-starter?style=flat-square)](https://github.com/duabiht/cloudflare-worker-starter/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/buy%20me%20a-coffee-yellow?logo=buy-me-a-coffee&style=flat-square)](https://buymeacoffee.com/duabiht)

A **production-ready** starter template for Cloudflare Workers with authentication, security, and common utilities. Built from real-world production code and battle-tested in live SaaS applications.

## ✨ What You Get

This starter pack includes everything you need to build modern SaaS applications:

- 🔐 **Complete Authentication System** - Signup, login, password reset with email verification
- � **Email Integration** - Transactional emails via Brevo/Sendinblue with generic utility
- 🛡️ **Advanced Security** - Rate limiting, honeypot protection, audit logging, spam filtering
- 📞 **Contact Form API** - Ready-to-use endpoint with Cloudflare Turnstile (CAPTCHA) verification
- 🎨 **Modern UI Components** - Responsive design with dark/light theme toggle
- 📊 **Admin Features** - User management, audit logs, system statistics
- ⚡ **Performance Optimized** - Smart KV usage, error handling, graceful degradation
- 💳 **Payment Ready** - Stripe integration for subscriptions and billing

**Perfect for:** SaaS applications, internal tools, APIs, or any web service requiring user authentication and management.

## 📖 Developer Guide

### Contact Form API & Turnstile Integration

Ready-to-use `/api/contact` POST endpoint with [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) CAPTCHA protection.

**How it works:**
- Accepts JSON `{ name, email, message, turnstileToken }` from your frontend
- Verifies Turnstile token server-side for spam protection
- Validates email format and filters disposable/spam addresses
- Customizable email sending or data storage

**Example request:**
```json
POST /api/contact
{
  "name": "Jane Doe",
  "email": "jane@example.com", 
  "message": "Hello! I have a question.",
  "turnstileToken": "token-from-widget"
}
```

**Frontend integration:**
1. Add Turnstile widget: [Setup Guide](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)
2. POST form data with token to `/api/contact`

### Email Sending Utility

Provider-agnostic email utility at `src/lib/email.js` supporting multiple email services (Brevo, SES, SMTP2GO, etc.).

**Usage:**
```javascript
import { sendEmail } from './lib/email.js';

// Basic usage (uses default provider)
await sendEmail(env, 'user@example.com', 'Welcome!', 'Hello and welcome!');

// With custom sender and tags
await sendEmail(env, 'user@example.com', 'Alert', 'System notification', 'MyApp', ['urgent']);
```

**Supported Providers:**
- **Brevo/Sendinblue** (default) - Set `BREVO_API_KEY` in environment
- **AWS SES** - Set `EMAIL_PROVIDER=ses` and AWS credentials
- **SMTP2GO** - Set `EMAIL_PROVIDER=smtp2go` and `SMTP2GO_API_KEY`
- **Custom** - Easy to add your own provider

**Configuration:**
```toml
# Choose your email provider (defaults to 'brevo')
EMAIL_PROVIDER = "brevo"  # or "ses", "smtp2go", etc.

# Provider-specific credentials
BREVO_API_KEY = "xkeysib-..."      # For Brevo
SMTP2GO_API_KEY = "api-..."        # For SMTP2GO
# AWS credentials would go here for SES
```

**Adding Custom Providers:**
```javascript
import { addEmailProvider } from './lib/email.js';

// Add your custom email service
addEmailProvider('mycustom', async (env, toEmail, subject, body, senderName, tags) => {
  // Your implementation here
  return true; // or false if failed
});
```

**Parameters:**
- `env` - Environment object with provider credentials and `SENDER_EMAIL`
- `toEmail` - Recipient email address
- `subject` - Email subject line
- `body` - Plain text email content
- `senderName` - Optional sender name (default: "Your App")
- `tags` - Optional string or array for email tracking

**Returns:** `Promise<boolean>` - `true` if sent successfully

### Email Validation Utility

Advanced email validation at `src/lib/email-validation.js` to block spam, disposable, and suspicious email addresses. The validator allows short but valid domains (e.g., a.co) and does not reject based on domain length alone.

**Features:**
- **Dynamic Disposable Domains**: Automatically fetches the latest list from [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) repository
- **Smart Caching**: 24-hour cache with KV storage persistence across worker instances
- **Pattern Detection**: Identifies suspicious email patterns (test emails, bots, etc.)
- **Audit Logging**: Logs blocked emails for security monitoring
- **Fallback Protection**: Uses built-in list if external fetch fails

**Usage:**
```javascript
import { validateEmailLegitimacy, getEmailErrorMessage } from './lib/email-validation.js';

// Validate email (async - fetches latest disposable domains)
const result = await validateEmailLegitimacy('user@example.com', env);
if (!result.isValid) {
  const userMessage = getEmailErrorMessage(result.reason);
// Show friendly error: "Temporary email addresses are not allowed..."
// Note: Short but valid domains (like a.co) are accepted.
}
```

**Disposable Domains List:**
- Automatically updated from the community-maintained [disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) repository
- 24-hour cache prevents excessive API calls  
- Includes 2000+ disposable email services
- Falls back to built-in list if external fetch fails

**Configuration:**
No configuration needed - works out of the box with automatic updates.

### Template System

Modular HTML template system at `src/lib/templates.js` for maintainable UI components.

**Features:**
- **Theme Integration**: Automatically includes theme styles and toggle functionality
- **Consistent Styling**: Base styles applied across all pages
- **Reusable Components**: Authentication forms, error pages, dashboard templates
- **Easy Customization**: Centralized template management

**Usage:**
```javascript
import { renderPage, renderAuthForm, renderHomePage } from './lib/templates.js';

// Basic page template
const html = renderPage({
  title: 'My Page',
  content: '<h1>Hello World</h1>',
  styles: 'body { background: red; }',
  scripts: 'console.log("loaded");'
});

// Authentication form
const signupForm = renderAuthForm({
  title: 'Sign Up',
  action: '/signup',
  submitText: 'Create Account',
  extraFields: '<input type="text" name="website" style="display: none;">',
  alternateLink: { href: '/login', text: 'Already have an account?' }
});
```

### Configuration System

Centralized configuration system at `src/lib/config.js` for environment-based settings.

**Features:**
- **Environment-Based**: All limits and settings configurable via environment variables
- **Type Safety**: Automatic type conversion and validation
- **Sensible Defaults**: Production-ready defaults for all settings
- **Runtime Validation**: Validates required environment variables

**Usage:**
```javascript
import { getConfig, validateRequiredEnv } from './lib/config.js';

// Get full configuration
const config = getConfig(env);
console.log(config.session.timeout); // 1800000 (30 minutes)

// Validate environment
const missing = validateRequiredEnv(env);
if (missing.length > 0) {
  throw new Error(`Missing required env vars: ${missing.join(', ')}`);
}
```

**Configuration Categories:**
- **Session**: Timeout, expiration, max age settings
- **Rate Limiting**: Per-endpoint limits and time windows  
- **Logging**: Audit log retention and throttling limits
- **Email Validation**: Cache duration and refresh intervals
- **Security**: Honeypot fields, feature toggles
- **Performance**: KV retry logic and timeouts

**Features:**
- **Standardized Errors**: Pre-configured templates for all HTTP status codes
- **Customizable**: Override messages, add additional info, customize actions
- **Theme-Aware**: Automatically uses your theme system
- **SEO-Friendly**: Proper HTTP status codes and meta information

**Usage:**
```javascript
import { ErrorResponses, createErrorResponse } from './lib/error-responses.js';

// Quick error responses
return ErrorResponses.notFound('This resource was moved');
return ErrorResponses.unauthorized('Please log in first');
return ErrorResponses.serverError('Database connection failed');

// Custom error response
return createErrorResponse(429, {
  heading: 'Slow Down!',
  message: 'Too many requests from your IP address.',
  additionalInfo: '<p>Limit resets in 15 minutes.</p>'
});
```
## 🚀 Quick Start

Get up and running in minutes:

### 1. Clone & Install
```bash
git clone https://github.com/duabiht/cloudflare-worker-starter.git my-new-project
cd my-new-project
npm install
```

### 2. Setup Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 3. Configure Cloudflare
Create KV namespaces in your Cloudflare dashboard:
```bash
wrangler kv:namespace create "SESSIONS"
wrangler kv:namespace create "USERS" 
wrangler kv:namespace create "AUDIT"
```

Update `wrangler.toml` with your account ID and the generated KV namespace IDs.

### 4. Environment Setup
Copy `.env.example` to `.env` and configure:
- **Brevo**: Get API key from [brevo.com](https://brevo.com) (free tier available)
- **Stripe** (optional): Get keys from [stripe.com](https://stripe.com) dashboard
- **Turnstile** (optional): For contact form CAPTCHA protection

### 5. Deploy
```bash
wrangler deploy
```

🎉 **You're live!** Your Cloudflare Worker is now running with full authentication and security features.

## ⚙️ Configuration

### Environment Variables

Add these to your `wrangler.toml`:

```toml
# Required
BREVO_API_KEY = "xkeysib-..."
SENDER_EMAIL = "your-email@domain.com"
SESSION_SECRET = "your-32-character-random-string"
BASE_URL = "https://your-project.workers.dev"

# Optional - Contact Form
TURNSTILE_SECRET_KEY = "your-turnstile-secret-key"

# Optional - Stripe Integration
STRIPE_SECRET_KEY = "sk_test_..."
STRIPE_WEBHOOK_SECRET = "whsec_..."
```

### Project Structure

```
src/
├── worker.js              # Main entry point & routing
├── worker.test.js         # Example tests
└── lib/
    ├── audit.js           # Security logging
    ├── auth.js            # Authentication system
    ├── config.js          # Configuration system
    ├── email.js           # Email sending utility (Brevo/Sendinblue)
    ├── email-validation.js # Spam/disposable email filtering
    ├── error-responses.js  # Modular error page system
    ├── kv-utils.js        # KV optimization utilities
    ├── ratelimit.js       # Rate limiting middleware
    ├── session.js         # Session management
    ├── templates.js       # HTML template system
    ├── theme.js           # Dark/light theme system
    └── utils.js           # General utilities
```

### Customization Options

1. **Branding** - Update colors, fonts, and copy in UI components
2. **Features** - Add/remove modules based on your needs
3. **Database** - Uses Cloudflare KV (adaptable to D1/Durable Objects)
4. **Styling** - Inline CSS for easy customization without build tools
5. **Authentication** - Extend with OAuth, 2FA, or other providers
6. **Email Templates** - Customize the email utility for your brand

## 🌟 Community & Support

### Projects Built With This Starter

**Live Examples:**
- **[CronMonitor](https://cronmonitor.sitewatch.workers.dev)** - Website monitoring SaaS with 5-minute checks, email alerts, and Stripe billing
  - *Features: User auth, subscription management, monitoring dashboard, admin panel*
  - *Built by: [@duabiht](https://github.com/duabiht)*

**Community Projects:**
*Your project could be here! Built something cool with this starter? [Open an issue](https://github.com/duabiht/cloudflare-worker-starter/issues) or PR to add it.*

### Contributing

Found a bug or want to improve something?
- Open an issue or submit a pull request
- All contributions are welcome!
- Check our [contribution guidelines](CONTRIBUTING.md) (coming soon)

### Support the Project

If this starter pack saved you time, consider [buying me a coffee](https://buymeacoffee.com/duabiht) ☕

It's totally optional, but greatly appreciated and helps maintain this project!

## 🔒 Security & Best Practices

**Security Features Included:**
- **Input Sanitization** - All user inputs are sanitized and validated
- **Rate Limiting** - Prevents abuse with configurable limits
- **Email Validation** - Blocks disposable and spam email addresses
- **Audit Logging** - Tracks security events and user actions
- **Honeypot Protection** - Catches automated bot submissions
- **Session Security** - Secure cookie handling and session management

**Important Security Notes:**
- **Never commit real API keys** - Use placeholder values in `wrangler.toml`
- **Use environment variables** for sensitive data in production
- **Review all code** before deploying to production
- **Update dependencies** regularly for security patches
- **Enable Cloudflare security features** (Bot Fight Mode, etc.)

## � License

MIT License - Feel free to use for personal or commercial projects.

## 🏗️ Built With Production Experience

This template is extracted from real-world production code and has been battle-tested in live SaaS applications. It includes patterns and utilities that have proven reliable in production environments.
