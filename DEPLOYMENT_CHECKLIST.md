# 🚀 MAINNET DEPLOYMENT CHECKLIST

## ⚠️ CRITICAL STATUS: NOT READY FOR BROADCAST

**Current State:** .env.local contains dummy/testnet values. Real deployment will require mainnet values.

---

## 1️⃣ CONSTRUCTOR ARGUMENTS

These exact arguments will be passed to the Xolat contract on Celo Mainnet (chainId 42220):

### Argument #1: USDM Token Address
```
Parameter: usdmAddress
Current:   0x0000000000000000000000000000000000000000 (DUMMY)
Required:  Valid Mento USDm token address on Celo Mainnet
Source:    Must be set in NEXT_PUBLIC_USDM_TOKEN_ADDRESS env var
```

**⏳ ACTION REQUIRED:** Verify against Mento's official token list for Celo Mainnet
- Official Mento docs: https://mento.org/
- Expected format: 0x... (40 hex characters)
- DO NOT use: Testnet addresses, USDc, or other tokens

### Argument #2: Witnet Randomness Contract
```
Parameter:  witnetAddress
Value:      0xC0FFEE98AD1434aCbDB894BbB752e138c1006fAB
Network:    ✅ VERIFIED Celo Mainnet (chainId 42220)
Source:     Must be set in WITNET_RANDOMNESS_ADDRESS
```

**✅ VERIFIED:** Mainnet runtime bytecode exists at this address. `scripts/deploy.ts`
checks both the USDm and Witnet addresses for deployed bytecode before broadcasting.

---

## 2️⃣ DEPLOYER WALLET

The wallet used to deploy the contract will be derived from the PRIVATE_KEY environment variable.

```
Current:   0x0000000000000000000000000000000000000000... (from dummy key)
Required:  Real deployer wallet address
```

**⏳ ACTION REQUIRED BEFORE DEPLOYMENT:**

1. **Provide valid PRIVATE_KEY** in .env or as env var
   - Must be a private key with funds on Celo Mainnet
   - Format: 0x followed by 64 hex characters (256 bits)

2. **Verify deployer has sufficient CELO balance**
   - Minimum required: ~0.02 CELO for gas
   - Recommended: Add 30% buffer (e.g., 0.026 CELO minimum)
   - This will be checked automatically when you run the real deployment

3. **Deployer must be the contract owner**
   - The deployed contract will be owned by the wallet that deploys it
   - Only the owner can call `setMaxBet()` to adjust betting limits

---

## 3️⃣ NETWORK CONFIGURATION

### RPC URL
```
Current:   Must be set to a Celo Mainnet RPC URL
Required:  Celo Mainnet RPC URL
```

**Must be set in:** `CELO_MAINNET_RPC_URL` env var or in .env.local

**Recommended public endpoints:**
- `https://1rpc.io/celo` (Celo via 1RPC)
- `https://celo-mainnet.infura.io/v3/YOUR-PROJECT-ID` (if using Infura)
- Or your own node if running one

### Chain ID
```
Value:  42220
Status: ✅ Hardcoded and verified
```

---

## 4️⃣ ENVIRONMENT VARIABLES TO SET

Before running the real deployment, you **must** set these in your environment:

```bash
export NEXT_PUBLIC_USDM_TOKEN_ADDRESS="0x..." # Mento USDm on Celo Mainnet
export WITNET_RANDOMNESS_ADDRESS="0xC0FFEE98AD1434aCbDB894BbB752e138c1006fAB"
export CELO_MAINNET_RPC_URL="https://..."     # Celo mainnet RPC endpoint
export PRIVATE_KEY="0x..."                    # Your deployer private key (256-bit)
export CELOSCAN_API_KEY="..."                 # Optional: for auto-verification
```

Or create a .env.mainnet file:
```
NEXT_PUBLIC_USDM_TOKEN_ADDRESS=0x...
WITNET_RANDOMNESS_ADDRESS=0xC0FFEE98AD1434aCbDB894BbB752e138c1006fAB
CELO_MAINNET_RPC_URL=https://...
PRIVATE_KEY=0x...
CELOSCAN_API_KEY=...
```

---

## 5️⃣ SAFETY CAPS (HARDCODED — CANNOT BE OVERRIDDEN)

These demo limits are hardcoded in the contract and script:

```
Max Bet Per Transaction: 1 USDm   (~$1)
Max Bet Per Day:         5 USDm   (~$5)
```

**These cannot be changed by this deployment script.**
- To raise limits later, you must execute a separate owner transaction
- Calling `setMaxBet(newPerTx, newPerDay)` on the deployed contract
- This is intentional safety feature for demo/hackathon phase

---

## 6️⃣ DEPLOYMENT COMMAND (DO NOT RUN YET)

Once you have verified all above items, the deployment command will be:

```bash
NEXT_PUBLIC_USDM_TOKEN_ADDRESS=0x... \
WITNET_RANDOMNESS_ADDRESS=0xC0FFEE98AD1434aCbDB894BbB752e138c1006fAB \
CELO_MAINNET_RPC_URL=https://... \
PRIVATE_KEY=0x... \
CELOSCAN_API_KEY=... \
npx hardhat run scripts/deploy.ts --network celo-mainnet
```

---

## ✅ PRE-DEPLOYMENT VERIFICATION CHECKLIST

**DO NOT BROADCAST until you have checked ALL items:**

- [ ] NEXT_PUBLIC_USDM_TOKEN_ADDRESS is the correct Mento USDm token on **Celo Mainnet** (verified against official Mento list)
- [ ] WITNET_RANDOMNESS_ADDRESS is `0xC0FFEE98AD1434aCbDB894BbB752e138c1006fAB`
- [ ] USDm and Witnet addresses have deployed bytecode on Celo Mainnet
- [ ] CELO_MAINNET_RPC_URL points to Celo Mainnet
- [ ] PRIVATE_KEY is a valid private key with > 0.026 CELO on Celo Mainnet
- [ ] Demo safety caps (1 USDm/tx, 5 USDm/day) are acceptable for your use case
- [ ] You understand this is a DEMO/HACKATHON deployment (NOT production-ready, NOT audited)

---

## 📍 NEXT STEPS

1. **Gather mainnet values** for both constructor arguments
2. **Verify each value** against official sources (Mento and Witnet documentation)
3. **Confirm the keeper has CELO** to pay Witnet request fees
4. **Verify deployer wallet** has sufficient CELO balance
5. **Set environment variables** (or update .env.local)
6. **Run dry-run test:** `DRY_RUN=true npx hardhat run scripts/deploy.ts --network celo-mainnet`
7. **Get explicit confirmation** from user (you, the developer)
8. **Then and only then:** Run the real deployment command

---

## ❌ DO NOT PROCEED IF

- Any .env variable is still a dummy value (all zeros, `1`, etc.)
- CELO_MAINNET_RPC_URL does not point to Celo Mainnet
- Deployer wallet has insufficient CELO balance
- You have not verified constructor arguments against official sources

---

**This deployment will broadcast a REAL transaction to Celo Mainnet.**
**There is NO UNDO — verify everything before proceeding.**

