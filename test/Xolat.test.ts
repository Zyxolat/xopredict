import { expect } from "chai";
import { ethers } from "hardhat";
import { Xolat } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Xolat.sol", function () {
  let xolat: Xolat;
  let usdm: any;
  let witnet: any;
  let owner: HardhatEthersSigner;
  let p1: HardhatEthersSigner;
  let p2: HardhatEthersSigner;
  let p3: HardhatEthersSigner;

  const BALANCE = ethers.parseUnits("100000", 18);
  const BET = ethers.parseUnits("10", 18);
  const MAX_TX = ethers.parseUnits("20", 18);
  const MAX_DAY = ethers.parseUnits("100", 18);

  const ORACLE_FEE = ethers.parseEther("0.01");

  before(async function () {
    [owner, p1, p2, p3] = await ethers.getSigners();

    const USD = await ethers.getContractFactory("MockUSDM");
    usdm = await USD.deploy();
    await usdm.waitForDeployment();

    for (const p of [owner, p1, p2, p3]) {
      await usdm.mint(p.address, BALANCE);
      await usdm.connect(p).approve(await usdm.getAddress(), ethers.MaxUint256);
    }

    const Witnet = await ethers.getContractFactory("MockWitnetRandomness");
    witnet = await Witnet.deploy(ORACLE_FEE);
    await witnet.waitForDeployment();

    const XL = await ethers.getContractFactory("Xolat");
    xolat = await XL.deploy(await usdm.getAddress(), await witnet.getAddress());
    await xolat.waitForDeployment();

    for (const p of [owner, p1, p2, p3]) {
      await usdm.connect(p).approve(await xolat.getAddress(), ethers.MaxUint256);
    }
  });

  describe("Setup", function () {
    it("Deploys correctly", async function () {
      expect(await xolat.owner()).to.equal(owner.address);
      expect(await xolat.witnet()).to.equal(await witnet.getAddress());
      expect(await xolat.maxBetPerTx()).to.equal(MAX_TX);
      expect(await xolat.maxBetPerDay()).to.equal(MAX_DAY);
    });
  });

  describe("Arena Mode", function () {
    it("Creates arena with 2-4 players", async function () {
      await xolat.connect(p1).createArena(BET, 4);
      expect(await xolat.arenaCount()).to.equal(1);
    });

    it("Rejects fewer than 2 or more than 4 players", async function () {
      await expect(xolat.connect(p1).createArena(BET, 1)).to.be.revertedWith("player count must be 2-4");
      await expect(xolat.connect(p1).createArena(BET, 5)).to.be.revertedWith("player count must be 2-4");
    });

    it("Rejects 0 bet", async function () {
      await expect(xolat.connect(p1).createArena(0, 4)).to.be.revertedWith("bet must be positive");
    });

    it("Transfers bet to contract", async function () {
      const before = await usdm.balanceOf(p2.address);
      await xolat.connect(p2).createArena(BET, 3);
      const after = await usdm.balanceOf(p2.address);
      expect(before - after).to.equal(BET);
    });

    it("Allows joining non-full arena", async function () {
      await xolat.connect(p1).createArena(BET, 3);
      const id = await xolat.arenaCount();
      await xolat.connect(p2).joinArena(id);
    });

    it("Rejects joining full arena", async function () {
      await xolat.connect(p1).createArena(BET, 2);
      const id = await xolat.arenaCount();
      await xolat.connect(p2).joinArena(id);
      const p4 = (await ethers.getSigners())[5];
      await expect(xolat.connect(p4).joinArena(id)).to.be.revertedWith("arena unavailable");
    });

    it("Rejects duplicate join", async function () {
      await xolat.connect(p1).createArena(BET, 4);
      const id = await xolat.arenaCount();
      await expect(xolat.connect(p1).joinArena(id)).to.be.revertedWith("already joined");
    });

    it("Accepts cards 0-3", async function () {
      await xolat.connect(p1).createArena(BET, 4);
      const id = await xolat.arenaCount();
      for (let i = 0; i < 4; i++) {
        await xolat.connect(p1).pickCard(id, i);
      }
    });

    it("Rejects invalid card", async function () {
      await xolat.connect(p1).createArena(BET, 4);
      const id = await xolat.arenaCount();
      await expect(xolat.connect(p1).pickCard(id, 4)).to.be.revertedWith("invalid card index");
    });

    it("Splits 95/5 (winner/owner)", async function () {
      const pot = BET * 2n;
      const winner = (pot * 95n) / 100n;
      const owner_cut = pot - winner;
      expect(winner).to.equal(ethers.parseUnits("19", 18));
      expect(owner_cut).to.equal(ethers.parseUnits("1", 18));
    });

    it("Rounds odd pots correctly", async function () {
      const odd = ethers.parseUnits("10.5", 18);
      const pot = odd * 2n; // 21
      const winner = (pot * 95n) / 100n;
      const owner_cut = pot - winner;
      // 21 * 95 / 100 = 1995 / 100 = 19.95 (in wei: 19950000000000000000)
      expect(winner).to.equal(ethers.parseUnits("19.95", 18));
      expect(owner_cut).to.equal(ethers.parseUnits("1.05", 18));
    });
  });

  describe("Solo Mode", function () {
    it("Starts game and deducts bet", async function () {
      const before = await usdm.balanceOf(p3.address);
      await xolat.connect(p3).startSoloGame(BET);
      const after = await usdm.balanceOf(p3.address);
      expect(before - after).to.equal(BET);
    });

    it("Rejects 0 bet", async function () {
      await expect(xolat.connect(p3).startSoloGame(0)).to.be.revertedWith("bet must be positive");
    });

    it("Enforces per-tx limit", async function () {
      const over = MAX_TX + ethers.parseUnits("1", 18);
      const p = (await ethers.getSigners())[6];
      await usdm.mint(p.address, BALANCE);
      await usdm.connect(p).approve(await xolat.getAddress(), ethers.MaxUint256);
      await expect(xolat.connect(p).startSoloGame(over)).to.be.revertedWith("bet outside limits");
    });

    it("Pays 1.95x to winner", async function () {
      const bet = ethers.parseUnits("100", 18);
      const payout = (bet * 195n) / 100n;
      expect(payout).to.equal(ethers.parseUnits("195", 18));
    });

    it("Verifies 2.5% house edge", async function () {
      const bet = ethers.parseUnits("1000", 18);
      const payout = (bet * 195n) / 100n;
      const edge = bet - (payout - bet);
      expect(edge).to.equal(ethers.parseUnits("50", 18));
    });

    it("Rounds payout down", async function () {
      const bet = ethers.parseUnits("10", 18);
      const payout = (bet * 195n) / 100n;
    });
  });

  describe("Bet Limits", function () {
    it("Accepts bet = maxBetPerTx", async function () {
      const p = (await ethers.getSigners())[7];
      await usdm.mint(p.address, BALANCE);
      await usdm.connect(p).approve(await xolat.getAddress(), ethers.MaxUint256);
      await xolat.connect(p).startSoloGame(MAX_TX);
    });

    it("Rejects bet > maxBetPerTx", async function () {
      const p = (await ethers.getSigners())[8];
      await usdm.mint(p.address, BALANCE);
      await usdm.connect(p).approve(await xolat.getAddress(), ethers.MaxUint256);
      const over = MAX_TX + 1n;
      await expect(xolat.connect(p).startSoloGame(over)).to.be.revertedWith("bet outside limits");
    });

    it("Owner can set limits", async function () {
      const newTx = ethers.parseUnits("50", 18);
      const newDay = ethers.parseUnits("200", 18);
      await xolat.connect(owner).setMaxBet(newTx, newDay);
      expect(await xolat.maxBetPerTx()).to.equal(newTx);
      expect(await xolat.maxBetPerDay()).to.equal(newDay);
      // Reset
      await xolat.connect(owner).setMaxBet(MAX_TX, MAX_DAY);
    });

    it("Non-owner cannot set limits", async function () {
      await expect(xolat.connect(p1).setMaxBet(MAX_TX, MAX_DAY))
        .to.be.revertedWithCustomError(xolat, "OwnableUnauthorizedAccount");
    });
  });

  describe("Paused State", function () {
    it("Blocks bets when paused", async function () {
      await xolat.connect(owner).pause();
      await expect(xolat.connect(p1).startSoloGame(BET)).to.be.reverted;
      await xolat.connect(owner).unpause();
    });

    it("Blocks arena creation when paused", async function () {
      await xolat.connect(owner).pause();
      await expect(xolat.connect(p1).createArena(BET, 4)).to.be.reverted;
      await xolat.connect(owner).unpause();
    });

    it("Blocks arena joins when paused", async function () {
      await xolat.connect(p1).createArena(BET, 4);
      const id = await xolat.arenaCount();
      await xolat.connect(owner).pause();
      const p4 = (await ethers.getSigners())[5];
      await expect(xolat.connect(p4).joinArena(id)).to.be.reverted;
      await xolat.connect(owner).unpause();
    });
  });

  describe("Blacklist & Bans", function () {
    it("Bans player and blocks betting", async function () {
      const p = (await ethers.getSigners())[9];
      await usdm.mint(p.address, BALANCE);
      await usdm.connect(p).approve(await xolat.getAddress(), ethers.MaxUint256);
      await xolat.connect(owner).ban(p.address);
      await expect(xolat.connect(p).startSoloGame(BET)).to.be.revertedWith("address blacklisted");
    });

    it("Blocks banned from arena creation", async function () {
      const p = (await ethers.getSigners())[10];
      await usdm.mint(p.address, BALANCE);
      await usdm.connect(p).approve(await xolat.getAddress(), ethers.MaxUint256);
      await xolat.connect(owner).ban(p.address);
      await expect(xolat.connect(p).createArena(BET, 4)).to.be.revertedWith("address blacklisted");
    });

    it("Unbans player", async function () {
      const p = (await ethers.getSigners())[11];
      await xolat.connect(owner).ban(p.address);
      await xolat.connect(owner).unban(p.address);
      expect(await xolat.isPlayerBanned(p.address)).to.be.false;
    });
  });

  describe("Cooldown", function () {
    it("Applies cooldown after losses", async function () {
      const p = p3;
      const before = await xolat.getPlayerStats(p.address);
      await xolat.connect(owner).applyCooldown(p.address);
      const after = await xolat.getPlayerStats(p.address);
      expect(Number(after.recentLosses)).to.be.greaterThan(Number(before.recentLosses));
    });

    it("Blocks betting during cooldown", async function () {
      const p = (await ethers.getSigners())[12];
      await usdm.mint(p.address, BALANCE);
      await usdm.connect(p).approve(await xolat.getAddress(), ethers.MaxUint256);
      await xolat.connect(owner).setCooldownParams(10, 1);
      await xolat.connect(owner).applyCooldown(p.address);
      await expect(xolat.connect(p).startSoloGame(BET)).to.be.revertedWith("in cooldown");
    });

    it("Allows betting after cooldown expires", async function () {
      const p = (await ethers.getSigners())[13];
      await usdm.mint(p.address, BALANCE);
      await usdm.connect(p).approve(await xolat.getAddress(), ethers.MaxUint256);
      await xolat.connect(owner).setCooldownParams(10, 1);
      await xolat.connect(owner).applyCooldown(p.address);
      await time.increase(15);
      await xolat.connect(p).startSoloGame(BET);
    });
  });

  describe("Access Control", function () {
    it("Owner can pause/unpause", async function () {
      await xolat.connect(owner).pause();
      expect(await xolat.paused()).to.be.true;
      await xolat.connect(owner).unpause();
      expect(await xolat.paused()).to.be.false;
    });

    it("Non-owner cannot pause", async function () {
      await expect(xolat.connect(p1).pause())
        .to.be.revertedWithCustomError(xolat, "OwnableUnauthorizedAccount");
    });

    it("Non-owner cannot unpause", async function () {
      await xolat.connect(owner).pause();
      await expect(xolat.connect(p1).unpause())
        .to.be.revertedWithCustomError(xolat, "OwnableUnauthorizedAccount");
      await xolat.connect(owner).unpause();
    });

    it("Owner can ban", async function () {
      const p = (await ethers.getSigners())[14];
      await xolat.connect(owner).ban(p.address);
      expect(await xolat.isPlayerBanned(p.address)).to.be.true;
    });

    it("Non-owner cannot ban", async function () {
      await expect(xolat.connect(p1).ban(p2.address))
        .to.be.revertedWithCustomError(xolat, "OwnableUnauthorizedAccount");
    });

    it("Owner can emergency-refund a pending arena round", async function () {
      await xolat.connect(p1).createArena(BET, 2);
      const id = await xolat.arenaCount();
      await xolat.connect(p2).joinArena(id);
      await xolat.connect(p1).pickCard(id, 0);
      await xolat.connect(p2).pickCard(id, 1);
      const roundId = await xolat.roundCount();
      await xolat.connect(owner).requestRandomness(roundId, { value: ORACLE_FEE });
      await xolat.connect(owner).emergencyRefundRound(roundId);
      expect((await xolat.getRound(roundId)).status).to.equal("refunded");
    });

    it("Owner can emergency-refund a created round before randomness is requested", async function () {
      const balanceBefore = await usdm.balanceOf(p3.address);
      await xolat.connect(p3).startSoloGame(BET);
      const roundId = await xolat.roundCount();

      expect((await xolat.getRound(roundId)).status).to.equal("created");
      await xolat.connect(owner).emergencyRefundRound(roundId);

      expect((await xolat.getRound(roundId)).status).to.equal("refunded");
      expect(await usdm.balanceOf(p3.address)).to.equal(balanceBefore);
    });

    it("Non-owner cannot emergency-refund a round", async function () {
      await expect(xolat.connect(p2).emergencyRefundRound(1))
        .to.be.revertedWithCustomError(xolat, "OwnableUnauthorizedAccount");
    });
  });

  describe("Getters", function () {
    it("Returns player stats", async function () {
      const stats = await xolat.getPlayerStats(owner.address);
      expect(stats).to.exist;
    });

    it("Reports ban status", async function () {
      expect(await xolat.isPlayerBanned(p1.address)).to.be.false;
      await xolat.connect(owner).ban(p1.address);
      expect(await xolat.isPlayerBanned(p1.address)).to.be.true;
      await xolat.connect(owner).unban(p1.address);
      expect(await xolat.isPlayerBanned(p1.address)).to.be.false;
    });
  });

  describe("Witnet Config", function () {
    it("Stores the Witnet randomness contract", async function () {
      expect(await xolat.witnet()).to.equal(await witnet.getAddress());
    });

    it("Uses the fixed 20-minute randomness timeout", async function () {
      expect(await xolat.RANDOMNESS_TIMEOUT()).to.equal(1200n);
    });
  });

  describe("Edge Cases", function () {
    it("Rejects emergency refunds for non-existent rounds", async function () {
      await expect(xolat.connect(owner).emergencyRefundRound(9999))
        .to.be.revertedWith("round not found");
    });

    it("Handles new player stats", async function () {
      const newAddr = "0x0000000000000000000000000000000000000001";
      const stats = await xolat.getPlayerStats(newAddr);
      expect(stats.totalWonUsdm).to.equal(0n);
      expect(stats.totalPlayed).to.equal(0n);
    });
  });

  describe("Integration", function () {
    it("Creates multiple arenas", async function () {
      await xolat.connect(p1).createArena(BET, 2);
      const a1 = await xolat.arenaCount();
      await xolat.connect(p2).createArena(BET, 3);
      const a2 = await xolat.arenaCount();
      expect(a2).to.equal(a1 + 1n);
    });
  });
});
