# XOLAT V3 Implementation Guide

## ✅ COMPLETED FEATURES

### 1. **Daily Free Play** ✅
- **Endpoint**: `GET/POST /api/daily-free-play`
- **Component**: `DailyFreePlay` 
- **Features**:
  - 1 free 0.1 USDm solo per 24h
  - Streak multiplier (1.1x per day, capped at 2x)
  - Smart contract integration for bet validation

### 2. **Seasons** ✅
- **Endpoint**: `GET/POST /api/seasons`
- **Features**:
  - 30-day seasons with XP tracking
  - Leaderboard by XP per season
  - Admin can create/close seasons
  - Database: `seasons`, `season_xp` tables

### 3. **Referrals** ✅
- **Endpoint**: `GET/POST /api/referrals`
- **Features**:
  - `?ref=address` URL parameter support
  - Both referrer & referee get 1 USDm after first bet
  - Track referral relationships in DB
  - Utility: `extractReferrer()`, `generateReferralURL()`

### 4. **Ranks/Leaderboard** ✅
- **Utility**: `calculateRank()` in `gamification.ts`
- **Ranks**:
  - Bronze: 0-99 USDm won
  - Silver: 100-499 USDm
  - Gold: 500-1,999 USDm
  - Diamond: 2,000+ USDm
- **Integrated** with Player model & leaderboard API

### 5. **Share Win** ✅
- **Endpoint**: `GET /api/share-win?roundId=...&format=json|png-data`
- **Component**: `ShareWin`
- **Features**:
  - PNG generation with html2canvas
  - 1-click sharing to Twitter, Farcaster, Telegram
  - Dynamic share URLs pre-built
  - Social card templates

### 6. **Live Feed** ✅
- **Endpoint**: `GET /api/live-feed?limit=20`
- **Component**: `LiveFeed`
- **Features**:
  - Real-time win ticker
  - Auto-polling (5s intervals)
  - Shows winner, amount, timestamp
  - Contract event listener ready

### 7. **Private Arenas** ✅
- **Endpoint**: `GET/POST /api/private-arenas`
- **Features**:
  - Create private arenas with invite codes
  - Join by code
  - Limit 2-6 players
  - In-memory storage (migrate to DB in production)

### 8. **Seed Reveal (Provably Fair V2)** ✅
- **Endpoint**: `GET /api/verify?roundId=...`
- **Features**:
  - Show server_seed, client_seed, nonce, vrfRandom
  - Re-compute numbers from seeds (SHA256)
  - Verify winner calculation
  - Used in contract `revealSeeds()` + UI at `/verify`

### 9. **Cosmetics Shop** ✅
- **Endpoint**: `GET/POST /api/cosmetics`
- **Component**: `CosmeticsShop`
- **Items**:
  - Card backs (5 USDm each)
  - Flip effects (10 USDm each)
  - Frames (15 USDm each)
- **Features**:
  - Purchase tracking
  - Prevent duplicate purchases
  - Balance validation

### 10. **VIP Pass** ✅
- **Endpoint**: `GET/POST /api/vip`
- **Component**: `VIPPass`
- **Features**:
  - 10 USDm/month
  - 0% fee on bets
  - Private arenas
  - Early season access
  - 30-day duration

### 11. **Safety & Compliance** ✅
- **Utility**: `compliance.ts`
- **Smart Contract**:
  - Blacklist/ban addresses
  - Emergency pause
  - Admin refund function
- **Features**:
  - Max 100 USDm/day, 20 USDm/bet
  - 5 losses = 1hr cooldown
  - IP geolocking ready (MaxMind integration)
  - TOS/18+ popup component
- **Component**: `TOSPopup`

### 12. **Admin Functions** ✅
- **Endpoint**: `POST /api/admin`
- **Actions**:
  - Ban/unban players
  - Manual refunds
  - Emergency stats
  - Admin key auth

### 13. **Smart Contract Updates** ✅
- **File**: `contracts/Xolat.sol`
- **New Features**:
  - VRF random tracking
  - Player stats tracking
  - Cooldown mechanism
  - Blacklist support
  - Seed revelation function
  - `revealSeeds()` for provably fair

---

## 🛠️ SETUP INSTRUCTIONS

### 1. **Database Setup**

```bash
# Run this SQL in Supabase SQL Editor
create extension if not exists "uuid-ossp";
create type round_type as enum ('arena', 'solo');
create type cosmetic_type as enum ('card_back', 'flip_fx', 'frame');

create table players (
  id uuid primary key default uuid_generate_v4(),
  address text unique not null,
  email text unique,
  username text unique,
  total_won_usdm numeric(36,18) default 0,
  total_played int default 0,
  daily_bet_total_usdm numeric(36,18) default 0,
  last_bet_date date default current_date,
  rank text default 'Bronze',
  onboarded boolean default false,
  is_banned boolean default false,
  streak_days int default 0,
  last_free_play timestamp,
  created_at timestamp default now()
);

create table rounds (
  id uuid primary key default uuid_generate_v4(),
  round_id bigint unique not null,
  type round_type not null,
  commit_hash text not null,
  server_seed text,
  client_seed text,
  nonce int,
  vrf_random text,
  numbers int[],
  winner_address text,
  pot_usdm numeric(36,18),
  tx_hash text,
  vrf_request_id text,
  status text default 'pending',
  created_at timestamp default now()
);

create table picks (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid references rounds(id) on delete cascade,
  player_address text not null,
  card_index int not null,
  value int
);

create table referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_address text not null,
  referee_address text unique not null,
  bonus_claimed boolean default false,
  created_at timestamp default now()
);

create table seasons (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date timestamp not null,
  end_date timestamp not null,
  is_active boolean default true
);

create table season_xp (
  id uuid primary key default uuid_generate_v4(),
  player_address text not null,
  season_id uuid references seasons(id),
  xp int default 0,
  unique(player_address, season_id)
);

create table cosmetics_owned (
  id uuid primary key default uuid_generate_v4(),
  player_address text not null,
  type cosmetic_type not null,
  name text not null,
  purchased_at timestamp default now()
);
```

### 2. **Environment Setup**

```bash
cp .env.example .env.local

# Fill in:
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_role_key
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ADMIN_KEY=your_secure_admin_key
```

### 3. **Database Sync**

```bash
npm install -D @prisma/client
npx prisma generate
npx prisma db push
```

### 4. **Smart Contract Deployment**

```bash
# Install Hardhat dependencies
npm install

# Compile
npx hardhat compile

# Run the full randomness lifecycle locally with MockWitnetRandomness
TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat test test/Xolat.test.ts test/Xolat.witnet.spec.ts

# Live deployments are currently Celo Mainnet-only because Witnet has no
# supported Celo Sepolia randomness deployment.
DRY_RUN=true TS_NODE_PROJECT=tsconfig.hardhat.json npx hardhat run scripts/deploy.ts
# Set NEXT_PUBLIC_USDM_TOKEN_ADDRESS, WITNET_RANDOMNESS_ADDRESS,
# CELO_MAINNET_RPC_URL, and PRIVATE_KEY before a real deployment.
npx hardhat run scripts/deploy.ts --network celo-mainnet

# Set NEXT_PUBLIC_XOLAT_CONTRACT_ADDRESS in .env.local
```

### 5. **Install Components Dependencies**

```bash
# For Share Win PNG generation
npm install html2canvas

# For Web3
npm install wagmi viem @reown/appkit
```

### 6. **Start Development**

```bash
npm run dev
```

---

## 📋 API REFERENCE

### Daily Free Play
```
GET /api/daily-free-play?address=0x...
POST /api/daily-free-play { address: string }
```

### Referrals
```
GET /api/referrals?address=0x...
POST /api/referrals { playerAddress: string, referrerAddress: string }
```

### Seasons
```
GET /api/seasons?address=0x...
POST /api/seasons { name, durationDays } (admin)
```

### Cosmetics
```
GET /api/cosmetics?address=0x...
POST /api/cosmetics { address, type, name }
```

### VIP Pass
```
GET /api/vip?address=0x...
POST /api/vip { address }
```

### Verify Seed
```
GET /api/verify?roundId=...
```

### Share Win
```
GET /api/share-win?roundId=...&format=json|png-data
```

### Live Feed
```
GET /api/live-feed?limit=20
```

### Private Arenas
```
GET /api/private-arenas?address=0x...
GET /api/private-arenas?code=ABCDEF
POST /api/private-arenas { address, betAmount, maxPlayers }
```

### Admin
```
POST /api/admin { action, address, ... }
Authorization: Bearer <ADMIN_KEY>
```

---

## 🎮 FRONTEND INTEGRATION

### Add Components to Pages

```tsx
import { DailyFreePlay } from "@/components/daily-free-play";
import { LiveFeed } from "@/components/live-feed";
import { CosmeticsShop } from "@/components/cosmetics-shop";
import { VIPPass } from "@/components/vip-pass";
import { ShareWin } from "@/components/share-win";
import { TOSPopup } from "@/components/tos-popup";

export default function Page() {
  return (
    <>
      <TOSPopup />
      <DailyFreePlay />
      <LiveFeed />
      <CosmeticsShop />
      <VIPPass />
      <ShareWin winner="0x..." amount={24.5} roundId="..." />
    </>
  );
}
```

---

## 📊 UTILITY FUNCTIONS

### Gamification
```ts
calculateRank(totalWonUsdm)
calculateXP(betAmount, won, winAmount?)
calculateDailyMultiplier(streakDays)
calculateFreePlayAmount(multiplier)
isEligibleForFreePlay(lastFreePlay)
verifySeedReveal(serverSeed, clientSeed, nonce)
generateCommitHash(serverSeed, clientSeed)
getCosmeticPrice(type, name)
validateCosmeticPurchase(type, name, balance)
calculateCooldown(recentLosses, lastLossTime)
```

### Referrals
```ts
isValidReferralCode(address)
generateReferralURL(baseURL, referrerAddress)
extractReferrer(searchParams)
awardReferralBonus(referrerAddress, refereeAddress)
```

### Compliance
```ts
isIPBlocked(ip)
validateDailyLimit(currentTotal, newBet, maxPerDay)
validatePerBetLimit(betAmount, maxPerBet)
getIPFromRequest(request)
```

---

## 🔐 SECURITY NOTES

1. **Never commit `.env.local`** - Use `.env.example` only
2. **Admin API** requires `Authorization: Bearer <ADMIN_KEY>`
3. **Smart contract** has reentrancy guards and pausable mechanism
4. **Blacklist** is checked on every bet
5. **Daily limits** enforced in contract + backend
6. **Cooldown** tracked in contract after 5 losses
7. **IP blocking** ready (Vercel middleware can be added)
8. **TOS popup** stored in localStorage

---

## 📝 TESTING CHECKLIST

- [ ] Daily free play claims
- [ ] Referral linking works
- [ ] Season XP tracking
- [ ] Rank calculation accurate
- [ ] Cosmetics purchase logic
- [ ] VIP pass active/inactive states
- [ ] Seed verification (compare hash)
- [ ] Share win PNG generation
- [ ] Live feed updates (5s polling)
- [ ] Private arena creation & joining
- [ ] Admin ban/unban works
- [ ] Cooldown after 5 losses
- [ ] Daily limit enforcement (100 USDm)
- [ ] Per-bet limit (20 USDm)

---

## 🚀 DEPLOYMENT

### Vercel
```bash
vercel --env-file=.env.local
```

### Supabase Connection
- Ensure `DATABASE_URL` points to Supabase
- Use `SUPABASE_SERVICE_ROLE_KEY` for server-side auth

### Smart Contract
- Run contract lifecycle tests locally with Hardhat and `MockWitnetRandomness`
- Deploy live only to Celo Mainnet using the verified Witnet randomness address
- Update `NEXT_PUBLIC_XOLAT_CONTRACT_ADDRESS` after deployment

---

## 📞 SUPPORT

For issues, check:
1. Database migrations (`npx prisma db push`)
2. Environment variables (`echo $DATABASE_URL`)
3. Smart contract events (check Celo Mainnet Blockscout or Celoscan)
4. API response codes (404 vs 400 vs 500)
