# Alerting Rules & Severity Matrix – Xopredict

Defines alert conditions, thresholds, and notification channels for automated PagerDuty / Slack operational alerts.

---

## Alert Rules Summary

| Alert Name | Condition | Severity | Action |
|:---|:---|:---:|:---|
| `RelayerBalanceLow` | CELO balance < 1.0 | P2 - Warning | Refill relayer wallet CELO |
| `RelayerBalanceCritical` | CELO balance < 0.2 | P1 - Critical | Immediate relayer wallet refill |
| `SystemHealthDegraded` | `/api/keeper/health` status != 200 | P1 - Critical | Inspect DB / RPC connectivity |
| `KeeperJobsFailedSpike` | Failed jobs count > 5 | P2 - Warning | Inspect Keeper logs for RPC errors |
| `MemoryLeakWarning` | RSS memory > 800MB | P2 - Warning | Trigger graceful container restart |
| `RPCNodeDown` | RPC failover count > 2 | P2 - Warning | Rotate primary Celo RPC endpoint |
