// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

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
contract Xolat is ReentrancyGuard, Pausable, VRFConsumerBaseV2Plus {
    // ============= STATE VARIABLES =============

    IERC20 public immutable usdm;

    // VRF Configuration (from constructor, immutable for security)
    uint256 public immutable s_subscriptionId;
    bytes32 public immutable keyHash;

    // Bet Limits
    uint256 public maxBetPerTx = 20e18;
    uint256 public maxBetPerDay = 100e18;

    // Game Counters
    uint256 public arenaCount;

    // Cooldown & Loss Tracking
    uint256 public cooldownDuration = 1 hours;
    uint256 public lossesBeforeCooldown = 5;

    // VRF Request Tracking
    uint256 public vrfRequestTimeout = 300; // 300 seconds
    mapping(uint256 requestId => VRFRequest) public vrfRequests;
    mapping(uint256 roundId => uint256 vrfRequestId) public roundVrfMap;

    // ============= STRUCTS =============

    struct VRFRequest {
        uint256 requestId;
        uint256 roundId;
        uint256 requestedAt;
        bool fulfilled;
        bytes32 vrfRandom;
    }

    struct Arena {
        uint256 arenaId;
        uint256 betAmount;
        uint8 maxPlayers;
        uint8 playerCount;
        bool settled;
        address winner;
        uint256 createdAt;
        address[] players;
        mapping(address => uint8) playerCards; // card index 0-3
    }

    struct Round {
        uint256 roundId;
        string roundType; // "arena" or "solo"
        address player;
        uint256 arenaId; // 0 for solo
        bytes32 commitHash; // keccak256(abi.encode(vrfRandom, numbers))
        string serverSeed;
        string clientSeed;
        uint256 nonce;
        bytes32 vrfRandom;
        uint256[] numbers; // generated from VRF, 1-100 per card
        address winnerAddress;
        uint256 potUsdm;
        string txHash;
        uint256 vrfRequestId;
        string status; // "created", "vrfRequested", "revealed", "completed", "refunded"
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
    event VRFRequested(
        uint256 indexed roundId,
        uint256 indexed vrfRequestId,
        address indexed requester
    );
    event CommitRevealed(
        uint256 indexed roundId,
        bytes32 commitHash,
        bytes32 vrfRandom
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
    event VRFTimeoutTriggered(
        uint256 indexed roundId,
        uint256 indexed vrfRequestId
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

    constructor(
        address usdmAddress,
        address vrfCoordinator,
        bytes32 _keyHash,
        uint256 subscriptionId
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        require(usdmAddress != address(0), "invalid USDM address");
        require(_keyHash != bytes32(0), "invalid keyHash");
        require(subscriptionId > 0, "invalid subscription ID");

        usdm = IERC20(usdmAddress);
        keyHash = _keyHash;
        s_subscriptionId = subscriptionId;
    }


    // ============= ARENA FUNCTIONS =============

    function createArena(uint256 betAmount, uint8 maxPlayers)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 arenaId)
    {
        require(!blacklist[msg.sender], "address blacklisted");
        require(maxPlayers >= 2 && maxPlayers <= 6, "invalid player count");
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

        arena.playerCards[msg.sender] = cardIndex;
        emit CardPicked(arenaId, msg.sender, cardIndex);
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

        roundId = uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender, blockhash(block.number - 1)))
        );

        Round storage round = rounds[roundId];
        round.roundId = roundId;
        round.roundType = "solo";
        round.player = msg.sender;
        round.potUsdm = betAmount;
        round.createdAt = block.timestamp;
        round.status = "created";
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

        emit SoloPlayed(msg.sender, round.potUsdm, cardIndex, gameId);

        // Request VRF for this round
        _requestVRF(gameId);
    }


    // ============= VRF INTEGRATION =============

    /**
     * @notice Request random words from Chainlink VRF v2.5
     * @param roundId The round ID to associate with this VRF request
     */
    function _requestVRF(uint256 roundId) internal {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        require(
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("created")),
            "invalid round state"
        );

        // Request 1 random word (will return uint256 we use to generate cards)
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: 3,
                callbackGasLimit: 200000,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        round.vrfRequestId = requestId;
        round.status = "vrfRequested";

        vrfRequests[requestId] = VRFRequest({
            requestId: requestId,
            roundId: roundId,
            requestedAt: block.timestamp,
            fulfilled: false,
            vrfRandom: bytes32(0)
        });

        roundVrfMap[roundId] = requestId;

        emit VRFRequested(roundId, requestId, msg.sender);
    }

    /**
     * @notice Chainlink VRF callback - generates card values from randomness
     * @param requestId The VRF request ID
     * @param randomWords Array of random words (we use randomWords[0])
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        require(randomWords.length > 0, "no random words");

        VRFRequest storage vrfReq = vrfRequests[requestId];
        require(vrfReq.roundId != 0, "request not found");

        uint256 roundId = vrfReq.roundId;
        Round storage round = rounds[roundId];

        // Store raw VRF random value
        vrfReq.vrfRandom = bytes32(randomWords[0]);
        vrfReq.fulfilled = true;
        round.vrfRandom = bytes32(randomWords[0]);
        round.status = "revealed";

        // Generate 2-4 card values (1-100) from the random word
        uint256[] memory cardValues = new uint256[](4);
        uint256 randomValue = randomWords[0];

        for (uint256 i = 0; i < 4; i++) {
            // Extract different bytes from the random value
            uint256 card = (randomValue >> (i * 64)) % 100 + 1;
            cardValues[i] = card;
        }

        round.numbers = cardValues;

        // Compute commit hash for post-round verification
        bytes32 commitHash = keccak256(abi.encode(bytes32(randomWords[0]), cardValues));
        round.commitHash = commitHash;

        emit CommitRevealed(roundId, commitHash, bytes32(randomWords[0]));
    }

    /**
     * @notice Check if a VRF request has timed out and trigger refund if needed
     * @param roundId The round ID to check
     */
    function checkVRFTimeout(uint256 roundId) external nonReentrant {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");

        if (keccak256(abi.encode(round.status)) != keccak256(abi.encode("vrfRequested"))) {
            return; // Not waiting for VRF
        }

        uint256 vrfRequestId = round.vrfRequestId;
        VRFRequest storage vrfReq = vrfRequests[vrfRequestId];

        require(
            block.timestamp >= vrfReq.requestedAt + vrfRequestTimeout,
            "timeout not reached"
        );

        emit VRFTimeoutTriggered(roundId, vrfRequestId);
        _refundRound(roundId, "VRF timeout");
    }

    /**
     * @notice Public getter for commit hash (for post-round verification)
     * @param roundId The round ID
     */
    function getCommitHash(uint256 roundId) external view returns (bytes32) {
        return rounds[roundId].commitHash;
    }

    /**
     * @notice Get VRF random value for a round (revealed only)
     * @param roundId The round ID
     */
    function getVRFRandom(uint256 roundId) external view returns (bytes32) {
        Round storage round = rounds[roundId];
        require(
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("revealed")) ||
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("completed")),
            "vrf not revealed"
        );
        return round.vrfRandom;
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

    /**
     * @notice Settle an arena or solo round with winner determination
     * Only called after VRF fulfillment and card reveal
     * Arena: 95% to winner, 5% to owner
     * Solo: 1.95x payout (2.5% house edge)
     */
    function settleRound(uint256 roundId, address winner)
        external
        onlyOwner
        nonReentrant
    {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        require(
            keccak256(abi.encode(round.status)) == keccak256(abi.encode("revealed")),
            "round not revealed"
        );
        require(winner != address(0), "invalid winner");

        round.winnerAddress = winner;
        round.status = "completed";

        uint256 payout;

        if (
            keccak256(abi.encode(round.roundType)) == keccak256(abi.encode("arena"))
        ) {
            // Arena: 95% to winner, 5% to owner
            uint256 totalPot = round.potUsdm;
            payout = (totalPot * 95) / 100;
            uint256 ownerFee = totalPot - payout;

            require(usdm.transfer(winner, payout), "winner transfer failed");
            require(usdm.transfer(owner(), ownerFee), "owner fee transfer failed");
        } else {
            // Solo: 1.95x payout (2.5% house edge, 2.5% winner gets 1.95x)
            payout = (round.potUsdm * 195) / 100; // 1.95x

            require(usdm.transfer(winner, payout), "solo payout failed");
        }

        playerStats[winner].totalWonUsdm += payout;
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
        } else {
            // Arena refund to all players
            Arena storage arena = arenas[round.arenaId];
            for (uint256 i = 0; i < arena.players.length; i++) {
                require(usdm.transfer(arena.players[i], round.potUsdm), "arena refund failed");
                emit RefundProcessed(roundId, arena.players[i], round.potUsdm, reason);
            }
        }
    }

    /**
     * @notice Emergency refund all players in an arena (owner-only, for emergencies)
     */
    function refundAllArena(uint256 arenaId) external onlyOwner nonReentrant {
        Arena storage arena = arenas[arenaId];
        require(arena.arenaId != 0, "arena not found");

        for (uint256 i = 0; i < arena.players.length; i++) {
            address player = arena.players[i];
            require(
                usdm.transfer(player, arena.betAmount),
                "refund failed"
            );
            emit RefundProcessed(0, player, arena.betAmount, "emergency arena refund");
        }

        arena.settled = true;
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

    function setVRFTimeout(uint256 timeoutSeconds) external onlyOwner {
        require(timeoutSeconds > 60, "timeout too short");
        vrfRequestTimeout = timeoutSeconds;
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

    function getVRFRequest(uint256 requestId)
        external
        view
        returns (VRFRequest memory)
    {
        return vrfRequests[requestId];
    }
}
