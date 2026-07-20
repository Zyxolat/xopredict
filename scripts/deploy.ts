import hre, { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Celo Mainnet constants ───────────────────────────────────────────────────
const CELO_MAINNET_CHAINID = 42220;

// ─── DEMO SAFETY CAPS ─────────────────────────────────────────────────────────
// Hardcoded — never derived from env vars or CLI args.
// The script refuses to deploy if either cap exceeds the absolute guard below.
const DEMO_MAX_BET_PER_TX  = ethers.parseUnits("1", 18); // 1 USDm/tx  (~$1)
const DEMO_MAX_BET_PER_DAY = ethers.parseUnits("5", 18); // 5 USDm/day (~$5)

// Absolute guard: refuse if someone edits the caps above these thresholds
const ABSOLUTE_CAP_PER_TX  = ethers.parseUnits("2",  18); // $2 hard ceiling
const ABSOLUTE_CAP_PER_DAY = ethers.parseUnits("10", 18); // $10 hard ceiling

// Reference gas price used for offline display only (not sent to network)
const CELO_REFERENCE_GAS_PRICE = 5_000_000_000n; // 5 gwei

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface DeploymentConfig {
  network: string;
  usdmAddress: string;
  witnetAddress: string;
  dryRun: boolean;
  isDryRunPlaceholder: boolean; // true when env vars are absent in dry-run
}

interface DeploymentResult {
  contractAddress: string;
  deploymentTxHash: string;
  blockNumber: number;
  verificationStatus: "pending" | "verified" | "failed";
  maxBetPerTx: string;
  maxBetPerDay: string;
  timestamp: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Called before any broadcast. Fails fast if the hardcoded demo caps were
 * accidentally edited above the absolute guard values.
 */
function enforceDemoCaps(): void {
  if (
    DEMO_MAX_BET_PER_TX  > ABSOLUTE_CAP_PER_TX ||
    DEMO_MAX_BET_PER_DAY > ABSOLUTE_CAP_PER_DAY
  ) {
    throw new Error(
      `🚨 SAFETY VIOLATION: Demo caps (${ethers.formatUnits(DEMO_MAX_BET_PER_TX, 18)} USDm/tx, ` +
        `${ethers.formatUnits(DEMO_MAX_BET_PER_DAY, 18)} USDm/day) exceed the absolute ` +
        `guard ($2/tx, $10/day). Edit ABSOLUTE_CAP constants — not the demo caps — ` +
        `if you intend to raise limits for a non-demo deployment.`
    );
  }
}

async function validateNetwork(): Promise<void> {
  const { chainId } = await ethers.provider.getNetwork();
  if (chainId !== BigInt(CELO_MAINNET_CHAINID)) {
    throw new Error(
      `❌ WRONG NETWORK! Expected chainId ${CELO_MAINNET_CHAINID} (Celo Mainnet), got ${chainId}. ` +
        `Set CELO_MAINNET_RPC_URL and use --network celo-mainnet.`
    );
  }
}

function printWarning(): void {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("⚠️  DEMO DEPLOYMENT TO MAINNET — SMALL AMOUNTS ONLY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log("🔴 CRITICAL WARNINGS:");
  console.log("  1. This is a HACKATHON DEMO deployment ONLY");
  console.log("  2. Contract is NOT audited and NOT production-ready");
  console.log("  3. Betting limits hardcoded to DEMO CAPS:");
  console.log(`     • Max per transaction: ${ethers.formatUnits(DEMO_MAX_BET_PER_TX, 18)} USDm (~$1)`);
  console.log(`     • Max per day:         ${ethers.formatUnits(DEMO_MAX_BET_PER_DAY, 18)} USDm (~$5)`);
  console.log("  4. Raising limits requires a SEPARATE manual transaction");
  console.log("     (not possible via this deploy script)");
  console.log("  5. NO refunds guaranteed on this demo contract");
  console.log("");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

async function getConfig(): Promise<DeploymentConfig> {
  // Support both DRY_RUN=true env var and --dry-run flag.
  // Hardhat strips unrecognised flags, so the env-var path is the reliable one.
  const dryRun =
    process.env.DRY_RUN === "true" || process.argv.includes("--dry-run");

  const usdmAddress = process.env.NEXT_PUBLIC_USDM_TOKEN_ADDRESS ?? "";
  const witnetAddress = process.env.WITNET_RANDOMNESS_ADDRESS ?? "";

  // In dry-run mode, missing env vars are allowed — we use display placeholders.
  let isDryRunPlaceholder = false;
  if (!dryRun) {
    if (!usdmAddress) throw new Error("Missing env var: NEXT_PUBLIC_USDM_TOKEN_ADDRESS");
    if (!witnetAddress) throw new Error("Missing env var: WITNET_RANDOMNESS_ADDRESS");
  } else {
    if (!usdmAddress || !witnetAddress) isDryRunPlaceholder = true;
  }

  return {
    network: "Celo Mainnet",
    usdmAddress: usdmAddress || "<NOT SET>",
    witnetAddress: witnetAddress || "<NOT SET>",
    dryRun,
    isDryRunPlaceholder,
  };
}

// ─── Dry-run (fully offline — no provider calls) ─────────────────────────────

async function performDryRun(config: DeploymentConfig): Promise<void> {
  console.log("🧪 DRY RUN MODE — no transactions will be broadcast");
  console.log("   (offline simulation — no live RPC required)\n");

  // Configuration table
  const usdmAddress = config.isDryRunPlaceholder ? "<NOT SET — provide env var>" : config.usdmAddress;
  const witnetAddress = config.isDryRunPlaceholder ? "<NOT SET — provide env var>" : config.witnetAddress;

  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│  DEPLOYMENT CONFIGURATION                                   │");
  console.log("├─────────────────────────────────────────────────────────────┤");
  console.log(`│  Target network  : Celo Mainnet (chainId ${CELO_MAINNET_CHAINID})              │`);
  console.log(`│  USDM address    : ${usdmAddress}`);
  console.log(`│  Witnet address  : ${witnetAddress}`);
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  // Demo caps
  console.log("🔒 DEMO SAFETY CAPS (hardcoded — script refuses to exceed $2/tx, $10/day):");
  console.log(`   Max bet per tx:   ${ethers.formatUnits(DEMO_MAX_BET_PER_TX, 18)} USDm  (~$1)`);
  console.log(`   Max bet per day:  ${ethers.formatUnits(DEMO_MAX_BET_PER_DAY, 18)} USDm  (~$5)`);
  console.log(`   Raising limits:   requires separate manual owner tx — NOT via this script\n`);

  // Offline gas estimate: bytecodeBytes * 200 gas/byte + 300k fixed overhead
  const Xolat = await ethers.getContractFactory("Xolat");
  const bytecodeBytes = BigInt((Xolat.bytecode.length - 2) / 2); // subtract "0x"
  const estimatedGas  = bytecodeBytes * 200n + 300_000n;
  const estimatedCostWei = estimatedGas * CELO_REFERENCE_GAS_PRICE;

  console.log("📊 OFFLINE GAS ESTIMATE (5 gwei Celo reference — not from live network):");
  console.log(`   Bytecode size:    ${bytecodeBytes.toLocaleString()} bytes`);
  console.log(`   Estimated gas:    ~${estimatedGas.toLocaleString()} gas units`);
  console.log(`   Reference price:  5 gwei`);
  console.log(`   Estimated cost:   ~${ethers.formatUnits(estimatedCostWei, 18)} CELO\n`);

  // Offline address validation
  console.log("🔍 OFFLINE VALIDATION:");
  if (config.isDryRunPlaceholder) {
    console.log("   ⚠️  USDM / Witnet env vars not set — using placeholders for this dry run");
    console.log("   ⚠️  Set NEXT_PUBLIC_USDM_TOKEN_ADDRESS and WITNET_RANDOMNESS_ADDRESS before real deployment");
  } else {
    if (!ethers.isAddress(config.usdmAddress)) {
      throw new Error(`NEXT_PUBLIC_USDM_TOKEN_ADDRESS is not a valid Ethereum address: "${config.usdmAddress}"`);
    }
    if (!ethers.isAddress(config.witnetAddress)) {
      throw new Error(`WITNET_RANDOMNESS_ADDRESS is not a valid Ethereum address: "${config.witnetAddress}"`);
    }
    console.log(`   ✅ USDM address format valid`);
    console.log(`   ✅ Witnet address format valid`);
  }
  console.log(`   ✅ Demo caps within absolute guard ($2/tx, $10/day)\n`);

  // Commands for real deployment
  console.log("📋 REAL DEPLOYMENT COMMAND (when you are ready to broadcast):");
  console.log(`   NEXT_PUBLIC_USDM_TOKEN_ADDRESS=${usdmAddress} \\`);
  console.log(`   WITNET_RANDOMNESS_ADDRESS=${witnetAddress} \\`);
  console.log(`   CELO_MAINNET_RPC_URL=<rpc_url> \\`);
  console.log(`   PRIVATE_KEY=<deployer_key> \\`);
  console.log(`   CELOSCAN_API_KEY=<api_key> \\`);
  console.log(`   npx hardhat run scripts/deploy.ts --network celo-mainnet\n`);

  console.log("📋 CELOSCAN VERIFICATION (runs automatically with CELOSCAN_API_KEY set):");
  console.log(`   npx hardhat verify --network celo-mainnet <CONTRACT_ADDRESS> \\`);
  console.log(`     "${usdmAddress}" \\`);
  console.log(`     "${witnetAddress}"\n`);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("✅ DRY RUN COMPLETE — all offline checks passed");
  console.log("   No transactions were broadcast.");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

// ─── Real deployment helpers ──────────────────────────────────────────────────

async function estimateDeploymentGas(): Promise<void> {
  const Xolat = await ethers.getContractFactory("Xolat");
  const bytecodeBytes = BigInt((Xolat.bytecode.length - 2) / 2);
  const estimatedGas  = bytecodeBytes * 200n + 300_000n;
  const feeData = await ethers.provider.getFeeData();
  const effectivePrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? CELO_REFERENCE_GAS_PRICE;
  const estimatedCostWei = estimatedGas * effectivePrice;

  console.log("\n📊 DEPLOYMENT GAS ESTIMATE (live network):");
  console.log(`   Bytecode size:  ${bytecodeBytes.toLocaleString()} bytes`);
  console.log(`   Estimated gas:  ~${estimatedGas.toLocaleString()}`);
  console.log(`   Gas price:      ${ethers.formatUnits(effectivePrice, "gwei")} gwei`);
  console.log(`   Est. cost:      ~${ethers.formatUnits(estimatedCostWei, 18)} CELO\n`);
}

async function validateConstructorArgs(config: DeploymentConfig): Promise<void> {
  console.log("\n🔍 VALIDATING CONSTRUCTOR ARGS ON-CHAIN:");
  console.log(`   USDM address:     ${config.usdmAddress}`);
  console.log(`   Witnet address:   ${config.witnetAddress}`);

  const code = await ethers.provider.getCode(config.usdmAddress);
  if (code === "0x") {
    throw new Error(
      `❌ USDM address (${config.usdmAddress}) has no contract code on Celo Mainnet`
    );
  }
  console.log("   ✅ USDM contract code confirmed on-chain\n");

  const witnetCode = await ethers.provider.getCode(config.witnetAddress);
  if (witnetCode === "0x") {
    throw new Error(
      `❌ Witnet address (${config.witnetAddress}) has no contract code on Celo Mainnet`
    );
  }
  console.log("   ✅ Witnet contract code confirmed on-chain\n");
}

// ─── Real deployment ──────────────────────────────────────────────────────────

async function deployToMainnet(config: DeploymentConfig): Promise<DeploymentResult> {
  // Final safety gate: refuse if caps were accidentally raised above the guard
  enforceDemoCaps();

  console.log("\n🚀 DEPLOYING TO CELO MAINNET...\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`📍 Deployer:  ${deployer.address}`);
  console.log(`   Balance:  ${ethers.formatUnits(balance, 18)} CELO\n`);

  const Xolat = await ethers.getContractFactory("Xolat");
  console.log("   Deploying Xolat contract...");

  const xolat = await Xolat.deploy(
    config.usdmAddress,
    config.witnetAddress
  );

  const deployTxHash = xolat.deploymentTransaction()?.hash ?? "unknown";
  console.log(`   Deploy tx: ${deployTxHash}`);

  await xolat.waitForDeployment();
  const contractAddress = await xolat.getAddress();
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log(`   ✅ Deployed at: ${contractAddress} (block ${blockNumber})`);

  // Apply demo safety caps immediately after deployment
  console.log("\n🔒 APPLYING DEMO SAFETY CAPS...");
  const setMaxBetTx = await xolat.setMaxBet(DEMO_MAX_BET_PER_TX, DEMO_MAX_BET_PER_DAY);
  await setMaxBetTx.wait();
  console.log(`   setMaxBet tx: ${setMaxBetTx.hash}`);
  console.log(`   ✅ ${ethers.formatUnits(DEMO_MAX_BET_PER_TX, 18)} USDm/tx, ${ethers.formatUnits(DEMO_MAX_BET_PER_DAY, 18)} USDm/day\n`);

  // Celoscan auto-verification via hardhat-verify
  let verificationStatus: "pending" | "verified" | "failed" = "pending";

  if (process.env.CELOSCAN_API_KEY) {
    console.log("📋 SUBMITTING TO CELOSCAN...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          config.usdmAddress,
          config.witnetAddress,
        ],
      });
      verificationStatus = "verified";
      console.log("   ✅ Contract verified on Celoscan\n");
    } catch (err) {
      console.warn("   ⚠️  Auto-verification failed:", err);
      console.warn(
        `   Run manually: npx hardhat verify --network celo-mainnet ${contractAddress} ` +
          `"${config.usdmAddress}" "${config.witnetAddress}"`
      );
      verificationStatus = "failed";
    }
  } else {
    console.log("   ⚠️  CELOSCAN_API_KEY not set — skipping auto-verification");
    console.log(
      `   Run manually: npx hardhat verify --network celo-mainnet ${contractAddress} ` +
        `"${config.usdmAddress}" "${config.witnetAddress}"\n`
    );
  }

  return {
    contractAddress,
    deploymentTxHash: deployTxHash,
    blockNumber,
    verificationStatus,
    maxBetPerTx:  ethers.formatUnits(DEMO_MAX_BET_PER_TX, 18),
    maxBetPerDay: ethers.formatUnits(DEMO_MAX_BET_PER_DAY, 18),
    timestamp: new Date().toISOString(),
  };
}

function saveDeploymentAddresses(result: DeploymentResult): void {
  const outputPath = path.join(__dirname, "..", "deployed-addresses.json");

  let deployments: Record<string, DeploymentResult> = {};
  if (fs.existsSync(outputPath)) {
    const raw = fs.readFileSync(outputPath, "utf-8");
    deployments = JSON.parse(raw) as Record<string, DeploymentResult>;
  }

  const dateKey = new Date().toISOString().split("T")[0];
  deployments[`celo-mainnet-${dateKey}`] = result;

  fs.writeFileSync(outputPath, JSON.stringify(deployments, null, 2));
  console.log(`\n💾 Deployment record saved to: deployed-addresses.json`);
}

function printDeploymentSummary(result: DeploymentResult): void {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`   Contract:       ${result.contractAddress}`);
  console.log(`   Deploy Tx:      ${result.deploymentTxHash}`);
  console.log(`   Block:          ${result.blockNumber}`);
  console.log(`   Verification:   ${result.verificationStatus.toUpperCase()}`);
  console.log(`   Max Bet/Tx:     ${result.maxBetPerTx} USDm`);
  console.log(`   Max Bet/Day:    ${result.maxBetPerDay} USDm`);
  console.log(`   Celoscan:       https://celoscan.io/address/${result.contractAddress}`);
  console.log("");
  console.log("⚠️  NEXT STEPS:");
  console.log("   1. Confirm WITNET_RANDOMNESS_ADDRESS targets the intended Celo deployment");
  console.log("   2. Fund the keeper with CELO for Witnet randomness requests");
  console.log("   3. This is a DEMO — do NOT accept public deposits");
  console.log("   4. Raising bet limits requires a separate manual owner tx");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    // Guard before any output — fail immediately if demo caps were edited too high
    enforceDemoCaps();

    printWarning();

    const config = await getConfig();
    console.log(`🎯 TARGET NETWORK: ${config.network}`);
    console.log(`   Mode:         ${config.dryRun ? "DRY RUN ✓ (no broadcast)" : "LIVE — THIS WILL BROADCAST"}\n`);

    if (config.dryRun) {
      await performDryRun(config);
      return;
    }

    // ── Real deployment path ──────────────────────────────────────────────────
    await validateNetwork();
    await estimateDeploymentGas();
    await validateConstructorArgs(config);

    const result = await deployToMainnet(config);
    saveDeploymentAddresses(result);
    printDeploymentSummary(result);
  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error(error);
    process.exit(1);
  }
}

main();
