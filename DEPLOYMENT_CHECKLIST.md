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

### Argument #2: Chainlink VRF Coordinator
```
Parameter:  vrfCoordinator
Value:      0xd89b25491e4eb9b61ef1427d44541872d8160b1a
Network:    ✅ VERIFIED Celo Mainnet (chainId 42220)
VRF Type:   Chainlink VRF v2.5
Source:     Hardcoded in scripts/deploy.ts — CANNOT BE OVERRIDDEN
```

**✅ VERIFIED:** This address is correct for Celo Mainnet VRF v2.5
- Cross-checked against Chainlink Celo documentation
- Not a testnet address

### Argument #3: VRF Key Hash
```
Parameter:  keyHash
Value:      0x60cd629669c2cc0fa6eac7e5fab989f51991b01d6d56986d110ac9fa59e33406
Network:    ✅ VERIFIED Celo Mainnet (chainId 42220)
Source:     Hardcoded in scripts/deploy.ts — CANNOT BE OVERRIDDEN
```

**✅ VERIFIED:** This keyHash is correct for Celo Mainnet VRF v2.5

### Argument #4: VRF Subscription ID
```
Parameter: subscriptionId
Current:   1 (DUMMY/TESTNET)
Required:  Valid Celo Mainnet Chainlink VRF subscription ID
Source:    Must be set in CHAINLINK_SUB_ID env var
```

**⏳ ACTION REQUIRED:** Provide your funded Chainlink VRF subscription ID on Celo Mainnet
- Must be an active subscription on **Celo Mainnet** (not Alfajores testnet)
- Must be funded with LINK tokens
- Get this from: Chainlink VRF Dashboard (https://vrf.chain.link/) → Select Celo Mainnet

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
Current:   https://alfajores-forno.celo-testnet.org (TESTNET)
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

## 4️⃣ CHAINLINK VRF SUBSCRIPTION VERIFICATION

**Script cannot verify online subscription status without RPC access.**

**⏳ ACTION REQUIRED — MANUAL VERIFICATION:**

1. Go to Chainlink VRF Dashboard: https://vrf.chain.link/
2. Select **Celo Mainnet** (not Alfajores or other networks)
3. Verify your subscription ID has:
   - ✅ **Active status** (not paused or canceled)
   - ✅ **LINK balance > 0** (sufficient for your use case)
   - ✅ **Your deployer address as a consumer** (recommended but optional)
4. If the subscription is not funded or not on mainnet:
   - Fund it with LINK tokens
   - Or create a new mainnet subscription if needed

**DO NOT PROCEED if:**
- Subscription is on Alfajores testnet (wrong network)
- Subscription has 0 LINK balance
- Subscription status is "paused" or "canceled"

---

## 5️⃣ ENVIRONMENT VARIABLES TO SET

Before running the real deployment, you **must** set these in your environment:

```bash
export NEXT_PUBLIC_USDM_TOKEN_ADDRESS="0x..." # Mento USDm on Celo Mainnet
export CHAINLINK_SUB_ID="12345"                # Your mainnet VRF subscription ID
export CELO_MAINNET_RPC_URL="https://..."     # Celo mainnet RPC endpoint
export PRIVATE_KEY="0x..."                    # Your deployer private key (256-bit)
export CELOSCAN_API_KEY="..."                 # Optional: for auto-verification
```

Or create a .env.mainnet file:
```
NEXT_PUBLIC_USDM_TOKEN_ADDRESS=0x...
CHAINLINK_SUB_ID=12345
CELO_MAINNET_RPC_URL=https://...
PRIVATE_KEY=0x...
CELOSCAN_API_KEY=...
```

---

## 6️⃣ SAFETY CAPS (HARDCODED — CANNOT BE OVERRIDDEN)

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

## 7️⃣ DEPLOYMENT COMMAND (DO NOT RUN YET)

Once you have verified all above items, the deployment command will be:

```bash
NEXT_PUBLIC_USDM_TOKEN_ADDRESS=0x... \
CHAINLINK_SUB_ID=12345 \
CELO_MAINNET_RPC_URL=https://... \
PRIVATE_KEY=0x... \
CELOSCAN_API_KEY=... \
npx hardhat run scripts/deploy.ts --network celo-mainnet
```

---

## ✅ PRE-DEPLOYMENT VERIFICATION CHECKLIST

**DO NOT BROADCAST until you have checked ALL items:**

- [ ] NEXT_PUBLIC_USDM_TOKEN_ADDRESS is the correct Mento USDm token on **Celo Mainnet** (verified against official Mento list)
- [ ] CHAINLINK_SUB_ID is a valid Celo Mainnet VRF subscription ID (NOT Alfajores testnet)
- [ ] CHAINLINK_SUB_ID subscription is active and funded with LINK
- [ ] CELO_MAINNET_RPC_URL points to Celo Mainnet (NOT Alfajores testnet)
- [ ] PRIVATE_KEY is a valid private key with > 0.026 CELO on Celo Mainnet
- [ ] VRF Coordinator address: 0xd89b25491e4eb9b61ef1427d44541872d8160b1a ✅ Correct for Celo Mainnet
- [ ] VRF Key Hash: 0x60cd629669c2cc0fa6eac7e5fab989f51991b01d6d56986d110ac9fa59e33406 ✅ Correct for Celo Mainnet
- [ ] Demo safety caps (1 USDm/tx, 5 USDm/day) are acceptable for your use case
- [ ] You understand this is a DEMO/HACKATHON deployment (NOT production-ready, NOT audited)

---

## 📍 NEXT STEPS

1. **Gather mainnet values** for all 4 constructor arguments
2. **Verify each value** against official sources (Mento docs, Chainlink Celo docs)
3. **Check VRF subscription** is active and funded on Celo Mainnet
4. **Verify deployer wallet** has sufficient CELO balance
5. **Set environment variables** (or update .env.local)
6. **Run dry-run test:** `DRY_RUN=true npx hardhat run scripts/deploy.ts --network celo-mainnet`
7. **Get explicit confirmation** from user (you, the developer)
8. **Then and only then:** Run the real deployment command

---

## ❌ DO NOT PROCEED IF

- Any .env variable is still a dummy value (all zeros, `1`, etc.)
- CELO_MAINNET_RPC_URL points to Alfajores or any testnet
- CHAINLINK_SUB_ID is not a mainnet subscription
- Deployer wallet has insufficient CELO balance
- VRF subscription is not funded or not active
- You have not verified constructor arguments against official sources

---

**This deployment will broadcast a REAL transaction to Celo Mainnet.**
**There is NO UNDO — verify everything before proceeding.**

