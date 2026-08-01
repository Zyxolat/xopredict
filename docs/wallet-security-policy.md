# Wallet Security & Address Normalization Policy

## Security Principles
1. **Database Constraint Authority:** The `@unique` constraint on the `Wallet.address` table column is the sole authority for wallet ownership uniqueness across accounts.
2. **Case Normalization:** All wallet addresses MUST be converted to lowercase (`.toLowerCase()`) before database lookup, insertion, or verification.
3. **Idempotency:** A user linking an address already associated with their own `userId` MUST receive a 200 success response without duplicate row creation or error.
4. **Cross-Account Conflict:** A wallet address associated with a different `userId` MUST be rejected with HTTP 409 `WalletLinkConflictError`.
