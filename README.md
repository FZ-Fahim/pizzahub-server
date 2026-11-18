# 🍕 PizzaHub — Backend API Server

> **Robust, scalable Node.js & TypeScript Express REST API for the PizzaHub multi-vendor artisanal pizza marketplace, equipped with Better Auth, MongoDB Atlas, Stripe Subscriptions & Webhooks, ImgBB uploads, and Vercel Serverless Function support.**

---

## 🛠️ Tech Stack & Architecture

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.7+ (Target: CommonJS, Strict mode)
- **Framework**: Express.js with Helmet, CORS, Morgan, Express-Rate-Limit
- **Deployment**: Vercel Serverless (`api/index.ts`, `vercel.json`, `@vercel/node`)
- **Database**: MongoDB Atlas with Mongoose 8.x (Cached serverless connection)
- **Auth**: Better Auth + Custom JWT utilities & RBAC
- **Payments**: Stripe Checkout ($99/year Vendor Premium) & Raw Cryptographic Webhooks
- **Media**: Multer & ImgBB API

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Seed platform administrator
npm run seed:admin

# 4. Start local development server
npm run dev
# Running on http://localhost:5000
# Health check: http://localhost:5000/health
```

---

## ☁️ Vercel Deployment

This server includes full Vercel serverless function compatibility via `api/index.ts` and `vercel.json`.

1. Import `pizzahub-server` in Vercel.
2. Select **Framework Preset**: `Other`.
3. Add your environment variables (see below).
4. Deploy and verify at `https://<YOUR-APP>.vercel.app/health`.

### Required Environment Variables

```env
PORT=5000
NODE_ENV=production
CLIENT_URL=https://<your-pizzahub-client>.vercel.app
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/pizzahub?retryWrites=true&w=majority

BETTER_AUTH_SECRET=your_32_char_secret_key_here
BETTER_AUTH_URL=https://<your-pizzahub-server>.vercel.app
JWT_SECRET=your_jwt_secret_token_here
JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...

IMGBB_API_KEY=your_imgbb_api_key
```

> **Note**: Make sure your MongoDB Atlas IP Access List contains `0.0.0.0/0` (Allow Access from Anywhere) so Vercel's serverless functions can connect.

---

## 📡 API Endpoints

- **Health**: `GET /health`
- **Auth**: `/api/auth/*` (Better Auth email & Google OAuth)
- **Menu**: `GET, POST, PUT, DELETE /api/menu`
- **Orders**: `POST, GET, PATCH /api/orders`
- **Reviews**: `GET /api/reviews/item/:itemId`, `POST /api/reviews`
- **Subscriptions & Webhook**: `/api/subscription/*`, `POST /api/webhook/stripe`
- **Image Upload**: `POST /api/upload/image`
- **Admin**: `/api/admin/*` (Overview, Users block/unblock, Menu approval, Transactions)
