import { parseAbi } from "viem";

export const xolatAbi = parseAbi([
  "function createArena(uint256 betAmount, uint8 maxPlayers) returns (uint256)",
  "function joinArena(uint256 arenaId)",
  "function pickCard(uint256 arenaId, uint8 cardIndex)",
  "function startSoloGame(uint256 betAmount) returns (uint256)",
  "function pickSoloCard(uint256 gameId, uint8 cardIndex)",
  "function refundAll(uint256 arenaId)",
  "function pause()",
  "function unpause()",
  "function setMaxBet(uint256 perTx, uint256 perDay)",
]);

export const usdmAbi = parseAbi([
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
]);

export const xolatAddress = process.env.NEXT_PUBLIC_XOLAT_CONTRACT_ADDRESS as `0x${string}` | undefined;
export const usdmAddress = process.env.NEXT_PUBLIC_USDM_TOKEN_ADDRESS as `0x${string}` | undefined;
