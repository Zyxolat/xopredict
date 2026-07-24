# Production Monitoring Guide – Xopredict

This document describes monitoring endpoints and metrics scraping setup for Datadog, Prometheus, Grafana, and Better Stack.

---

## 1. Health Center Endpoint
- **URL**: `GET /api/keeper/health`
- **Scrape Interval**: 15 seconds
- **Alert Condition**: Status != 200

---

## 2. Prometheus Metrics Endpoint
- **URL**: `GET /metrics`
- **Format**: Prometheus exposition text format
- **Key Metrics**:
  - `xopredict_uptime_seconds`
  - `xopredict_memory_heap_bytes`
  - `xopredict_relayer_celo_balance`
  - `xopredict_arenas_total`
  - `xopredict_rounds_total`
  - `xopredict_keeper_jobs`

---

## 3. Keeper Operational Dashboard
- **URL**: `GET /api/keeper/dashboard`
- **Usage**: Real-time operational monitoring dashboard.
