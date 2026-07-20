# XOLAT

Mobile-first prediction game interface for USDm on Celo. The application uses Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma, wagmi/viem, and an experimental Solidity contract scaffold.

## Local development

1. Copy `.env.example` to `.env.local` and provide the required Celo, database, authentication, and WalletConnect values.
2. Install packages with `npm install`.
3. Generate the Prisma client with `npm run prisma:generate`.
4. Start the development server with `npm run dev`.

The health endpoint is available at `/api/health`.

## Verification

- Build the web application with `npm run build`.
- Run the VS Code **Build XOLAT** task to execute the same production build.
- Compile the contract after installing the Hardhat dependencies with `npm run contract:compile`.

## Smart-contract safety

`contracts/Xolat.sol` is a UI and integration scaffold, not a production-ready custody contract. It has not been audited and does not contain a complete randomness, settlement, player tracking, or refund implementation. Do not deploy it to a live network or accept user deposits until the contract has been independently audited and production settlement logic is complete.
