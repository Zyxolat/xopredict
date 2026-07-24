# Maintenance Guide – Xopredict

Instructions for routine system maintenance, schema migrations, and contract updates.

---

## 1. Database Migrations

Apply pending migrations to production database:
```bash
npx prisma migrate deploy
```

---

## 2. Automated Cleanup Tasks

Trigger database cleanup for expired nonces, sessions, and old jobs:
```bash
curl -X POST https://xopredict.com/api/keeper/cleanup
```

---

## 3. Worker Node Health Inspection

Check operational dashboard stats:
```bash
curl https://xopredict.com/api/keeper/dashboard
```
