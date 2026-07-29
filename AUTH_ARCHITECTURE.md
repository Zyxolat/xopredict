# XoPredict — Authentication Architecture (Auth V2)

## Overview
XoPredict operates on a **Hybrid Web2 + Web3 Architecture**. User identity is centered around a verified user account (`User.id`, `User.email`, `User.username`), while EVM wallets (`Wallet.address`) act exclusively as linked blockchain identities for on-chain prediction match execution.

```
       +-------------------------------------------------------------+
       |                        USER ACCOUNT                         |
       |  id: "usr_123"                                              |
       |  email: "player@example.com" (VERIFIED)                     |
       |  username: "HenryX"                                         |
       |  passwordHash: "$2a$12$..." (bcrypt)                        |
       |  role: USER | ADMIN                                         |
       +------------------------------+------------------------------+
                                      |
             +------------------------+------------------------+
             | 1:N Linked Wallets                              | 1:1 Game Profile
             v                                                 v
   +-------------------+                             +-------------------+
   |   EVM WALLETS     |                             |   PLAYER STATS    |
   | 0x1111... (Cel)   |                             | Rank: Gold        |
   | 0x2222... (Met)   |                             | XP: 14,500        |
   +-------------------+                             | Wins: 42          |
                                                     +-------------------+
```

## Key Principles
1. **Account-Centric Identity**: Email and Username define who the user is across all UI surfaces (Leaderboard, Arena, History, Profile). Wallet addresses are never displayed as primary identities.
2. **Post-Authentication Wallet Linking**: Users register and log in first using email/password or Google OAuth. Wallet connection occurs ONLY AFTER authentication via nonce-based signature verification (`viem.verifyMessage`).
3. **No Automatic Wallet Sign-In**: Connecting a wallet NEVER auto-registers a user, NEVER auto-authenticates a session, and NEVER triggers automatic redirects.
4. **Global Wallet Uniqueness**: One wallet can belong to ONLY ONE user account. Attempting to link an already linked wallet returns `409 Conflict`.
