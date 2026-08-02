# Operational Runbook – Xopredict

Standard Operating Procedures (SOP) forSite Reliability Engineers (SRE) and DevOps operators.

---

## Scenario 1: Low Relayer CELO Gas Balance

### Symptoms
- Health endpoint `/api/keeper/health` returns status `503` or `degraded`.
- Logs show `[Keeper Wallet Warning] Relayer native CELO balance is low`.

### Action
1. Query relayer address from `/api/keeper/health` (send header `x-keeper-secret: <KEEPER_HEALTH_SECRET>` to reveal the relayer address/balance — these fields are redacted for unauthenticated callers).
2. Transfer 5-10 CELO to relayer wallet address on Celo Mainnet.
3. Verify `/api/keeper/health` returns `200 OK` and balance updates.

---

## Scenario 2: Witnet Randomness Timeout

### Symptoms
- Arena / Solo game stuck in stage `AWAIT_WITNET` > 20 minutes.

### Action
1. Trigger `/api/keeper/dashboard` to identify stuck `roundId`.
2. Execute automated timeout refund via Keeper worker or call `checkRandomnessTimeout(roundId)` on smart contract.
3. Verify participants receive USDm stake refund.

---

## Scenario 3: Database Connection Pool Exhaustion

### Symptoms
- HTTP 500 responses with `PrismaClientInitializationError` or connection timeout.

### Action
1. Check active database connections in PostgreSQL dashboard.
2. Ensure `DATABASE_URL` contains `?connection_limit=20` pooling parameter.
3. Restart application runner instances if connections are stalled.
