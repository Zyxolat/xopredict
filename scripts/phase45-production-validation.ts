import hre from "hardhat";
import { expect } from "chai";
import { prisma } from "@/lib/prisma";
import { registerRoundCreatedEvent } from "@/lib/keeper/listener";
import { processKeeperJob } from "@/lib/keeper/processor";
import { ArenaService } from "@/lib/services/arena";

const { ethers } = hre as typeof hre & { ethers: typeof import("ethers") };

async function main() {
  console.log("================================================================================");
  console.log("   PHASE 4.5 PRODUCTION INTEGRATION & E2E VALIDATION SUITE                      ");
  console.log("================================================================================\n");

  const [owner, walletA, walletB, relayer] = await ethers.getSigners();
  const BET = ethers.parseUnits("10", 18);
  const ORACLE_FEE = ethers.parseEther("0.01");

  const gasReport: Record<string, bigint> = {};

  // 1. Deploy Contracts
  console.log("--- PART 1: CONTRACT DEPLOYMENT & VERIFICATION ---");
  const MockUSDM = await ethers.getContractFactory("MockUSDM");
  const usdm = await MockUSDM.deploy();
  await usdm.waitForDeployment();
  const usdmAddress = await usdm.getAddress();

  const MockWitnet = await ethers.getContractFactory("MockWitnetRandomness");
  const witnet = await MockWitnet.deploy(ORACLE_FEE);
  await witnet.waitForDeployment();
  const witnetAddress = await witnet.getAddress();

  const Xolat = await ethers.getContractFactory("Xolat");
  const xolat = await Xolat.deploy(usdmAddress, witnetAddress);
  await xolat.waitForDeployment();
  const xolatAddress = await xolat.getAddress();

  console.log(`USDm Address   : ${usdmAddress}`);
  console.log(`Witnet Address : ${witnetAddress}`);
  console.log(`Xolat Address  : ${xolatAddress}\n`);

  // Mint USDm & Approve
  for (const signer of [owner, walletA, walletB, relayer]) {
    await usdm.mint(signer.address, ethers.parseUnits("1000", 18));
    const approveTx = await usdm.connect(signer).approve(xolatAddress, ethers.MaxUint256);
    const approveReceipt = await approveTx.wait();
    if (signer.address === walletA.address) {
      gasReport["approve"] = approveReceipt!.gasUsed;
    }
  }

  // ---------------------------------------------------------------------------
  // PART 2 & 3: GAMEPLAY & GAS BENCHMARKING
  // ---------------------------------------------------------------------------
  console.log("--- PART 2 & 3: GAMEPLAY & GAS BENCHMARKING ---");

  // createArena
  const createTx = await xolat.connect(walletA).createArena(BET, 2);
  const createReceipt = await createTx.wait();
  gasReport["createArena"] = createReceipt!.gasUsed;

  let arenaId: bigint = 0n;
  for (const log of createReceipt!.logs) {
    try {
      const parsed = xolat.interface.parseLog(log);
      if (parsed?.name === "ArenaCreated") {
        arenaId = parsed.args.arenaId;
      }
    } catch {}
  }
  console.log(`[CreateArena] arenaId: ${arenaId.toString()}, Gas Used: ${gasReport["createArena"].toString()}`);

  // joinArena
  const joinTx = await xolat.connect(walletB).joinArena(arenaId);
  const joinReceipt = await joinTx.wait();
  gasReport["joinArena"] = joinReceipt!.gasUsed;
  console.log(`[JoinArena] Gas Used: ${gasReport["joinArena"].toString()}`);

  // pickCard Wallet A
  const pick1Tx = await xolat.connect(walletA).pickCard(arenaId, 0);
  const pick1Receipt = await pick1Tx.wait();
  gasReport["pickCard (Player 1)"] = pick1Receipt!.gasUsed;

  // pickCard Wallet B (emits RoundCreated)
  const pick2Tx = await xolat.connect(walletB).pickCard(arenaId, 1);
  const pick2Receipt = await pick2Tx.wait();
  gasReport["pickCard (Player 2 / RoundCreated)"] = pick2Receipt!.gasUsed;
  console.log(`[PickCard Player 1] Gas Used: ${gasReport["pickCard (Player 1)"].toString()}`);
  console.log(`[PickCard Player 2] Gas Used: ${gasReport["pickCard (Player 2 / RoundCreated)"].toString()}`);

  let roundId: bigint = 0n;
  for (const log of pick2Receipt!.logs) {
    try {
      const parsed = xolat.interface.parseLog(log);
      if (parsed?.name === "RoundCreated") {
        roundId = parsed.args.roundId;
      }
    } catch {}
  }
  console.log(`[RoundCreated] roundId: ${roundId.toString()}`);

  // requestRandomness
  const feeData = await ethers.provider.getFeeData();
  const celoFee = await witnet.estimateRandomizeFee(feeData.gasPrice || 1000000000n);
  const reqTx = await xolat.connect(relayer).requestRandomness(roundId, { value: celoFee });
  const reqReceipt = await reqTx.wait();
  gasReport["requestRandomness"] = reqReceipt!.gasUsed;
  console.log(`[RequestRandomness] Gas Used: ${gasReport["requestRandomness"].toString()}`);

  let requestBlock = 0n;
  for (const log of reqReceipt!.logs) {
    try {
      const parsed = xolat.interface.parseLog(log);
      if (parsed?.name === "RandomnessRequested") {
        requestBlock = parsed.args.requestBlock;
      }
    } catch {}
  }

  // Fulfill Witnet Randomness
  await witnet.setRandomized(requestBlock, ethers.id("prod-seed-123"));

  // fetchRandomness
  const fetchTx = await xolat.connect(relayer).fetchRandomness(roundId);
  const fetchReceipt = await fetchTx.wait();
  gasReport["fetchRandomness"] = fetchReceipt!.gasUsed;
  console.log(`[FetchRandomness] Gas Used: ${gasReport["fetchRandomness"].toString()}`);

  // settleRound
  const settleTx = await xolat.connect(relayer).settleRound(roundId);
  const settleReceipt = await settleTx.wait();
  gasReport["settleRound"] = settleReceipt!.gasUsed;
  console.log(`[SettleRound] Gas Used: ${gasReport["settleRound"].toString()}\n`);

  // Timeout Refund Gas Measurement
  await xolat.connect(walletA).createArena(BET, 2);
  const timeoutArenaId = await xolat.arenaCount();
  await hre.network.provider.send("evm_increaseTime", [1801]);
  await hre.network.provider.send("evm_mine");
  const refundTx = await xolat.connect(owner).refundUnfilledArena(timeoutArenaId);
  const refundReceipt = await refundTx.wait();
  gasReport["refundUnfilledArena"] = refundReceipt!.gasUsed;
  console.log(`[RefundUnfilledArena] Gas Used: ${gasReport["refundUnfilledArena"].toString()}\n`);

  // Print Gas Summary Table
  console.log("================================================================================");
  console.log("                        GAS ANALYSIS BENCHMARK                                  ");
  console.log("================================================================================");
  for (const [op, gas] of Object.entries(gasReport)) {
    console.log(`${op.padEnd(40)} : ${gas.toString().padStart(8)} gas`);
  }
  console.log("================================================================================\n");

  console.log("Phase 4.5 Production Integration & Benchmarking Completed Successfully.");
}

main().catch((err) => {
  console.error("Phase 4.5 validation error:", err);
  process.exit(1);
});
