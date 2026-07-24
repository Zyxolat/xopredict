import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre as typeof hre & { ethers: typeof import("ethers") };

describe("Xolat Witnet specification", function () {
  const BET = ethers.parseUnits("10", 18);
  const ORACLE_FEE = ethers.parseEther("0.01");
  const REQUEST_PAYMENT = ORACLE_FEE * 2n;

  let xolat: any;
  let usdm: any;
  let witnet: any;
  let owner: any;
  let playerOne: any;
  let playerTwo: any;
  let keeper: any;

  beforeEach(async function () {
    [owner, playerOne, playerTwo, keeper] = await ethers.getSigners();

    const MockUSDM = await ethers.getContractFactory("MockUSDM");
    usdm = await MockUSDM.deploy();
    await usdm.waitForDeployment();

    const MockWitnetRandomness = await ethers.getContractFactory("MockWitnetRandomness");
    witnet = await MockWitnetRandomness.deploy(ORACLE_FEE);
    await witnet.waitForDeployment();

    for (const player of [playerOne, playerTwo]) {
      await usdm.mint(player.address, ethers.parseUnits("100", 18));
    }

    // The production migration changes the constructor to (usdmAddress, witnetAddress).
    const Xolat = (await ethers.getContractFactory("Xolat")) as any;
    xolat = await Xolat.deploy(await usdm.getAddress(), await witnet.getAddress());
    await xolat.waitForDeployment();

    for (const player of [playerOne, playerTwo]) {
      await usdm.connect(player).approve(await xolat.getAddress(), ethers.MaxUint256);
    }
  });

  async function roundIdFrom(receipt: any): Promise<bigint> {
    for (const log of receipt.logs) {
      try {
        const parsed = xolat.interface.parseLog(log);
        if (parsed?.name === "RoundCreated") {
          return parsed.args.roundId;
        }
      } catch {
        // Ignore events emitted by USDm and the oracle mock.
      }
    }
    throw new Error("RoundCreated event not found");
  }

  async function createSoloRound(): Promise<bigint> {
    const startTransaction = await xolat.connect(playerOne).startSoloGame(BET);
    const startReceipt = await startTransaction.wait();
    const roundId = await roundIdFrom(startReceipt);
    await xolat.connect(playerOne).pickSoloCard(roundId, 0);
    return roundId;
  }

  async function requestRandomness(roundId: bigint): Promise<any> {
    const transaction = await xolat
      .connect(keeper)
      .requestRandomness(roundId, { value: REQUEST_PAYMENT });
    await transaction.wait();
    return xolat.getRandomnessRequest(roundId);
  }

  describe("Witnet request and fetch cycle", function () {
    it("records the request block, pays only the Witnet fee, and returns unused CELO", async function () {
      const roundId = await createSoloRound();
      const request = await requestRandomness(roundId);

      expect(request.roundId).to.equal(roundId);
      expect(request.requestBlock).to.be.greaterThan(0n);
      expect(request.requestedAt).to.be.greaterThan(0n);
      expect(request.celoPaid).to.equal(ORACLE_FEE);
      expect(await witnet.lastPayment()).to.equal(ORACLE_FEE);
      expect(await ethers.provider.getBalance(await xolat.getAddress())).to.equal(0n);
    });

    it("waits for the recorded request block and derives every card from a distinct round-scoped nonce", async function () {
      const roundId = await createSoloRound();
      const request = await requestRandomness(roundId);

      await expect(xolat.fetchRandomness(roundId)).to.be.revertedWith("randomness unavailable");

      await witnet.setRandomized(request.requestBlock, ethers.id("witnet-seed"));
      await xolat.fetchRandomness(roundId);

      const round = await xolat.getRound(roundId);
      const expectedCards = await Promise.all(
        [0n, 1n, 2n, 3n].map(async (cardIndex) => {
          const nonce = BigInt(
            ethers.keccak256(
              ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256"],
                [roundId, cardIndex]
              )
            )
          );
          return 1n + BigInt(await witnet.random(100, nonce, request.requestBlock));
        })
      );

      expect(round.status).to.equal("revealed");
      expect(round.numbers).to.deep.equal(expectedCards);
      expect((await xolat.getRandomnessRequest(roundId)).fulfilled).to.equal(true);
    });
  });

  describe("Deterministic settlement", function () {
    it("settles from revealed card values, not an owner-supplied winner", async function () {
      await xolat.connect(playerOne).createArena(BET, 2);
      const arenaId = await xolat.arenaCount();
      await xolat.connect(playerTwo).joinArena(arenaId);

      await xolat.connect(playerOne).pickCard(arenaId, 0);
      const finalPick = await xolat.connect(playerTwo).pickCard(arenaId, 1);
      const roundId = await roundIdFrom(await finalPick.wait());
      const request = await requestRandomness(roundId);

      const firstCardNonce = BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256"],
            [roundId, 0n]
          )
        )
      );
      const secondCardNonce = BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256"],
            [roundId, 1n]
          )
        )
      );

      await witnet.setRandomized(request.requestBlock, ethers.id("arena-seed"));
      await witnet.setRandomValue(request.requestBlock, firstCardNonce, 99);
      await witnet.setRandomValue(request.requestBlock, secondCardNonce, 5);
      await xolat.fetchRandomness(roundId);

      const legacySettlement = new ethers.Interface([
        "function settleRound(uint256 roundId, address winner)",
      ]);
      await expect(
        owner.sendTransaction({
          to: await xolat.getAddress(),
          data: legacySettlement.encodeFunctionData("settleRound", [roundId, playerTwo.address]),
        })
      ).to.be.reverted;

      const winnerBalanceBefore = await usdm.balanceOf(playerOne.address);
      await xolat.connect(keeper).settleRound(roundId);

      expect((await xolat.getRound(roundId)).winnerAddress).to.equal(playerOne.address);
      expect(await usdm.balanceOf(playerOne.address)).to.equal(
        winnerBalanceBefore + (BET * 2n * 95n) / 100n
      );
    });

    it("awards an equal-value tie to the earliest player in join order", async function () {
      await xolat.connect(playerOne).createArena(BET, 2);
      const arenaId = await xolat.arenaCount();
      await xolat.connect(playerTwo).joinArena(arenaId);

      await xolat.connect(playerOne).pickCard(arenaId, 0);
      const finalPick = await xolat.connect(playerTwo).pickCard(arenaId, 1);
      const roundId = await roundIdFrom(await finalPick.wait());
      const request = await requestRandomness(roundId);

      const firstCardNonce = BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256"],
            [roundId, 0n]
          )
        )
      );
      const secondCardNonce = BigInt(
        ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256"],
            [roundId, 1n]
          )
        )
      );

      await witnet.setRandomized(request.requestBlock, ethers.id("tie-seed"));
      await witnet.setRandomValue(request.requestBlock, firstCardNonce, 42);
      await witnet.setRandomValue(request.requestBlock, secondCardNonce, 42);
      await xolat.fetchRandomness(roundId);

      const creatorBalanceBefore = await usdm.balanceOf(playerOne.address);
      await xolat.connect(keeper).settleRound(roundId);

      expect((await xolat.getRound(roundId)).winnerAddress).to.equal(playerOne.address);
      expect(await usdm.balanceOf(playerOne.address)).to.equal(
        creatorBalanceBefore + (BET * 2n * 95n) / 100n
      );
    });
  });

  describe("Arena timeout refunds", function () {
    it("waits 20 minutes, then returns each player's stake exactly once instead of refunding the total pot to every player", async function () {
      const firstBalance = await usdm.balanceOf(playerOne.address);
      const secondBalance = await usdm.balanceOf(playerTwo.address);

      await xolat.connect(playerOne).createArena(BET, 2);
      const arenaId = await xolat.arenaCount();
      await xolat.connect(playerTwo).joinArena(arenaId);
      await xolat.connect(playerOne).pickCard(arenaId, 0);
      const finalPick = await xolat.connect(playerTwo).pickCard(arenaId, 1);
      const roundId = await roundIdFrom(await finalPick.wait());

      await requestRandomness(roundId);
      await time.increase(1198);
      await expect(xolat.connect(keeper).checkRandomnessTimeout(roundId)).to.be.revertedWith(
        "timeout not reached"
      );

      await time.increase(1);
      await xolat.connect(keeper).checkRandomnessTimeout(roundId);

      expect(await usdm.balanceOf(playerOne.address)).to.equal(firstBalance);
      expect(await usdm.balanceOf(playerTwo.address)).to.equal(secondBalance);
      expect(await usdm.balanceOf(await xolat.getAddress())).to.equal(0n);
      expect((await xolat.getRound(roundId)).status).to.equal("refunded");
    });
  });
});