# XoPredict — Security Audit Report

## Audit Findings & Mitigations

### 1. Password Protection
- **Implementation**: Hashed with `bcrypt` using 12 salt rounds.
- **Strength Policy**: Min 8 chars, 1 uppercase, 1 lowercase, 1 digit.
- **Result**: PASS

### 2. OTP Security
- **Implementation**: Cryptographically secure `crypto.randomInt` 6-digit generation.
- **Storage**: Hashed with SHA-256 in DB (`EmailVerification` & `PasswordReset`).
- **Throttling**: 5-minute expiration, max 5 failed attempts per code, 60-second resend cooldown.
- **Result**: PASS

### 3. Wallet Impersonation & Replay Protection
- **Implementation**: Nonce-based message signing verified server-side with `viem.verifyMessage`.
- **Global Uniqueness**: Database unique constraint on `Wallet.address`. Duplicate linking returns `409 Conflict`.
- **Result**: PASS

### 4. Admin Access Control
- **Implementation**: Middleware + API level validation using `requireAdmin()` helper.
- **Resolution**: Fixed security vulnerability where `GET /api/admin` was previously unauthenticated.
- **Result**: PASS

### 5. Email Enumeration Mitigation
- **Implementation**: `POST /api/auth/forgot-password` returns generic 200 responses regardless of whether the email exists.
- **Result**: PASS
