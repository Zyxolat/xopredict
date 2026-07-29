# XoPredict — Migration Guide (Auth V1 to Auth V2)

## Overview
This guide covers migrating existing production databases from wallet-first identity to account-centric hybrid identity.

## Step-by-Step Migration
1. Apply database migration SQL (`prisma/migrations/20260727_auth_v2/migration.sql`).
2. Existing `User` records will receive default `role = USER` and `status = ACTIVE`.
3. Existing `Player` addresses are automatically inserted into `wallets` table with `isPrimary = true` and linked to their `User` record.
4. Smart contracts and automated keeper jobs continue to operate without interruption using primary linked wallet addresses.
