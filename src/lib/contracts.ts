import { parseAbi } from "viem";

export const xolatAbi = parseAbi([
  "function createArena(uint256 betAmount, uint8 maxPlayers) returns (uint256)",
  "function joinArena(uint256 arenaId)",
  "function pickCard(uint256 arenaId, uint8 cardIndex)",
  "function startSoloGame(uint256 betAmount) returns (uint256)",
  "function pickSoloCard(uint256 gameId, uint8 cardIndex)",
  "function requestRandomness(uint256 roundId) payable",
  "function fetchRandomness(uint256 roundId)",
  "function settleRound(uint256 roundId)",
  "function checkRandomnessTimeout(uint256 roundId)",
  "function refundAll(uint256 arenaId)",
  "function pause()",
  "function unpause()",
  "function setMaxBet(uint256 perTx, uint256 perDay)",
  "function witnet() view returns (address)",
  "function getRound(uint256 roundId) view returns (uint256 roundId, string roundType, address player, uint256 arenaId, bytes32 commitHash, string serverSeed, string clientSeed, uint256 nonce, bytes32 randomness, uint256[] numbers, address winnerAddress, uint256 potUsdm, string txHash, uint8 selectedCard, string status, uint256 createdAt)",
  "event RoundCreated(uint256 indexed roundId, string roundType, uint256 indexed arenaId, address indexed player, uint256 potUsdm)",
  "event SoloPlayed(address indexed player, uint256 betAmount, uint8 cardIndex, uint256 roundId)",
  "event RandomnessRequested(uint256 indexed roundId, uint256 indexed requestBlock, address indexed requester, uint256 celoPaid)",
  "event WinnerPaid(uint256 indexed roundId, address indexed winner, uint256 payout, string reason)"
]);

export const usdmAbi = parseAbi([
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

export const xolatAddress = process.env.NEXT_PUBLIC_XOLAT_CONTRACT_ADDRESS as `0x${string}` | undefined;
export const usdmAddress = process.env.NEXT_PUBLIC_USDM_TOKEN_ADDRESS as `0x${string}` | undefined;
