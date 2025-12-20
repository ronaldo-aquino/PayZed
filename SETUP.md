# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is ready, go to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql` and run it
4. This will create the `invoices` table with proper indexes and RLS policies

## Step 3: Get Your Supabase Credentials

1. In your Supabase project dashboard, go to Settings > API
2. Copy your Project URL (this is `NEXT_PUBLIC_SUPABASE_URL`)
3. Copy your `anon` public key (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Step 4: Get WalletConnect Project ID

1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Sign up or log in
3. Create a new project
4. Copy your Project ID (this is `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`)

## Step 5: Create Environment File

1. Copy `env.example` to `.env.local`:

   ```bash
   cp env.example .env.local
   ```

2. Open `.env.local` and fill in your values:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Your WalletConnect project ID
   - `NEXT_PUBLIC_PAYZED_CONTRACT_ADDRESS` - **Leave empty for now** (add after deployment)

3. Set up the environment file link for Next.js:

   ```bash
   npm run setup:env
   ```

   This creates a symlink so Next.js can read the `.env.local` file from the `frontend/` directory.

## Step 6: Get Testnet Tokens

1. Visit [faucet.circle.com](https://faucet.circle.com)
2. Select "Arc Testnet" as the network
3. Connect your wallet and request USDC or EURC test tokens

## Step 7: Add Arc Testnet to Your Wallet

### MetaMask:

1. Open MetaMask
2. Click the network dropdown (top left)
3. Click "Add Network" > "Add a network manually"
4. Enter:
   - Network Name: `Arc Testnet`
   - RPC URL: `https://rpc.testnet.arc.network`
   - Chain ID: `5042002`
   - Currency Symbol: `USDC`
   - Block Explorer: `https://testnet.arcscan.app`
5. Save and switch to Arc Testnet

## Step 8: Deploy Smart Contract (Optional but Recommended)

If you want on-chain invoice registration and automatic status updates:

1. **Deploy the contract**:

   ```bash
   npm run compile
   npm run deploy
   ```

2. **Copy the contract address** from the console output (or from `contract-address.json`)

3. **Add to `.env.local`**:

   ```bash
   NEXT_PUBLIC_ARCLEDGER_CONTRACT_ADDRESS=0x...your_contract_address
   ```

4. **Restart the dev server** (important!)

**Note**: You can run the app without the contract, but you'll only have basic direct transfer functionality.

## Step 9: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note**: If you see "Missing Supabase environment variables" warnings, make sure you ran `npm run setup:env` to create the symlink.

## Verification Checklist

- [ ] Dependencies installed
- [ ] Supabase project created and schema executed
- [ ] Environment variables configured
- [ ] WalletConnect project created
- [ ] Testnet tokens obtained
- [ ] Arc Testnet added to wallet
- [ ] Application runs without errors
- [ ] Can connect wallet
- [ ] Can create an invoice
- [ ] Can view payment page
- [ ] Can make a payment (if you have test tokens)

## Troubleshooting

### "Missing Supabase environment variables"

- Make sure `.env.local` exists and contains all required variables
- Restart the dev server after adding environment variables

### "Wallet connection fails"

- Ensure your wallet is connected to Arc Testnet
- Check that WalletConnect Project ID is correct

### "Transaction fails"

- Verify you have sufficient testnet tokens
- Check that you're on Arc Testnet network
- Ensure receiver address is valid

### "Invoice not found"

- Check that Supabase schema was executed correctly
- Verify RLS policies allow public read access
