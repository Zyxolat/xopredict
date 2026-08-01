# Provably Fair Protocol Specification

## Witnet Oracle VRF Randomness
- **Server Seed Commitment:** The server generates and commits a cryptographic seed hash on-chain before player card selections are locked.
- **Randomness Generation:** Random numbers are requested directly from the Witnet Oracle contract (`WITNET_RANDOMNESS_ADDRESS`) on Celo.
- **Verification:** Anyone can verify the seed hash, player card picks, and oracle randomness on the `/verify` route or directly on-chain via Celo block explorer.
