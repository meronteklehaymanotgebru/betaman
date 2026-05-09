# BetAman

Decentralized rental verification and escrow platform for Ethiopia.

## Quick Start for Developers

### Prerequisites
- Node.js 20.x
- npm 10.x
- Rust 1.75+ (for smart contract work)
- Anchor CLI 0.29.0 (for smart contract work)

### Frontend Setup
1. Navigate to client directory
   cd client

2. Install dependencies
   npm install

3. Create environment file
   cp .env.example .env.local

4. Start development server
   npm run dev

5. Open http://localhost:3000

### Smart Contract Setup (Optional for frontend work)
1. Navigate to program directory
   cd program

2. Build the Anchor program
   anchor build

3. Deploy to devnet (requires SOL)
   anchor deploy --provider.cluster devnet

### Wallet Setup for Testing
1. Install Phantom browser extension
2. Create a new wallet or use existing
3. Switch network to Devnet in Phantom settings
4. Request test SOL: https://faucet.solana.com

## Project Structure
client/          # Next.js frontend (TypeScript, Tailwind)
program/         # Solana smart contract (Rust, Anchor)

## Key Files
- client/src/app/page.tsx        # Main application page
- client/src/context/WalletContext.tsx  # Solana wallet provider
- program/betaman_program/src/lib.rs    # Escrow smart contract

## Environment Variables
See .env.example for required variables. Do not commit .env.local.

## Contributing
1. Create a feature branch: git checkout -b feature/your-feature
2. Make changes and test locally
3. Push and open a pull request

## License
MIT
