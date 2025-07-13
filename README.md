# Cloudflare Workers Starter Pack

A production-ready starter template for Cloudflare Workers with authentication, payments, and common utilities.

## Features

- 🔐 **Authentication System**: Signup, login, password reset with email verification
- 💳 **Stripe Integration**: Subscription management, webhooks, billing portal
- 📧 **Email System**: Transactional emails via Brevo/Sendinblue
- 🛡️ **Security**: Rate limiting, honeypot protection, audit logging, spam email filtering
- 🎨 **UI Components**: Responsive design, dark/light theme toggle
- 📊 **Admin Panel**: User management, audit logs, system stats
- ⚡ **Performance**: Optimized KV usage, error handling, graceful degradation

## Quick Start

1. **Clone and Setup**
   ```bash
   cd starter-pack
   npm install wrangler -g
   ```

2. **Configure Cloudflare**
   - Create KV namespaces in Cloudflare dashboard
   - Update `wrangler.toml` with your account ID and KV namespace IDs
   - Set your environment variables

3. **Configure Services**
   - **Brevo**: Get API key from brevo.com
   - **Stripe** (optional): Get keys from stripe.com dashboard
   - Update environment variables in `wrangler.toml`

4. **Deploy**
   ```bash
   wrangler deploy
   ```

## Environment Variables

Copy and update these in your `wrangler.toml`:

```toml
BREVO_API_KEY = "xkeysib-..."
SENDER_EMAIL = "your-email@domain.com"
SESSION_SECRET = "32-character-random-string"
BASE_URL = "https://your-project.workers.dev"

# Optional Stripe
STRIPE_SECRET_KEY = "sk_test_..."
STRIPE_WEBHOOK_SECRET = "whsec_..."
```

## Project Structure

```
src/
├── worker.js              # Main entry point
└── lib/
    ├── auth.js            # Authentication system
    ├── session.js         # Session management
    ├── email.js           # Email utilities
    ├── email-validation.js # Spam/disposable email filtering
    ├── payments.js        # Stripe integration
    ├── audit.js           # Security logging
    ├── ratelimit.js       # Rate limiting
    ├── kv-utils.js        # KV optimization utilities
    ├── theme.js           # Dark/light theme
    ├── legal.js           # Terms/Privacy pages
    └── utils.js           # General utilities
```

## Customization

1. **Branding**: Update colors, fonts, and copy in the UI components
2. **Features**: Add/remove modules as needed for your specific use case
3. **Database**: All data is stored in Cloudflare KV (can be adapted for D1/Durable Objects)
4. **Styling**: Inline CSS for easy customization without build tools

## License

MIT - Feel free to use for personal or commercial projects.

## Credits

Built from real-world production code used in CronMonitor.
