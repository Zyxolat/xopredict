# Environment Variables Reference – Xopredict

Reference guide for all required and optional environment variables.

---

## Required Environment Variables

| Variable Name | Description | Example / Default |
|:---|:---|:---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/xopredict` |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret | `32-character-random-secret` |
| `NEXTAUTH_URL` | Canonical application URL | `https://xopredict.com` |
| `NEXT_PUBLIC_CELO_RPC_URL` | Celo RPC endpoint | `https://forno.celo.org` |
| `NEXT_PUBLIC_XOLAT_CONTRACT_ADDRESS` | Deployed Xolat contract address | `0x...` |
| `NEXT_PUBLIC_USDM_CONTRACT_ADDRESS` | USDm ERC20 contract address | `0x...` |
| `RELAYER_PRIVATE_KEY` | Relayer worker wallet private key | `0x...` |

---

## Optional Environment Variables

| Variable Name | Description | Default |
|:---|:---|:---|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `null` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `null` |
| `CLEANUP_RETENTION_DAYS` | Retention days for old jobs | `30` |
