# Production Deployment Guide – Xopredict

This document provides step-by-step instructions for deploying Xopredict to production on Celo Mainnet using Docker and Railway / Kubernetes.

---

## 1. Prerequisites

- Celo Mainnet RPC URL (`NEXT_PUBLIC_CELO_RPC_URL`)
- Deployed Xolat Smart Contract Address (`NEXT_PUBLIC_XOLAT_CONTRACT_ADDRESS`)
- USDm ERC20 Token Address on Celo (`NEXT_PUBLIC_USDM_CONTRACT_ADDRESS`)
- Relayer Wallet Private Key (`RELAYER_PRIVATE_KEY`) with funded CELO for gas fees
- PostgreSQL Database Connection String (`DATABASE_URL`)
- NextAuth Secret (`NEXTAUTH_SECRET`)
- Google OAuth Client ID & Secret (Optional, for Google Sign-In)

---

## 2. Docker Build & Container Deployment

### Multi-Stage Container Build
```bash
docker build -t xopredict:latest .
```

### Local Container Verification
```bash
docker run -p 3000:3000 --env-file .env.production xopredict:latest
```

---

## 3. Railway / Cloud Deployment

1. Connect Git repository to Railway / Cloud Provider.
2. Select Dockerfile builder strategy (`railway.json`).
3. Set Environment Variables in Railway Dashboard.
4. Set Health Check Endpoint path to `/api/keeper/health`.
5. Trigger initial deployment.
