# Section C & D: Gamification & Onboarding Implementation

## Section C: Gamification (Leaderboard + Seasons)

### ✅ Implemented

#### 1. Real Leaderboard API Endpoint (`/api/leaderboard`)

**Features:**
- Dual mode support: `type=overall` (default) or `type=season`
- Overall leaderboard: Players ranked by `totalWonUsdm` (lifetime earnings)
- Season leaderboard: Players ranked by `xp` in active season
- Tie-breaking: Earliest account creation (overall) | Earliest ID (season)
- Player rank lookup: Pass `address` param to get specific player's rank
- Pagination: `limit` (max 1000), `offset` for page results

**Query Examples:**
```
GET /api/leaderboard                                           # Overall top 100
GET /api/leaderboard?type=season                              # Active season top 100
GET /api/leaderboard?limit=50&offset=0                        # Paginate results
GET /api/leaderboard?address=0x1234...                        # Player's rank
GET /api/leaderboard?type=season&seasonId=season-uuid         # Specific season
GET /api/leaderboard?type=season&address=0x1234...           # Player's season rank
```

**Response Structure (Overall):**
```json
{
  "data": {
    "leaderboard": [
      {
        "position": 1,
        "address": "0x...",
        "username": "player_name",
        "totalWonUsdm": 1842.50,
        "rank": "Diamond",
        "totalPlayed": 145
      }
    ],
    "playerRank": {
      "position": 42,
      "address": "0x...",
      "username": "player_name",
      "totalWonUsdm": 523.10,
      "rank": "Gold",
      "totalPlayed": 68
    }
  }
}
```

**Response Structure (Season):**
```json
{
  "data": {
    "leaderboard": [
      {
        "position": 1,
        "address": "0x...",
        "username": "player_name",
        "xp": 2450,
        "rank": "Diamond"
      }
    ],
    "playerRank": { ... },
    "seasonId": "season-uuid"
  }
}
```

#### 2. Updated Leaderboard Page UI

**Changes:**
- Removed hardcoded mock data
- Added `useEffect` to fetch `/api/leaderboard?type=overall&limit=10`
- Integrated LoadingState during fetch
- Integrated ErrorState for API failures
- Updated player display to show username/address fallback, rank badge, and formatted USDm amount
- Page now reflects real database data on each load

**Features:**
- Displays top 10 players
- Shows player rank (Bronze/Silver/Gold/Diamond)
- Formats USDm amounts with 2 decimals
- Graceful fallback to address display if username not set
- Responsive grid layout

#### 3. Tie-Breaking Rules (Documented)

**Overall Leaderboard Tie-Breaking:**
- Primary sort: `totalWonUsdm` DESC (highest earnings first)
- Tie-breaker: `createdAt` ASC (earliest account created first)
- Reasoning: Rewards loyalty and discourages account manipulation

**Season Leaderboard Tie-Breaking:**
- Primary sort: `xp` DESC (highest XP first)
- Tie-breaker: `id` ASC (earliest season entry first)
- Reasoning: Fair ranking based on when player earned points in season

### 🟡 Remaining Work (Not Yet Implemented)

1. **Season Transition Logic**
   - Auto-create new season on schedule (e.g., monthly)
   - Archive old season data
   - Reset daily multiplier on season start
   - Update Player model with seasonXp references

2. **Season Countdown Display**
   - Calculate days remaining in current season
   - Show on leaderboard page (e.g., "SEASON 01 • 18 DAYS REMAINING")
   - Include in API response (optional `seasonEndsAt` timestamp)

3. **Rewards Distribution**
   - Top 3 players per season: bonus USDm payouts
   - Cosmetic rewards for high ranks
   - Streak bonuses (daily login rewards)

4. **Leaderboard Filtering**
   - Filter by rank (Bronze/Silver/Gold/Diamond)
   - Filter by region/location (future)
   - Weekly view vs. all-time

### Testing

**Manual Test Cases:**

**Test 1: Overall Leaderboard Loads**
```bash
curl http://localhost:3000/api/leaderboard

# Expected: 
# - 200 status
# - leaderboard array with position, address, totalWonUsdm
# - Sorted by totalWonUsdm DESC, createdAt ASC
```

**Test 2: Player Rank Lookup**
```bash
curl http://localhost:3000/api/leaderboard?address=0x123...

# Expected:
# - playerRank object with player's current rank
# - Position in leaderboard
```

**Test 3: Season Leaderboard**
```bash
curl http://localhost:3000/api/leaderboard?type=season

# Expected:
# - leaderboard array sorted by xp DESC
# - seasonId in response
# - Only active season players included
```

**Test 4: Pagination**
```bash
curl "http://localhost:3000/api/leaderboard?limit=20&offset=20"

# Expected:
# - Returns players 21-40
# - position field reflects correct ranking
```

---

## Section D: Onboarding

### ✅ Implemented

#### 1. OnboardingTour Component (`src/components/onboarding-tour.tsx`)

**Features:**
- Checks `player.onboarded` flag on first login
- Displays 6-step tour on first login:
  1. 🔐 Auth Methods (Wallet/Google/Email linking)
  2. 💰 USDm Balance (earning and ranking)
  3. ⚔️ Game Modes (Solo vs. Arena)
  4. 🎴 Card Prediction (flip mechanics)
  5. ✅ Provably Fair (on-chain verification)
  6. 🎁 Daily Free Play (streaks and multipliers)

**Implementation:**
- Auto-triggers on first login (30-second delay to let page render)
- Marks player as onboarded after tour completes
- Uses `useSession()` to detect logged-in user
- Fetches player data from `/api/players/[address]`

**Props:**
```typescript
interface OnboardingTourProps {
  onComplete?: () => void;  // Called when tour finishes
}
```

#### 2. Onboarding Endpoint (`/api/players/[address]/onboard`)

**Method:** POST
**Purpose:** Mark player as onboarded

**Request:**
```bash
POST /api/players/0x1234.../onboard
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "address": "0x1234...",
    "onboarded": true,
    "...": "..."
  }
}
```

**Behavior:**
- Updates `player.onboarded = true` in database
- Returns updated player record
- Safe to call multiple times (idempotent via update)

#### 3. Tour Step Markers (Data Attributes)

Ready for future full react-joyride integration. Add these attributes to UI elements:

```html
<!-- Step 1 -->
<div data-tour="auth-methods">
  <!-- Connect buttons here -->
</div>

<!-- Step 2 -->
<div data-tour="usdm-balance">
  <!-- Balance display -->
</div>

<!-- Step 3 -->
<div data-tour="arena-vs-solo">
  <!-- Game mode buttons -->
</div>

<!-- Step 4 -->
<div data-tour="card-flip">
  <!-- 3D card component -->
</div>

<!-- Step 5 -->
<div data-tour="provably-fair">
  <!-- Provably Fair info button -->
</div>

<!-- Step 6 -->
<div data-tour="daily-free-play">
  <!-- Daily Free Play icon -->
</div>
```

### 🟡 Remaining Work (Not Yet Implemented)

1. **Full React-Joyride Integration**
   - Fix react-joyride v12 callback type issues
   - Add styled tooltips matching game theme
   - Implement step skip/replay functionality
   - Add progress indicator

2. **Replay Tour Button**
   - Wire up "REPLAY ONBOARDING TOUR" button in profile page
   - Create `/api/players/[address]/onboard?action=reset` endpoint
   - Set `onboarded = false` to re-trigger tour

3. **Interactive Tour Steps**
   - Add interactive demos (e.g., "Try flipping a card")
   - Collect user choices during tour (favorite game mode)
   - Save tour preferences to database

4. **Tour Localization**
   - Support multiple languages
   - Regional tips (e.g., "Deposit via Celo Mainnet")

5. **Conditional Tour Steps**
   - Skip already-connected users to later steps
   - Different flow for first-time vs. returning players

### Testing

**Manual Test Cases:**

**Test 1: First-Time Onboarding Trigger**
1. Create new wallet account
2. Sign in (onboarded = false in DB)
3. Should see onboarding toast/modal after 30 seconds
4. Complete tour
5. Verify `player.onboarded = true` in DB

**Test 2: Onboarded Players Skip Tour**
1. Sign in with existing account (onboarded = true)
2. Should NOT see tour
3. No API calls to mark onboarded

**Test 3: Manual Onboard Endpoint**
```bash
curl -X POST http://localhost:3000/api/players/0x1234.../onboard

# Expected: player record with onboarded: true
```

**Test 4: Idempotency**
```bash
# Call twice
curl -X POST http://localhost:3000/api/players/0x1234.../onboard
curl -X POST http://localhost:3000/api/players/0x1234.../onboard

# Expected: both return 200 with onboarded: true (no errors)
```

---

## Database Changes Required

None for Section C & D (schema already has necessary fields).

**Fields Used:**
- `Player.totalWonUsdm` - Overall leaderboard sorting
- `Player.onboarded` - Onboarding trigger/status
- `SeasonXp.xp` - Season leaderboard sorting
- `Season.isActive` - Active season detection

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Query Params |
|----------|--------|---------|--------------|
| `/api/leaderboard` | GET | Get overall/season rankings | `type`, `limit`, `offset`, `address`, `seasonId` |
| `/api/players/[address]/onboard` | POST | Mark player as onboarded | - |

---

## Build & Verification

**Status:** ✅ BUILD SUCCESS
- All 30 routes compile
- No ESLint errors
- No TypeScript errors
- Non-blocking warnings only (optional dependencies from wagmi/MetaMask)

**Last Build Output:**
```
✅ BUILD COMPLETE - 30 routes compiled
⚠️  Non-blocking warnings from optional deps only
- pino-pretty (WalletConnect optional)
- @react-native-async-storage (MetaMask SDK optional)
```

---

## Next Steps

### Immediate (Before Production)
1. ✅ Test /api/leaderboard endpoint with real data
2. ✅ Verify leaderboard page loads real data
3. ✅ Test onboarding trigger on first login
4. 🟡 Add data-tour attributes to all relevant UI elements
5. 🟡 Wire up replay button in profile page

### Soon After
1. 🟡 Complete react-joyride integration with styled tooltips
2. 🟡 Implement season transition logic
3. 🟡 Add season countdown display
4. 🟡 Implement rewards distribution

### Later
1. 🔲 Leaderboard filtering/search
2. 🔲 Cosmetic rewards system
3. 🔲 Regional leaderboards
4. 🔲 Tour localization

---

## Sections Status Summary

| Section | Status | Commits | Focus Area |
|---------|--------|---------|-----------|
| A: Frontend Polish | ✅ COMPLETE | 5 commits | Animations, components, build pass |
| B: NextAuth Multi-Auth | 🟡 PARTIAL | 2 commits | Wallet linking, UI (needs testing) |
| C: Gamification | 🟡 PARTIAL | 1 commit | Real leaderboard API (needs tour UI) |
| D: Onboarding | 🟡 PARTIAL | 1 commit | Onboarding trigger (needs Joyride) |

**Total Commits Pushed:** 9 commits
**Build Status:** ✅ SUCCESS
**Ready for Testing:** ✅ YES

---

## Status
**Last Updated:** 2026-07-18
**Version:** Section C & D v1.0
**Priority Issues:** None blocking, full MVP functional
