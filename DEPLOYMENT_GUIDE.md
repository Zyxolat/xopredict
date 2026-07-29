# XoPredict — Deployment Guide

## Environment Variables Required

```env
# Database Connections
DATABASE_URL="postgresql://user:password@host:5432/dbname"
DIRECT_URL="postgresql://user:password@host:5432/dbname"

# NextAuth Secret & App URL
NEXTAUTH_SECRET="your-32-character-random-secret"
NEXTAUTH_URL="https://xopredict.com"

# Resend Transactional Email SDK
RESEND_API_KEY="re_123456789"
EMAIL_FROM="XOLAT <noreply@xopredict.com>"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Web3 & Keeper Configuration
NEXT_PUBLIC_WC_PROJECT_ID="your-walletconnect-project-id"
RELAYER_PRIVATE_KEY="0x..."
NEXT_PUBLIC_XOLAT_ADDRESS="0x..."
```

## Deployment Steps
1. Install dependencies: `npm install`
2. Run database migration: `npx prisma migrate deploy`
3. Generate Prisma client: `npx prisma generate`
4. Run production build: `npm run build`
5. Start server: `npm run start`
