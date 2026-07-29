# XoPredict — Database Design Documentation

## Schema Entity Relationship Diagram

```
+------------------+         +--------------------+         +-----------------------+
|       User       | 1 --- * |       Wallet       |         |   EmailVerification   |
+------------------+         +--------------------+         +-----------------------+
| id (cuid) PK     |         | id (uuid) PK       |         | id (uuid) PK          |
| email (unique)   |         | userId FK          |         | userId FK             |
| username (unique)|         | address (unique)   |         | otpHash               |
| displayName      |         | walletType         |         | expiresAt             |
| passwordHash     |         | network            |         | attempts              |
| emailVerified    |         | isPrimary          |         | usedAt                |
| role (USER|ADMIN)|         | verifiedAt         |         +-----------------------+
| status (ACTIVE)  |         +--------------------+
+--------+---------+
         |
         | 1 --- 1
         v
+------------------+         +--------------------+         +-----------------------+
|      Player      | 1 --- * |        Pick        |         |     PasswordReset     |
+------------------+         +--------------------+         +-----------------------+
| id (uuid) PK     |         | id (uuid) PK       |         | id (uuid) PK          |
| userId FK        |         | roundId FK         |         | userId FK             |
| address (synced) |         | playerId FK        |         | otpHash               |
| totalWonUsdm     |         | cardIndex          |         | expiresAt             |
| totalPlayed      |         +--------------------+         | attempts              |
| streakDays       |                                        +-----------------------+
| rank             |
| vipExpiresAt     |         +--------------------+         +-----------------------+
+------------------+         |    LoginHistory    |         |       KeeperJob       |
                             +--------------------+         +-----------------------+
                             | id (uuid) PK       |         | id (uuid) PK          |
                             | userId FK          |         | roundId / arenaId     |
                             | ip / browser       |         | playerAddress         |
                             | success            |         | stage / status        |
                             +--------------------+         +-----------------------+
```

## Indexes & Constraints
- `User.email` (Unique index)
- `User.username` (Unique index, case-insensitive enforcement in API)
- `Wallet.address` (Unique index globally across platform)
- `Player.totalWonUsdm` (Desc index for rapid leaderboard querying)
- `KeeperJob(status, stage)` (Composite index for efficient keeper worker claiming)
