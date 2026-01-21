# Vercel Deployment Guide

## Project Configuration

The project is configured to run on Vercel with Next.js in the `frontend/` folder.

## Deployment Steps

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will automatically detect Next.js

### 2. Configure Root Directory

**IMPORTANT**: Configure the Root Directory in Vercel:

1. Go to **Settings** → **General**
2. Under **Root Directory**, select: `frontend`
3. Save changes

**OR** use the `vercel.json` (already configured):
```json
{
  "rootDirectory": "frontend"
}
```

### 3. Configure Environment Variables

Go to **Settings** → **Environment Variables** and add:

#### Required:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

#### Optional (with default values):
```
NEXT_PUBLIC_ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID=5042002
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EURC_CONTRACT_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
```

#### If you deployed the contract:
```
NEXT_PUBLIC_PAYZED_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PAYZED_FEES_CONTRACT_ADDRESS=0x...
```

### 4. Configure Custom Domain

1. Go to **Settings** → **Domains**
2. Add your domain: `www.payzed.xyz` and `payzed.xyz`
3. Configure DNS records according to Vercel instructions:
   - **Type A**: Point to Vercel IPs
   - **Type CNAME**: Point `www` to `cname.vercel-dns.com`

### 5. Verify Build Settings

In **Settings** → **General**:
- **Build Command**: `npm run build` (or leave empty, Vercel detects automatically)
- **Output Directory**: `.next` (leave empty, Vercel detects automatically)
- **Install Command**: `npm install` (default)

### 6. Deploy

1. Push to `main` branch (automatic deployment)
2. Or go to **Deployments** → **Redeploy**

## Troubleshooting

### Error: "Connection Timed Out"

**Possible causes:**

1. **Domain not configured correctly**
   - Check DNS records at your domain provider
   - Wait up to 48h for DNS propagation
   - Use `dig www.payzed.xyz` or `nslookup www.payzed.xyz` to verify

2. **Build failing**
   - Check logs in **Deployments** → select deployment → **Build Logs**
   - Verify all environment variables are configured

3. **Missing environment variables**
   - Verify all `NEXT_PUBLIC_*` variables are configured
   - Restart deployment after adding variables

4. **Incorrect Root Directory**
   - Make sure Root Directory is set to `frontend`
   - Or verify that `vercel.json` is correct

### Check Deployment Status

1. Access Vercel dashboard
2. Go to **Deployments**
3. Check the status of the latest deployment:
   - ✅ **Ready**: Successful deployment
   - ⏳ **Building**: Under construction
   - ❌ **Error**: Build error (check logs)

### Check Logs

1. Go to **Deployments** → select deployment
2. Click **View Function Logs** or **Build Logs**
3. Look for errors related to:
   - Missing environment variables
   - Build errors
   - Runtime errors

## Deployment Checklist

- [ ] Repository connected to Vercel
- [ ] Root Directory configured as `frontend`
- [ ] All environment variables configured
- [ ] Domain added and DNS configured
- [ ] Successful build (check logs)
- [ ] Active and working deployment

## Useful Commands

### Check DNS
```bash
dig www.payzed.xyz
nslookup www.payzed.xyz
```

### Test Vercel URL
Vercel provides an automatic URL: `https://your-project.vercel.app`
Test this URL first before configuring the custom domain.

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Troubleshooting](https://vercel.com/docs/troubleshooting)
