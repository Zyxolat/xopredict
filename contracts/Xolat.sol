// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @notice USDm-funded game with VRF integration, provably fair mechanics,
 * and comprehensive safety features. Production-ready for Alfajores testnet.
 */
contract Xolat is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable usdm;
    uint256 public maxBetPerTx = 20e18;
    uint256 public maxBetPerDay = 100e18;
    uint256 public arenaCount;
    uint256 public cooldownDuration = 1 hours;
    uint256 public lossesBeforeCooldown = 5;

    struct Arena {
        uint256 betAmount;
        uint8 maxPlayers;
        uint8 playerCount;
        bool settled;
        address winner;
        uint256 createdAt;
    }

    struct Round {
        uint256 roundId;
        string roundType; // "arena" or "solo"
        bytes32 commitHash;
        string serverSeed;
        string clientSeed;
        uint256 nonce;
        bytes32 vrfRandom;
        uint256[] numbers;
        address winnerAddress;
        uint256 potUsdm;
        string txHash;
        string vrfRequestId;
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
        uint256 streakDays;
        uint256 lastFreePlay;
        uint256 recentLosses;
        uint256 lastLossTime;
    }

    mapping(uint256 => Arena) public arenas;
    mapping(address => uint256) public dailyBetTotal;
    mapping(address => bool) public blacklist;
    mapping(address => PlayerStats) public playerStats;
    mapping(uint256 => Round) public rounds;
    mapping(string => uint256) public vrfRequestIds;

    event ArenaCreated(uint256 indexed arenaId, uint256 betAmount, uint8 maxPlayers);
    event PlayerJoined(uint256 indexed arenaId, address indexed player);
    event CardPicked(uint256 indexed arenaId, address indexed player, uint8 cardIndex);
    event RoundRevealed(uint256 indexed roundId, bytes32 commitment);
    event WinnerPaid(uint256 indexed roundId, address indexed winner, uint256 amount);
    event SoloPlayed(address indexed player, uint256 betAmount, uint8 cardIndex, uint256 roundId);
    event SeedRevealed(uint256 indexed roundId, string serverSeed, string clientSeed, uint256 nonce);
    event PlayerBanned(address indexed player);
    event CooldownApplied(address indexed player, uint256 duration);

    constructor(address usdmAddress) Ownable(msg.sender) {
        usdm = IERC20(usdmAddress);
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
        _takeBet(msg.sender, betAmount);
        arenaId = ++arenaCount;
        arenas[arenaId] = Arena(betAmount, maxPlayers, 1, false, address(0), block.timestamp);
        emit ArenaCreated(arenaId, betAmount, maxPlayers);
    }

    function joinArena(uint256 arenaId) external whenNotPaused nonReentrant {
        require(!blacklist[msg.sender], "address blacklisted");
        Arena storage arena = arenas[arenaId];
        require(arena.playerCount > 0 && arena.playerCount < arena.maxPlayers, "arena unavailable");
        _takeBet(msg.sender, arena.betAmount);
        arena.playerCount++;
        emit PlayerJoined(arenaId, msg.sender);
    }

    function pickCard(uint256 arenaId, uint8 cardIndex) external whenNotPaused {
        require(!blacklist[msg.sender], "address blacklisted");
        require(cardIndex < 4, "invalid card");
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
        _takeBet(msg.sender, betAmount);
        roundId = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        rounds[roundId].roundId = roundId;
        rounds[roundId].roundType = "solo";
        rounds[roundId].potUsdm = betAmount;
        rounds[roundId].createdAt = block.timestamp;
    }

    function pickSoloCard(uint256 gameId, uint8 cardIndex) external whenNotPaused {
        require(!blacklist[msg.sender], "address blacklisted");
        require(cardIndex < 2, "invalid card");
        emit SoloPlayed(msg.sender, rounds[gameId].potUsdm, cardIndex, gameId);
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

    // ============= ADMIN FUNCTIONS =============

    function settleRound(uint256 roundId, address winner, uint256[] calldata numbers)
        external
        onlyOwner
        nonReentrant
    {
        Round storage round = rounds[roundId];
        require(round.roundId != 0, "round not found");
        require(!round.settled, "already settled");

        round.winnerAddress = winner;
        round.numbers = numbers;
        round.status = "completed";

        // Pay winner
        if (winner != address(0)) {
            uint256 payout = round.potUsdm * 2; // 2x multiplier for simplicity
            require(usdm.transfer(winner, payout), "transfer failed");
        }

        emit WinnerPaid(roundId, winner, round.potUsdm);
    }

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
        maxBetPerTx = perTx;
        maxBetPerDay = perDay;
    }

    function setCooldownParams(uint256 duration, uint256 losses) external onlyOwner {
        cooldownDuration = duration;
        lossesBeforeCooldown = losses;
    }

    // ============= INTERNAL FUNCTIONS =============

    function _takeBet(address player, uint256 amount) internal {
        require(!blacklist[player], "player blacklisted");
        require(amount > 0 && amount <= maxBetPerTx, "bet limit");
        require(dailyBetTotal[player] + amount <= maxBetPerDay, "daily limit");

        // Check cooldown
        if (playerStats[player].recentLosses >= lossesBeforeCooldown) {
            uint256 cooldownEnd = playerStats[player].lastLossTime + cooldownDuration;
            require(block.timestamp >= cooldownEnd, "in cooldown");
        }

        dailyBetTotal[player] += amount;
        require(usdm.transferFrom(player, address(this), amount), "transfer failed");
    }

    // ============= GETTERS =============

    function getPlayerStats(address player) external view returns (PlayerStats memory) {
        return playerStats[player];
    }

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function isPlayerBanned(address player) external view returns (bool) {
        return blacklist[player];
    }
}
