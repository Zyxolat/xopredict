#!/usr/bin/env node
// Standalone dry-run simulation — no npm packages required.
// Reads bytecode directly from the compiled artifact.
// Mirrors the output of: DRY_RUN=true npx hardhat run scripts/deploy.ts
"use strict";

const fs   = require("fs");
const path = require("path");

// ─── Constants (must match deploy.ts) ────────────────────────────────────────

const CELO_MAINNET_CHAINID       = 42220;

// Demo safety caps (1 USDm = 1e18 units)
const DEMO_MAX_BET_PER_TX_UNITS  = BigInt("1000000000000000000");  // 1.0 USDm
const DEMO_MAX_BET_PER_DAY_UNITS = BigInt("5000000000000000000");  // 5.0 USDm

// Absolute guard — script refuses to set caps above these
const ABSOLUTE_CAP_PER_TX_UNITS  = BigInt("2000000000000000000");  // 2.0 USDm
const ABSOLUTE_CAP_PER_DAY_UNITS = BigInt("10000000000000000000"); // 10.0 USDm

// Reference gas price for offline display only
const CELO_REFERENCE_GAS_PRICE   = BigInt("5000000000"); // 5 gwei

// ─── Minimal helpers ─────────────────────────────────────────────────────────

function formatUnits(units, decimals) {
  const s   = units.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, s.length - decimals) || "0";
  const frac = s.slice(s.length - decimals).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}

function isAddress(addr) {
  return typeof addr === "string" && /^0x[0-9a-fA-F]{40}$/.test(addr);
}

// ─── Safety gate ─────────────────────────────────────────────────────────────

function enforceDemoCaps() {
  if (
    DEMO_MAX_BET_PER_TX_UNITS  > ABSOLUTE_CAP_PER_TX_UNITS ||
    DEMO_MAX_BET_PER_DAY_UNITS > ABSOLUTE_CAP_PER_DAY_UNITS
  ) {
    throw new Error(
      `🚨 SAFETY VIOLATION: Demo caps exceed absolute guard ($2/tx, $10/day). ` +
      `Edit ABSOLUTE_CAP constants — not the demo caps — to raise limits.`
    );
  }
}

// ─── Load artifact ───────────────────────────────────────────────────────────

function loadXolatBytecode() {
  const artifactPath = path.join(
    __dirname, "..", "artifacts", "contracts", "Xolat.sol", "Xolat.json"
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Artifact not found at ${artifactPath}\n` +
      `Run 'npx hardhat compile' first (once node_modules is installed).`
    );
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  return artifact.bytecode; // "0x..."
}

// ─── Main dry-run ─────────────────────────────────────────────────────────────

function main() {
  enforceDemoCaps();

  // ── Warning banner
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("⚠️  DEMO DEPLOYMENT TO MAINNET — SMALL AMOUNTS ONLY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log("🔴 CRITICAL WARNINGS:");
  console.log("  1. This is a HACKATHON DEMO deployment ONLY");
  console.log("  2. Contract is NOT audited and NOT production-ready");
  console.log("  3. Betting limits hardcoded to DEMO CAPS:");
  console.log(`     • Max per transaction: ${formatUnits(DEMO_MAX_BET_PER_TX_UNITS, 18)} USDm (~$1)`);
  console.log(`     • Max per day:         ${formatUnits(DEMO_MAX_BET_PER_DAY_UNITS, 18)} USDm (~$5)`);
  console.log("  4. Raising limits requires a SEPARATE manual transaction");
  console.log("     (not possible via this deploy script)");
  console.log("  5. NO refunds guaranteed on this demo contract");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── Config
  const usdmAddress = process.env.NEXT_PUBLIC_USDM_TOKEN_ADDRESS || "";
  const witnetAddress = process.env.WITNET_RANDOMNESS_ADDRESS || "";
  const isDryRunPlaceholder = !usdmAddress || !witnetAddress;

  const configuredUsdmAddress = isDryRunPlaceholder ? "<NOT SET — provide env var>" : usdmAddress;
  const configuredWitnetAddress = isDryRunPlaceholder ? "<NOT SET — provide env var>" : witnetAddress;

  console.log("🎯 TARGET NETWORK: Celo Mainnet");
  console.log("   Mode:         DRY RUN ✓ (no broadcast)\n");

  console.log("🧪 DRY RUN MODE — no transactions will be broadcast");
  console.log("   (offline simulation — no live RPC required)\n");

  // ── Configuration table
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│  DEPLOYMENT CONFIGURATION                                   │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│  Target network  : Celo Mainnet (chainId ${CELO_MAINNET_CHAINID})              │`);
  console.log(`│  USDM address    : ${configuredUsdmAddress}`);
  console.log(`│  Witnet address  : ${configuredWitnetAddress}`);
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  // ── Demo caps
  console.log("🔒 DEMO SAFETY CAPS (hardcoded — script refuses to exceed $2/tx, $10/day):");
  console.log(`   Max bet per tx:   ${formatUnits(DEMO_MAX_BET_PER_TX_UNITS, 18)} USDm  (~$1)`);
  console.log(`   Max bet per day:  ${formatUnits(DEMO_MAX_BET_PER_DAY_UNITS, 18)} USDm  (~$5)`);
  console.log(`   Raising limits:   requires separate manual owner tx — NOT via this script\n`);

  // ── Offline gas estimate from artifact bytecode
  const bytecodeHex   = loadXolatBytecode();
  const bytecodeBytes = BigInt((bytecodeHex.length - 2) / 2); // subtract "0x"
  const estimatedGas  = bytecodeBytes * 200n + 300_000n;
  const estimatedCostWei = estimatedGas * CELO_REFERENCE_GAS_PRICE;

  console.log("📊 OFFLINE GAS ESTIMATE (5 gwei Celo reference — not from live network):");
  console.log(`   Artifact source:  artifacts/contracts/Xolat.sol/Xolat.json`);
  console.log(`   Bytecode size:    ${bytecodeBytes.toLocaleString()} bytes`);
  console.log(`   Estimated gas:    ~${estimatedGas.toLocaleString()} gas units`);
  console.log(`   Reference price:  5 gwei (typical Celo mainnet)`);
  console.log(`   Estimated cost:   ~${formatUnits(estimatedCostWei, 18)} CELO\n`);

  // ── Offline validation
  console.log("🔍 OFFLINE VALIDATION:");
  if (isDryRunPlaceholder) {
    console.log("   ⚠️  USDM / Witnet env vars not set — using placeholders for this dry run");
    console.log("   ⚠️  Set NEXT_PUBLIC_USDM_TOKEN_ADDRESS and WITNET_RANDOMNESS_ADDRESS before real deployment");
  } else {
    if (!isAddress(usdmAddress)) {
      throw new Error(`NEXT_PUBLIC_USDM_TOKEN_ADDRESS is not a valid address: "${usdmAddress}"`);
    }
    if (!isAddress(witnetAddress)) {
      throw new Error(`WITNET_RANDOMNESS_ADDRESS is not a valid address: "${witnetAddress}"`);
    }
    console.log(`   ✅ USDM address format valid (${usdmAddress})`);
    console.log(`   ✅ Witnet address format valid (${witnetAddress})`);
  }
  console.log(`   ✅ Demo caps within absolute guard ($2/tx, $10/day)\n`);

  // ── What would happen in a real deployment
  console.log("📋 DEPLOYMENT SEQUENCE (real run — for reference):");
  console.log("   1. Validate chainId === 42220 (Celo Mainnet)");
  console.log("   2. Estimate live gas from provider.getFeeData()");
  console.log("   3. Confirm USDM and Witnet contract code exist on-chain");
  console.log("   4. Deploy Xolat.sol with constructor args below");
  console.log("   5. Call setMaxBet(1 USDm, 5 USDm) — apply demo caps");
  console.log("   6. Auto-verify on Celoscan via hardhat-verify\n");

  console.log("📋 CONSTRUCTOR ARGUMENTS:");
  console.log(`   usdmAddress      = "${configuredUsdmAddress}"`);
  console.log(`   witnetAddress    = "${configuredWitnetAddress}"\n`);

  // ── Commands
  console.log("📋 REAL DEPLOYMENT COMMAND (when you are ready to broadcast):");
  console.log(`   NEXT_PUBLIC_USDM_TOKEN_ADDRESS=${configuredUsdmAddress} \\`);
  console.log(`   WITNET_RANDOMNESS_ADDRESS=${configuredWitnetAddress} \\`);
  console.log(`   CELO_MAINNET_RPC_URL=<rpc_url> \\`);
  console.log(`   PRIVATE_KEY=<deployer_key> \\`);
  console.log(`   CELOSCAN_API_KEY=<api_key> \\`);
  console.log(`   node_modules/.bin/hardhat run scripts/deploy.ts --network celo-mainnet\n`);

  console.log("📋 CELOSCAN VERIFICATION (runs automatically if CELOSCAN_API_KEY is set):");
  console.log(`   node_modules/.bin/hardhat verify --network celo-mainnet <CONTRACT_ADDRESS> \\`);
  console.log(`     "${configuredUsdmAddress}" \\`);
  console.log(`     "${configuredWitnetAddress}"\n`);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("✅ DRY RUN COMPLETE — all offline checks passed");
  console.log("   No transactions were broadcast.");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

try {
  main();
} catch (err) {
  console.error("\n❌ DRY RUN FAILED:");
  console.error(err.message);
  process.exit(1);
}
