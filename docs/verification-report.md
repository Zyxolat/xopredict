# Wallet Linking & Auth UX Fixes Documentation

## Overview
This document summarizes the root cause analysis, architecture fixes, and verification test results for:
1. Issue 1: Wallet linking false-positive conflict error ("already linked to another account").
2. Issue 2: Public homepage Web3 landing UX for anonymous visitors vs authenticated dashboard.

## Fixes Summary
- `src/lib/wallet-linking.ts`: Removed legacy `Player.address` uniqueness check in `linkWalletToUser`. The `@unique` constraint on the `Wallet` table is now the single source of truth for ownership uniqueness across accounts.
- `src/app/api/auth/wallet/route.ts` & `src/app/api/wallet/connect/route.ts`: Updated exception handling to use `instanceof WalletLinkConflictError` for 409 responses and return 200 on idempotent reconnects.
- `src/app/page.tsx`: Implemented bifurcated landing page rendering `PublicLandingPage` for anonymous visitors and `AuthenticatedDashboard` for logged-in users.
- `src/components/app-shell.tsx`: Added responsive header with permanent Login/Sign Up buttons for anonymous users and User Dropdown for authenticated users.
