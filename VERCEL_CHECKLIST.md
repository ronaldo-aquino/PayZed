# Vercel Deployment Checklist

## ✅ Critical Configuration Steps

### 1. Root Directory (MOST IMPORTANT)
**Location:** Settings → General → Root Directory

**Action:** Set to `frontend`

**Why:** Your Next.js app is in the `frontend/` folder, not the root.

---

### 2. Environment Variables
**Location:** Settings → Environment Variables

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

**Optional (but recommended):**
```
NEXT_PUBLIC_ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_TESTNET_CHAIN_ID=5042002
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x3600000000000000000000000000000000000000
NEXT_PUBLIC_EURC_CONTRACT_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
```

**If you deployed contracts:**
```
NEXT_PUBLIC_PAYZED_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PAYZED_FEES_CONTRACT_ADDRESS=0x...
```

**⚠️ Important:** After adding/updating environment variables, you MUST redeploy!

---

### 3. Build Settings
**Location:** Settings → General

**Verify:**
- **Build Command:** Should be `next build` (or leave empty - Vercel auto-detects)
- **Output Directory:** Leave empty (Vercel auto-detects `.next`)
- **Install Command:** `npm install` (default)

---

### 4. Domain Configuration
**Location:** Settings → Domains

**Steps:**
1. Add your domain: `www.payzed.xyz`
2. Add root domain: `payzed.xyz`
3. Follow Vercel's DNS instructions:
   - For `www`: Add CNAME record pointing to `cname.vercel-dns.com`
   - For root (`payzed.xyz`): Add A records pointing to Vercel IPs (shown in dashboard)

**DNS Propagation:** Can take up to 48 hours, but usually works within minutes.

---

### 5. Check Deployment Status
**Location:** Deployments tab

**What to check:**
- ✅ **Ready** = Deployment successful
- ⏳ **Building** = Still deploying (wait)
- ❌ **Error** = Check Build Logs for errors

**If build fails:**
1. Click on the failed deployment
2. Click "Build Logs"
3. Look for errors (common: missing env vars, build errors)

---

## 🔍 Troubleshooting Steps

### Problem: Domain shows "Connection Timed Out"

**Check:**
1. ✅ Is Root Directory set to `frontend`?
2. ✅ Are all environment variables configured?
3. ✅ Did the build succeed? (check Deployments tab)
4. ✅ Is DNS configured correctly? (check in domain provider)
5. ✅ Wait 5-10 minutes after DNS changes

**Test:**
- First test the Vercel URL: `https://your-project.vercel.app`
- If Vercel URL works but domain doesn't → DNS issue
- If Vercel URL doesn't work → Build/configuration issue

---

### Problem: Build Fails

**Common causes:**
1. Missing environment variables
2. Root Directory not set correctly
3. Build command incorrect
4. Code errors (check Build Logs)

**Solution:**
1. Check Build Logs in Deployments
2. Verify Root Directory is `frontend`
3. Verify all required env vars are set
4. Fix any code errors shown in logs

---

### Problem: "404 Not Found" or blank page

**Possible causes:**
1. Root Directory not set to `frontend`
2. Build output directory incorrect
3. Missing environment variables causing runtime errors

**Solution:**
1. Verify Root Directory = `frontend`
2. Check Runtime Logs in Deployments
3. Verify all env vars are set

---

## 📋 Quick Verification

Run these checks in order:

1. **Root Directory:** Settings → General → Root Directory = `frontend` ✅
2. **Environment Variables:** Settings → Environment Variables → All required vars present ✅
3. **Latest Deployment:** Deployments → Latest = ✅ Ready (not Error)
4. **Domain:** Settings → Domains → Domain added and DNS configured ✅
5. **Test Vercel URL:** `https://your-project.vercel.app` works ✅
6. **Test Custom Domain:** `https://www.payzed.xyz` works ✅

---

## 🚀 After Making Changes

**Important:** After changing any configuration:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger auto-deploy

**Environment Variables:** Changes require a redeploy to take effect!

---

## 📞 Still Having Issues?

1. Check Vercel dashboard for specific error messages
2. Review Build Logs and Runtime Logs
3. Test the Vercel-provided URL first (before custom domain)
4. Verify DNS with: `dig www.payzed.xyz` or `nslookup www.payzed.xyz`

