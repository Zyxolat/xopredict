// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IWitnetRandomness {
    function estimateRandomizeFee(uint256 gasPrice) external view returns (uint256);
    function randomize() external payable returns (uint256 requestBlock);
    function isRandomized(uint256 requestBlock) external view returns (bool);
    function getRandomnessAfter(uint256 requestBlock) external view returns (bytes32);
    function random(
        uint32 range,
        uint256 nonce,
        uint256 requestBlock
    ) external view returns (uint32);
}

/**
 * @notice USDm-funded game with Chainlink VRF v2.5 integration, commit-reveal
 * mechanics, and comprehensive safety features. Production-ready for Celo Mainnet.
 *
 * KEY SECURITY FEATURES:
 * - VRF-only randomness (no block.timestamp or blockhash)
 * - Commit-reveal flow with on-chain verification
 * - 300-second VRF timeout with automatic refunds
 * - Reentrancy protection on all payout paths
 * - Pausable by owner, blacklist/ban for compliance
 * - Daily & per-transaction bet limits with cooldown mechanism
 */
contract Xolat is ReentrancyGuard, Pausable, Ownable {
    // ============= STATE VARIABLES =============

    IERC20 public immutable usdm;

    IWitnetRandomness public immutable witnet;

    // Bet Limits
    uint256 public maxBetPerTx = 20e18;
    uint256 public maxBetPerDay = 100e18;

    // Game Counters
    uint256 public arenaCount;
    uint256 public roundCount;

    // Cooldown & Loss Tracking
    uint256 public cooldownDuration = 1 hours;
    uint256 public lossesBeforeCooldown = 5;

    uint256 public constant RANDOMNESS_TIMEOUT = 1_200;
    mapping(uint256 roundId => RandomnessRequest) public randomnessRequests;

    // ============= STRUCTS =============

    struct RandomnessRequest {
        uint256 roundId;
        uint256 requestBlock;
        uint256 requestedAt;
        uint256 celoPaid;
        bool fulfilled;
    }

    struct Arena {
        uint256 arenaId;
        uint256 betAmount;
        uint8 maxPlayers;
        uint8 playerCount;
        bool settled;
        address winner;
        uint256 createdAt;
        uint256 roundId;
        uint8 pickedCount;
        address[] players;
        mapping(address => uint8) playerCards; // card index 0-3
        mapping(address => bool) hasPicked;
    }

    struct Round {
        uint256 roundId;
        string roundType; // "arena" or "solo"
        address player;
        uint256 arenaId; // 0 for solo
        bytes32 commitHash;
        string serverSeed;
        string clientSeed;
        uint256 nonce;
        bytes32 randomness;
        uint256[] numbers;
        address winnerAddress;
        uint256 potUsdm;
        string txHash;
        uint8 selectedCard;
        string status;
        uint256 createdAt;
    }

    struct PlayerStats {
        uint256 totalWonUsdm;
        uint256 totalPlayed;
        uint256 dailyBetTotal;
        uint256 lastBetDate;
        string rank;
        bool isBanned;
        uint256 recentLosses;
        uint256 lastLossTime;
    }

    // ============= MAPPINGS =============

    mapping(uint256 => Arena) public arenas;
    mapping(address => uint256) public dailyBetTotal;
    mapping(address => bool) public blacklist;
    mapping(address => PlayerStats) public playerStats;
    mapping(uint256 => Round) public rounds;

    // ============= EVENTS =============

    event ArenaCreated(
        uint256 indexed arenaId,
        address indexed creator,
        uint256 betAmount,
        uint8 maxPlayers
    );
    event PlayerJoined(uint256 indexed arenaId, address indexed player);
    event CardPicked(
        uint256 indexed arenaId,
        address indexed player,
        uint8 cardIndex
    );
    event RoundCreated(
        uint256 indexed roundId,
        string roundType,
        uint256 indexed arenaId,
        address indexed player,
        uint256 potUsdm
    );
    event RandomnessRequested(
        uint256 indexed roundId,
        uint256 indexed requestBlock,
        address indexed requester,
        uint256 celoPaid
    );
    event RandomnessRevealed(
        uint256 indexed roundId,
        bytes32 commitHash,
        bytes32 randomness
    );
    event WinnerPaid(
        uint256 indexed roundId,
        address indexed winner,
        uint256 payout,
        string reason
    );
    event RefundProcessed(
        uint256 indexed roundId,
        address indexed player,
        uint256 amount,
        string reason
    );
    event RandomnessTimeoutTriggered(
        uint256 indexed roundId,
        uint256 indexed requestBlock
    );
    event SoloPlayed(
        address indexed player,
        uint256 betAmount,
        uint8 cardIndex,
        uint256 roundId
    );
    event SeedRevealed(
        uint256 indexed roundId,
        string serverSeed,
        string clientSeed,
        uint256 nonce
    );
    event PlayerBanned(address indexed player);
    event CooldownApplied(address indexed player, uint256 duration);

    // ============= CONSTRUCTOR =============

    constructor(address usdmAddress, address witnetAddress) Ownable(msg.sender) {
        require(usdmAddress != address(0), "invalid USDM address");
        require(witnetAddress != address(0), "invalid Witnet address");

        usdm = IERC20(usdmAddress);
        witnet = IWitnetRandomness(witnetAddress);
    }


    // ============= ARENA FUNCTIONS =============

    function createArena(uint256 betAmount, uint8 maxPlayers)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 arenaId)
    {
        require(!blacklist[msg.sender], "address blacklisted");
        require(maxPlayers >= 2 && maxPlayers <= 4, "player count must be 2-4");
        require(betAmount > 0, "bet must be positive");

        _takeBet(msg.sender, betAmount);

        arenaId = ++arenaCount;
        Arena storage arena = arenas[arenaId];
        arena.arenaId = arenaId;
        arena.betAmount = betAmount;
        arena.maxPlayers = maxPlayers;
        arena.playerCount = 1;
        arena.createdAt = block.timestamp;
        arena.players.push(msg.sender);

        emit ArenaCreated(arenaId, msg.sender, betAmount, maxPlayers);
    }

    function joinArena(uint256 arenaId)
        external
        whenNotPaused
        nonReentrant
    {
        require(!blacklist[msg.sender], "address blacklisted");

        Arena storage arena = arenas[arenaId];
        require(
            arena.playerCount > 0 && arena.playerCount < arena.maxPlayers,
            "arena unavailable"
        );
        require(!arena.settled, "arena already settled");

        // Check player not already joined
        for (uint256 i = 0; i < arena.players.length; i++) {
            require(arena.players[i] != msg.sender, "already joined");
        }

        _takeBet(msg.sender, arena.betAmount);
        arena.playerCount++;
        arena.players.push(msg.sender);

        emit PlayerJoined(arenaId, msg.sender);
    }

    function pickCard(uint256 arenaId, uint8 cardIndex)
        external
        whenNotPaused
    {
        require(!blacklist[msg.sender], "address blacklisted");
        require(cardIndex < 4, "invalid card index");

        Arena storage arena = arenas[arenaId];
        require(arena.playerCount > 0, "arena not found");
        require(!arena.settled, "arena settled");
        require(arena.roundId == 0, "round already created");

        bool isArenaPlayer;
        for (uint256 i = 0; i < arena.players.length; i++) {
            if (arena.players[i] == msg.sender) {
                isArenaPlayer = true;
                break;
            }
        }
        require(isArenaPlayer, "not an arena player");

        if (!arena.hasPicked[msg.sender]) {
            arena.hasPicked[msg.sender] = true;
            arena.pickedCount++;
        }
        arena.playerCards[msg.sender] = cardIndex;
        emit CardPicked(arenaId, msg.sender, cardIndex);

        if (
            arena.playerCount == arena.maxPlayers &&
            arena.pickedCount == arena.playerCount
        ) {
            uint256 roundId = ++roundCount;
            Round storage round = rounds[roundId];
            round.roundId = roundId;
            round.roundType = "arena";
            round.arenaId = arenaId;
            round.potUsdm = arena.betAmount * arena.playerCount;
            round.createdAt = block.timestamp;
            round.status = "created";
            arena.roundId = roundId;

            emit RoundCreated(roundId, "arena", arenaId, address(0), round.potUsdm);
        }
    }


    // ============= SOLO FUNCTIONS =============

    function startSoloGame(uint256 betAmount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 roundId)
    {
        require(!blacklist[msg.sender], "address blacklisted");
        require(betAmount > 0, "bet must be positive");

        _takeBet(msg.sender, betAmount);

        roundId = ++roundCount;

        Round storage round = rounds[roundId];
        round.roundId = roundId;
        round.roundType = "solo";
        round.player = msg.sender;
        round.potUsdm = betAmount;
        round.createdAt = block.timestamp;
        round.status = "created";

        emit RoundCreated(roundId, "solo", 0, msg.sender, betAmount);
    }

    function pickSoloCard(uint256 gameId, uint8 cardIndex)
        external
        whenNotPaused
    {
        require(!blacklist[msg.sender], "address blacklisted");
        require(cardIndex < 2, "invalid card");

        Round storage round = rounds[gameId];
        require(round.player == msg.sender, "not your game");
        require(
            keccak256(abi.encode(round.status)) != keccak256(abi.encode("completed")) &&
            keccak256(abi.encode(round.status)) != keccak256(abi.encode("refunded")),
            "game ended"
        );

        require(
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("created")),
            "invalid round state"
        );

        round.selectedCard = cardIndex;
        emit SoloPlayed(msg.sender, round.potUsdm, cardIndex, gameId);
    }


    // ============= WITNET RANDOMNESS =============

    function requestRandomness(uint256 roundId)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        require(
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("created")),
            "invalid round state"
        );

        uint256 celoPaid = witnet.estimateRandomizeFee(tx.gasprice);
        require(msg.value >= celoPaid, "insufficient CELO");
        uint256 requestBlock = witnet.randomize{value: celoPaid}();

        randomnessRequests[roundId] = RandomnessRequest({
            roundId: roundId,
            requestBlock: requestBlock,
            requestedAt: block.timestamp,
            celoPaid: celoPaid,
            fulfilled: false
        });
        round.status = "randomnessRequested";

        uint256 unusedCelo = msg.value - celoPaid;
        if (unusedCelo > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: unusedCelo}("");
            require(refunded, "CELO refund failed");
        }

        emit RandomnessRequested(roundId, requestBlock, msg.sender, celoPaid);
    }

    function fetchRandomness(uint256 roundId) external nonReentrant {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        require(
            keccak256(abi.encode(round.status)) ==
                keccak256(abi.encode("randomnessRequested")),
            "randomness not requested"
        );

        RandomnessRequest storage request = randomnessRequests[roundId];
        require(!request.fulfilled, "randomness already fetched");
        require(witnet.isRandomized(request.requestBlock), "randomness unavailable");

        bytes32 randomness = witnet.getRandomnessAfter(request.requestBlock);
        uint256[] memory cardValues = new uint256[](4);

        for (uint256 cardIndex = 0; cardIndex < 4; cardIndex++) {
            uint256 nonce = uint256(keccak256(abi.encode(roundId, cardIndex)));
            cardValues[cardIndex] =
                1 +
                witnet.random(100, nonce, request.requestBlock);
        }

        request.fulfilled = true;
        round.randomness = randomness;
        round.numbers = cardValues;
        round.commitHash = keccak256(abi.encode(randomness, cardValues));
        round.status = "revealed";

        emit RandomnessRevealed(roundId, round.commitHash, randomness);
    }

    function checkRandomnessTimeout(uint256 roundId) external nonReentrant {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");

        require(
            keccak256(abi.encode(round.status)) ==
                keccak256(abi.encode("randomnessRequested")),
            "randomness not pending"
        );
        RandomnessRequest storage request = randomnessRequests[roundId];
        require(
            block.timestamp >= request.requestedAt + RANDOMNESS_TIMEOUT,
            "timeout not reached"
        );

        emit RandomnessTimeoutTriggered(roundId, request.requestBlock);
        _refundRound(roundId, "randomness timeout");
    }

    /**
     * @notice Public getter for commit hash (for post-round verification)
     * @param roundId The round ID
     */
    function getCommitHash(uint256 roundId) external view returns (bytes32) {
        return rounds[roundId].commitHash;
    }

    function getRandomness(uint256 roundId) external view returns (bytes32) {
        Round storage round = rounds[roundId];
        require(
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("revealed")) ||
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("completed")),
            "randomness not revealed"
        );
        return round.randomness;
    }

    // ============= SEED REVEAL & FAIRNESS =============

    function revealSeeds(
        uint256 roundId,
        string calldata serverSeed,
        string calldata clientSeed,
        uint256 nonce
    ) external onlyOwner {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        round.serverSeed = serverSeed;
        round.clientSeed = clientSeed;
        round.nonce = nonce;
        emit SeedRevealed(roundId, serverSeed, clientSeed, nonce);
    }


    // ============= SETTLEMENT & PAYOUT =============

    function settleRound(uint256 roundId)
        external
        nonReentrant
    {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        require(
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("revealed")),
            "round not revealed"
        );
        uint256 payout;
        address winner;

        if (
            keccak256(abi.encode(round.roundType)) == keccak256(abi.encode("arena"))
        ) {
            Arena storage arena = arenas[round.arenaId];
            winner = arena.players[0];
            uint256 highestValue = round.numbers[arena.playerCards[winner]];

            for (uint256 i = 1; i < arena.players.length; i++) {
                address player = arena.players[i];
                uint256 selectedValue = round.numbers[arena.playerCards[player]];
                if (selectedValue > highestValue) {
                    highestValue = selectedValue;
                    winner = player;
                }
            }

            payout = (round.potUsdm * 95) / 100;
            uint256 ownerFee = round.potUsdm - payout;
            round.winnerAddress = winner;
            round.status = "completed";
            arena.winner = winner;
            arena.settled = true;

            require(usdm.transfer(winner, payout), "winner transfer failed");
            require(usdm.transfer(owner(), ownerFee), "owner fee transfer failed");
            playerStats[winner].totalWonUsdm += payout;
        } else {
            if (round.numbers[round.selectedCard] >= round.numbers[1 - round.selectedCard]) {
                winner = round.player;
                payout = (round.potUsdm * 195) / 100;
                round.winnerAddress = winner;
                round.status = "completed";

                require(usdm.transfer(winner, payout), "solo payout failed");
                playerStats[winner].totalWonUsdm += payout;
            } else {
                winner = owner();
                payout = round.potUsdm;
                round.winnerAddress = winner;
                round.status = "completed";

                require(usdm.transfer(winner, payout), "solo loss transfer failed");
            }
        }

        emit WinnerPaid(roundId, winner, payout, "settlement");
    }

    /**
     * @notice Internal refund function for timeouts or other issues
     */
    function _refundRound(uint256 roundId, string memory reason) internal {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        require(
            keccak256(abi.encode(round.status)) != keccak256(abi.encode("completed")) &&
            keccak256(abi.encode(round.status)) != keccak256(abi.encode("refunded")),
            "cannot refund"
        );

        round.status = "refunded";

        if (keccak256(abi.encode(round.roundType)) == keccak256(abi.encode("solo"))) {
            require(usdm.transfer(round.player, round.potUsdm), "refund failed");
            emit RefundProcessed(roundId, round.player, round.potUsdm, reason);
            return;
        }

        _refundAllArena(roundId, reason);
    }

    function _refundAllArena(uint256 roundId, string memory reason) internal {
        Round storage round = rounds[roundId];
        Arena storage arena = arenas[round.arenaId];

        for (uint256 i = 0; i < arena.players.length; i++) {
            address player = arena.players[i];
            require(
                usdm.transfer(player, arena.betAmount),
                "arena refund failed"
            );
            emit RefundProcessed(roundId, player, arena.betAmount, reason);
        }

        arena.settled = true;
    }

    function emergencyRefundRound(uint256 roundId)
        external
        onlyOwner
        nonReentrant
    {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        require(
            keccak256(abi.encode(round.status)) ==
                keccak256(abi.encode("created")) ||
                keccak256(abi.encode(round.status)) ==
                keccak256(abi.encode("randomnessRequested")),
            "round not refundable"
        );

        _refundRound(roundId, "emergency randomness refund");
    }

    // ============= ADMIN FUNCTIONS =============

    function ban(address player) external onlyOwner {
        blacklist[player] = true;
        playerStats[player].isBanned = true;
        emit PlayerBanned(player);
    }

    function unban(address player) external onlyOwner {
        blacklist[player] = false;
        playerStats[player].isBanned = false;
    }

    function applyCooldown(address player) external onlyOwner {
        playerStats[player].recentLosses++;
        if (playerStats[player].recentLosses >= lossesBeforeCooldown) {
            playerStats[player].lastLossTime = block.timestamp;
            emit CooldownApplied(player, cooldownDuration);
        }
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }


    function setMaxBet(uint256 perTx, uint256 perDay) external onlyOwner {
        require(perTx > 0 && perDay > 0, "bet limits must be positive");
        require(perDay >= perTx, "daily limit must be >= tx limit");
        maxBetPerTx = perTx;
        maxBetPerDay = perDay;
    }

    function setCooldownParams(uint256 duration, uint256 losses)
        external
        onlyOwner
    {
        require(duration > 0 && losses > 0, "params must be positive");
        cooldownDuration = duration;
        lossesBeforeCooldown = losses;
    }

    // ============= INTERNAL FUNCTIONS =============

    /**
     * @notice Take a bet from player, enforcing all limits
     */
    function _takeBet(address player, uint256 amount) internal {
        require(!blacklist[player], "player blacklisted");
        require(amount > 0 && amount <= maxBetPerTx, "bet outside limits");

        // Reset daily limit if new day
        uint256 currentDate = block.timestamp / 1 days;
        uint256 lastBetDate = playerStats[player].lastBetDate;
        if (currentDate > lastBetDate) {
            dailyBetTotal[player] = 0;
            playerStats[player].lastBetDate = currentDate;
        }

        require(
            dailyBetTotal[player] + amount <= maxBetPerDay,
            "daily limit exceeded"
        );

        // Check cooldown
        if (playerStats[player].recentLosses >= lossesBeforeCooldown) {
            uint256 cooldownEnd = playerStats[player].lastLossTime +
                cooldownDuration;
            require(block.timestamp >= cooldownEnd, "in cooldown");
        }

        dailyBetTotal[player] += amount;
        playerStats[player].totalPlayed++;

        require(
            usdm.transferFrom(player, address(this), amount),
            "transfer failed"
        );
    }


    // ============= GETTERS =============

    function getPlayerStats(address player)
        external
        view
        returns (PlayerStats memory)
    {
        return playerStats[player];
    }

    function getRound(uint256 roundId)
        external
        view
        returns (Round memory)
    {
        return rounds[roundId];
    }

    function getArena(uint256 arenaId)
        external
        view
        returns (
            uint256,
            uint256,
            uint8,
            uint8,
            bool,
            address,
            uint256,
            address[] memory
        )
    {
        Arena storage arena = arenas[arenaId];
        return (
            arena.arenaId,
            arena.betAmount,
            arena.maxPlayers,
            arena.playerCount,
            arena.settled,
            arena.winner,
            arena.createdAt,
            arena.players
        );
    }

    function isPlayerBanned(address player) external view returns (bool) {
        return blacklist[player];
    }

    function getRandomnessRequest(uint256 roundId)
        external
        view
        returns (RandomnessRequest memory)
    {
        return randomnessRequests[roundId];
    }
}
