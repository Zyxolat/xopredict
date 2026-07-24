# Disaster Recovery & Emergency Procedures – Xopredict

Instructions for responding to emergency failures, database loss, contract pauses, or relayer key compromises.

---

## 1. Relayer Key Compromise

1. Call `pause()` on Xolat contract from owner wallet to pause all betting and game creations.
2. Generate new relayer private key.
3. Update `RELAYER_PRIVATE_KEY` in environment config.
4. Call `unpause()` from owner wallet.

---

## 2. Database Restoration

1. Restore PostgreSQL snapshot from daily backup.
2. Run `npx prisma migrate deploy` to ensure schema consistency.
3. Trigger `/api/keeper/health` to verify database status.

---

## 3. Emergency Contract Pause

To pause smart contract operations during an active exploit or network reorg:
```bash
npx hardhat run scripts/emergency-pause.ts --network celo
```
