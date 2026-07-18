# Section B: NextAuth Multi-Auth Testing Report

## Current Architecture Analysis

### Database Models
- **Player**: Game-specific model (address@unique, email@unique, gamedata)
- **User**: NextAuth model (email@unique, accounts, sessions)
- **Account**: NextAuth linking model (provider + providerAccountId)
- **Session**: NextAuth session management

### Issues Identified

#### 1. **Dual Email Unique Constraints**
```
Player.email @unique
User.email @unique
```
**Risk**: Wallet user sets email → Player has email. Later Google auth with same email creates User with email → UNIQUE constraint violation.

**Mitigation**: `allowDangerousEmailAccountLinking: true` on Google provider partially addresses, but unclear if it properly handles Player ↔ User linkage.

#### 2. **Missing NextAuth Integration in Login Flow**
- Login page only displays ConnectButton (wagmi)
- No visible NextAuth `signIn()` calls for multi-auth
- ConnectButton connects wallet via wagmi, but doesn't call NextAuth
- Need to verify: Does `/api/auth/wallet` endpoint create User records? How are sessions established?

#### 3. **Separate Authentication Flows**
- **Wallet**: wagmi → `/api/auth/wallet` → Player created → But User session?
- **Google/Email**: Not integrated into login page UI yet

---

## Test Plan

### Test 1: Wallet Authentication Flow
**Objective**: Verify single wallet auth creates proper Player + User records

**Steps**:
1. Start with clean database
2. Connect metamask wallet to login page
3. Verify in DB:
   - Player record created with address
   - User record created with email = address
   - Account record created with provider="wallet"
   - Session established

**Expected**: Single Player and single User record

**Current Status**: ❌ UNKNOWN - Need to test

---

### Test 2: Add Google OAuth
**Objective**: Test linking Google to existing wallet account

**Setup**:
1. Complete Test 1 (wallet account exists)
2. Add Google OAuth button to login page
3. User clicks "Sign in with Google"
4. Authorize with Google account

**Verification**:
1. No new Player record (should reuse existing)
2. New Account record created with provider="google"
3. User record updated with Google's email (or kept as address?)
4. Session reflects merged accounts
5. Check: allowDangerousEmailAccountLinking prevents duplicates?

**Expected**: Same Player, same User, 2 Account records

**Current Status**: ❌ NOT IMPLEMENTED in UI

---

### Test 3: Add Email Magic Link
**Objective**: Test adding third auth method

**Setup**:
1. Complete Tests 1-2 (wallet + Google)
2. Add email provider to login UI
3. User enters email, receives magic link, clicks it

**Verification**:
1. No new Player/User records
2. Third Account record created with provider="email"
3. Email verified properly
4. Can sign in with any of 3 methods and reach same Player account

**Expected**: Same Player, same User, 3 Account records

**Current Status**: ❌ NOT IMPLEMENTED in UI

---

### Test 4: Session Persistence
**Objective**: Verify session works across all auth methods

**Steps**:
1. After linking all 3 methods
2. Sign out
3. Sign back in with Google
4. Verify session.user has access to Player data (id, address)
5. Sign out, sign in with email link
6. Verify same access

**Expected**: Consistent session across all methods

**Current Status**: ⚠️ PARTIAL - wagmi persistence exists, NextAuth session unclear

---

### Test 5: Player Data Integrity
**Objective**: Verify player stats remain consistent across auth methods

**Steps**:
1. After linking all methods
2. Play a game, win some USDm
3. Sign out
4. Sign in with different provider
5. Verify totalWonUsdm and other stats are preserved

**Expected**: Stats identical regardless of auth method used

**Current Status**: ❌ UNKNOWN

---

## Code Review Findings

### src/lib/auth.ts
- ✅ PrismaAdapter properly configured
- ✅ allowDangerousEmailAccountLinking: true (good)
- ⚠️ Credentials provider only checks message format, no Player linkage
- ❌ No callback to link Player.address to User record

### src/app/api/auth/wallet/route.ts
- ✅ Creates Player record properly
- ❌ **Missing**: Does not create User record
- ❌ **Missing**: Does not establish NextAuth session
- Should this endpoint return credentials for CredentialsProvider?

### src/app/login/page.tsx
- ✅ Framer Motion animations nice
- ❌ Only shows wallet connection
- ❌ No Google button
- ❌ No email link option
- ❌ No explicit NextAuth signIn() calls

### src/components/user-profile.tsx
- ✅ Uses NextAuth `useSession()`
- Suggests NextAuth sessions should exist

---

## Required Fixes

### Priority 1: Fix Wallet-NextAuth Handoff
**File**: `src/app/api/auth/wallet/route.ts`

The wallet endpoint creates a Player but doesn't bridge to NextAuth. Options:
1. **Option A**: Have wallet endpoint return Player data for CredentialsProvider to process
2. **Option B**: Have wallet endpoint directly create User record with email = address
3. **Option C**: Modify CredentialsProvider to look up Player and create linked User

**Recommendation**: Option C - CredentialsProvider should:
```typescript
const player = await prisma.player.findUnique({ where: { address } })
const user = await prisma.user.upsert({
  where: { email: player.address },
  create: { email: player.address, name: player.address.slice(0, 6) + "..." },
  update: {}
})
// Link them? Or keep separate and use callbacks?
```

### Priority 2: Update Login UI
Add Google and Email buttons that call NextAuth `signIn()`:
```typescript
import { signIn } from "next-auth/react"

// Google button
<button onClick={() => signIn("google")}>Sign in with Google</button>

// Email button
<button onClick={() => signIn("email", { email })}>Send Magic Link</button>
```

### Priority 3: Add Account Linking Endpoints
Create `/api/auth/link/[provider]` endpoints to link additional auth methods to existing session.

### Priority 4: Database Schema Alignment
Consider:
- Add userId (NextAuth User.id) to Player model for direct linkage
- Or add playerId to User model
- Or use email as the bridge (if reliably unique)

---

## Testing Environment

**Test Database**:
```bash
# Create test DB
createdb xopredict_test

# Run migrations
DATABASE_URL=postgres://user:pass@localhost/xopredict_test npx prisma migrate deploy

# Clear between tests
npx prisma db push --skip-generate (with schema reset)
```

**Auth Credentials**:
- Google OAuth: Use test account
- Email: Use temp email service (test@example.com)
- Wallet: Use Hardhat test wallet (0x70997970C51812e339D9B73b0245ad59E6f328F7)

---

## Next Steps

1. ✅ Create this test plan (DONE)
2. 🟡 Fix wallet-NextAuth handoff (Priority 1)
3. 🟡 Add Google/Email UI buttons (Priority 2)
4. 🟡 Run Test 1: Wallet auth
5. 🟡 Run Test 2: Google linking
6. 🟡 Run Test 3: Email linking
7. 🟡 Run Tests 4-5: Persistence & integrity
8. Document results and adjust schema if needed

---

## Status
**Created**: 2026-07-18
**Last Updated**: INITIAL
**Priority**: URGENT (blocks production readiness)
