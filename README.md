# 🚀 Cloudflare Workers Starter Pack

[![GitHub license](https://img.shields.io/github/license/duabiht/cloudflare-worker-starter?style=flat-square)](https://github.com/duabiht/cloudflare-worker-starter/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/buy%20me%20a-coffee-yellow?logo=buy-me-a-coffee&style=flat-square)](https://buymeacoffee.com/duabiht)

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

1. **Clone this repository**
   ```bash
   git clone https://github.com/duabiht/cloudflare-worker-starter.git my-new-project
   cd my-new-project
   npm install
   ```

2. **Install Wrangler (if not already installed)**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **Configure Cloudflare**
   - Create KV namespaces in Cloudflare dashboard:
     ```bash
     wrangler kv:namespace create "SESSIONS"
     wrangler kv:namespace create "USERS" 
     wrangler kv:namespace create "AUDIT"
     ```
   - Update `wrangler.toml` with your account ID and KV namespace IDs
   - Copy `.env.example` to `.env` and fill in your values

4. **Configure External Services**
   - **Brevo**: Get API key from [brevo.com](https://brevo.com) (free tier available)
   - **Stripe** (optional): Get keys from [stripe.com](https://stripe.com) dashboard
   - Update environment variables in `wrangler.toml`

5. **Deploy**
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

## Support

If this starter pack saved you time and helped with your project, consider [buying me a coffee](https://buymeacoffee.com/duabiht) ☕ 

It's totally optional, but greatly appreciated and helps me maintain this project!

## 🚀 Projects Built With This Starter

### Live Examples
- **[CronMonitor](https://cronmonitor.sitewatch.workers.dev)** - Website monitoring SaaS with 5-minute checks, email alerts, and Stripe billing
  - *Features: User auth, subscription management, monitoring dashboard, admin panel*
  - *Built by: [@duabiht](https://github.com/duabiht)*

### Community Projects
*Your project could be here! Built something cool with this starter? [Open an issue](https://github.com/duabiht/cloudflare-worker-starter/issues) or PR to add it.*

## Credits

Built from real-world production code. This template has been battle-tested in production environments and powers live SaaS applications.

## 🔒 Security Notes

- **Never commit real API keys** - Always use placeholder values in `wrangler.toml`
- **Use environment variables** for sensitive data in production
- **Review all code** before deploying to production
- **Update dependencies** regularly for security patches

## 🤝 Contributing

Found a bug or want to improve something? 
- Open an issue or submit a pull request
- All contributions are welcome!

## 📚 What You Get

This starter pack includes:
- **Session management** with secure cookie handling
- **Email validation** with spam/disposable email filtering  
- **Rate limiting** to prevent abuse
- **Audit logging** for security monitoring
- **KV utilities** with error handling and optimization
- **Theme system** with dark/light mode
- **Responsive UI** components ready to customize

Perfect for building SaaS applications, internal tools, APIs, or any web service that needs user authentication and management
