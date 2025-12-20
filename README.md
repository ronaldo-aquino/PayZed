# PayZed

A production-ready Web3 invoice creation and management platform that enables seamless payments in USDC and EURC stablecoins on the Arc Testnet.

## Features

- 🚀 **Create Invoices**: Generate invoices with custom amounts in USDC or EURC
- 💰 **Web3 Payments**: Accept payments directly through blockchain transactions
- 📱 **QR Code Payments**: Mobile-friendly QR codes for easy wallet scanning
- 📊 **Dashboard**: Manage and track all your invoices in one place
- 🌓 **Theme Support**: Light, dark, and system theme modes
- 🔒 **Secure**: Built with Supabase Row Level Security and proper validation

## Tech Stack

- **Framework**: Next.js 16.0.7 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Web3**: wagmi, viem, and RainbowKit for wallet integration
- **Database**: Supabase (PostgreSQL)
- **Forms**: React Hook Form with Zod validation
- **Blockchain**: Arc Testnet (EVM compatible)
- **Smart Contracts**: Solidity. See CONTRACT_DEPLOYMENT.md

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- A WalletConnect Cloud project ID
- A Web3 wallet (MetaMask, WalletConnect, etc.) configured for Arc Testnet

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL script from `supabase-schema.sql` to create the invoices table and policies

### 3. Configure Environment Variables

1. Copy the example environment file:

   ```bash
   cp env.example .env.local
   ```

2. Fill in your environment variables in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon/public key
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect Cloud project ID (get it from [cloud.walletconnect.com](https://cloud.walletconnect.com))
   - `NEXT_PUBLIC_PAYZED_CONTRACT_ADDRESS`: Your deployed contract address (after deployment)

3. Set up the environment file link for Next.js:

   ```bash
   npm run setup:env
   ```

   This creates a symlink so Next.js can read the `.env.local` file from the `frontend/` directory.

### 4. Get Arc Testnet Tokens

To test the application, you'll need testnet tokens:

1. Visit the [Circle Faucet](https://faucet.circle.com)
2. Select "Arc Testnet" as the network
3. Choose USDC or EURC and request test tokens
4. Make sure your wallet is connected to Arc Testnet

### 5. Add Arc Testnet to Your Wallet

If you're using MetaMask:

1. Open MetaMask and go to Settings > Networks > Add Network
2. Enter the following details:
   - **Network Name**: Arc Testnet
   - **New RPC URL**: `https://rpc.testnet.arc.network`
   - **Chain ID**: `5042002`
   - **Currency Symbol**: USDC
   - **Block Explorer URL**: `https://testnet.arcscan.app`
3. Save and switch to Arc Testnet

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ArcLedger/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Landing page
│   ├── login/             # Wallet connection page
│   ├── create/            # Invoice creation page
│   ├── pay/[id]/          # Payment page (public)
│   ├── dashboard/          # User dashboard
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   └── navbar.tsx          # Navigation component
├── lib/                    # Utility functions and configs
│   ├── wagmi.ts           # Web3 configuration
│   ├── supabase.ts        # Supabase client
│   ├── constants.ts       # Contract addresses and ABIs
│   └── utils.ts           # Helper functions
└── supabase-schema.sql    # Database schema
```

## Usage

### Creating an Invoice

1. Connect your wallet on the login page
2. Navigate to the dashboard and click "Create Invoice"
3. Fill in the invoice details:
   - Amount (must be positive)
   - Currency (USDC or EURC)
   - Receiver wallet address
4. Submit to create the invoice and get a payment link

### Paying an Invoice

1. Open the payment link (public, no authentication required)
2. **Desktop**: Click "Pay with Wallet" and confirm the transaction
3. **Mobile**: Scan the QR code with your wallet app
4. Wait for transaction confirmation
5. The invoice status will automatically update to "paid"

### Managing Invoices

- View all your invoices in the dashboard
- Copy payment links to share with payers
- Track payment status in real-time
- View transaction hashes on ArcScan

## Environment Variables

| Variable                               | Description                    | Required         |
| -------------------------------------- | ------------------------------ | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Your Supabase project URL      | Yes              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Your Supabase anon key         | Yes              |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID | Yes              |
| `NEXT_PUBLIC_ARC_TESTNET_RPC_URL`      | Arc Testnet RPC endpoint       | No (has default) |
| `NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID`     | Arc Testnet chain ID           | No (has default) |
| `NEXT_PUBLIC_USDC_CONTRACT_ADDRESS`    | USDC contract address          | No (has default) |
| `NEXT_PUBLIC_EURC_CONTRACT_ADDRESS`    | EURC contract address          | No (has default) |

## Arc Testnet Details

- **Network Name**: Arc Testnet
- **RPC URL**: `https://rpc.testnet.arc.network`
- **Chain ID**: `5042002`
- **Currency Symbol**: USDC
- **Block Explorer**: [testnet.arcscan.app](https://testnet.arcscan.app)
- **Faucet**: [faucet.circle.com](https://faucet.circle.com)

## Contract Addresses

Source: [Arc Network Documentation](https://docs.arc.network/arc/references/contract-addresses)

- **USDC**: `0x3600000000000000000000000000000000000000` (ERC-20 interface, 6 decimals)
- **EURC**: `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` (6 decimals)

**Important Note**: The USDC ERC-20 interface uses **6 decimals**, while the native USDC gas token uses 18 decimals. Always use the `decimals()` function to interpret balances correctly.

## Security Considerations

- All inputs are validated on both frontend and backend
- Supabase Row Level Security (RLS) policies protect user data
- Wallet addresses are normalized to lowercase for consistency
- Transaction hashes are stored for audit purposes
- Never expose private keys or sensitive data

## Troubleshooting

### Wallet Connection Issues

- Ensure your wallet is connected to Arc Testnet
- Check that you have testnet tokens in your wallet
- Try disconnecting and reconnecting your wallet

### Transaction Failures

- Verify you have sufficient balance (including gas fees)
- Check that the receiver address is valid
- Ensure you're on the correct network (Arc Testnet)

### Database Errors

- Verify your Supabase credentials are correct
- Ensure the database schema has been created
- Check RLS policies are properly configured

## Building for Production

```bash
npm run build
npm start
```

## License

This project is open source and available for use.

## Smart Contract Integration

The application is **fully integrated** with the `ArcLedger.sol` smart contract for:

- ✅ **On-chain invoice registration** - All invoices registered on blockchain
- ✅ **Automatic status updates** - Event-based real-time status updates
- ✅ **Contract-based payments** - Secure payment processing through the contract

**⚠️ Required**: You must deploy the contract and set `NEXT_PUBLIC_ARCLEDGER_CONTRACT_ADDRESS` in your `.env.local`.

See:

- [CONTRACT_DEPLOYMENT.md](./CONTRACT_DEPLOYMENT.md) - How to deploy the contract
- [CONTRACT_INTEGRATION.md](./CONTRACT_INTEGRATION.md) - How the integration works

## Support

For issues related to:

- **Arc Testnet**: Visit [docs.arc.network](https://docs.arc.network)
- **Supabase**: Visit [supabase.com/docs](https://supabase.com/docs)
- **WalletConnect**: Visit [docs.walletconnect.com](https://docs.walletconnect.com)
