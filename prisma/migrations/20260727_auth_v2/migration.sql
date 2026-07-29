-- Auth V2 Migration
-- Adds: Wallet, EmailVerification, PasswordReset, LoginHistory tables
-- Modifies: User table (new columns), Player table (drops email/username)

-- Enums
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- User table evolution
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'USER';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Wallet table
CREATE TABLE IF NOT EXISTS "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "walletType" TEXT NOT NULL DEFAULT 'evm',
    "network" TEXT NOT NULL DEFAULT 'celo',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wallets_address_key" ON "wallets"("address");
CREATE INDEX IF NOT EXISTS "wallets_userId_idx" ON "wallets"("userId");

ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallets_userId_fkey";
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EmailVerification table
CREATE TABLE IF NOT EXISTS "email_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_verifications_userId_idx" ON "email_verifications"("userId");

ALTER TABLE "email_verifications" DROP CONSTRAINT IF EXISTS "email_verifications_userId_fkey";
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PasswordReset table
CREATE TABLE IF NOT EXISTS "password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "password_resets_userId_idx" ON "password_resets"("userId");

ALTER TABLE "password_resets" DROP CONSTRAINT IF EXISTS "password_resets_userId_fkey";
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- LoginHistory table
CREATE TABLE IF NOT EXISTS "login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ip" TEXT,
    "browser" TEXT,
    "device" TEXT,
    "country" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_history_userId_idx" ON "login_history"("userId");

ALTER TABLE "login_history" DROP CONSTRAINT IF EXISTS "login_history_userId_fkey";
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop email/username from players (identity now lives on users)
-- Only drop if columns exist
DO $$ BEGIN
  ALTER TABLE "players" DROP COLUMN IF EXISTS "email";
  ALTER TABLE "players" DROP COLUMN IF EXISTS "username";
EXCEPTION WHEN undefined_column THEN null;
END $$;

-- Data Migration: Create Wallet records from existing Player addresses
INSERT INTO "wallets" ("id", "userId", "address", "isPrimary", "verifiedAt", "createdAt")
SELECT
  gen_random_uuid()::text,
  p."userId",
  p."address",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "players" p
WHERE p."address" IS NOT NULL
  AND p."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "wallets" w WHERE w."address" = p."address")
ON CONFLICT DO NOTHING;
