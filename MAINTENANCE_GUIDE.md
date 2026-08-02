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

Trigger database cleanup for expired nonces, sessions, and old jobs. This endpoint
requires an authenticated admin session (send the admin's NextAuth session cookie
with the request):
```bash
curl -X POST https://xopredict.com/api/keeper/cleanup \
  -H "Cookie: next-auth.session-token=<admin-session-token>"
```

---

## 3. Worker Node Health Inspection

Check operational dashboard stats:
```bash
curl https://xopredict.com/api/keeper/dashboard
```
