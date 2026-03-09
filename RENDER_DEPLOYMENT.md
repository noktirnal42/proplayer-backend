# ProPlayer Backend - Render.com Deployment Guide

## Quick Start (5 minutes)

### 1. Create Spotify App
1. Go to https://developer.spotify.com/dashboard
2. Login or create account
3. Click "Create an App"
4. Accept terms and create app
5. You'll see:
   - **Client ID** (copy this)
   - **Client Secret** (copy this)

### 2. Push Backend to GitHub (if not already)
```bash
cd /Users/jeremymcvay/MacDrop/ProPlayerBackend
git init
git add .
git commit -m "Initial ProPlayer backend"
git remote add origin https://github.com/YOUR_USERNAME/proplayer-backend.git
git push -u origin main
```

### 3. Deploy to Render.com
1. Go to https://render.com
2. Sign up (free account)
3. Click "New +" → "Web Service"
4. Connect your GitHub account
5. Select `proplayer-backend` repository
6. Configure:
   - **Name:** `proplayer-backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free tier (fine for development)

7. Add Environment Variables (click "Add Environment Variable"):
   ```
   SPOTIFY_CLIENT_ID=<your_client_id>
   SPOTIFY_CLIENT_SECRET=<your_client_secret>
   NODE_ENV=production
   ```
   (Don't add SPOTIFY_REDIRECT_URI yet)

8. Click "Create Web Service"
9. Wait for deployment (~2-3 minutes)
10. Once live, copy your URL: `https://proplayer-backend-xxxx.onrender.com`

### 4. Update Render Environment Variable
1. Go back to Render dashboard → your service
2. Click "Environment" tab
3. Add new environment variable:
   ```
   SPOTIFY_REDIRECT_URI=https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback
   ```
4. Save and service will redeploy

### 5. Register Redirect URI with Spotify
1. Go back to https://developer.spotify.com/dashboard
2. Select your app
3. Click "Edit Settings"
4. In "Redirect URIs" section, add:
   ```
   https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback
   ```
5. Save

### 6. Test the Backend
```bash
# Check health
curl https://proplayer-backend-xxxx.onrender.com/health

# Get Spotify config
curl https://proplayer-backend-xxxx.onrender.com/auth/spotify/config
```

---

## Your Callback URL

Once deployed, your **callback URL** is:
```
https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback
```

Replace `xxxx` with your actual Render service ID (shown in your URL).

---

## API Endpoints

### 1. Get OAuth Config
```
GET /auth/spotify/config
Returns: { client_id, redirect_uri, scopes }
```

### 2. Exchange Code for Tokens
```
POST /auth/spotify/token
Body: { code, state }
Returns: { access_token, refresh_token, expires_in }
```

### 3. Refresh Access Token
```
POST /auth/spotify/refresh
Body: { refresh_token }
Returns: { access_token, expires_in }
```

### 4. Health Check
```
GET /health
Returns: { status: "ok", timestamp }
```

---

## ProPlayer App Integration

Update `ProPlayer/ProPlayerAudio/SpotifyAuth.swift`:

Replace the hard-coded `SpotifyOAuthConfig.default` with:

```swift
let backendURL = URL(string: "https://proplayer-backend-xxxx.onrender.com")!

// Fetch config from backend
let configURL = backendURL.appendingPathComponent("auth/spotify/config")
let (data, _) = try await URLSession.shared.data(from: configURL)
let config = try JSONDecoder().decode(SpotifyOAuthConfig.self, from: data)
```

---

## Troubleshooting

### "Service Error" on Render
- Check logs: Render dashboard → "Logs" tab
- Verify environment variables are set
- Check GitHub repo is accessible

### Spotify "Redirect URI mismatch"
- Ensure URI in Render env variable matches Spotify app settings exactly
- Must include full path: `https://domain.com/auth/spotify/callback`

### CORS errors in ProPlayer
- Backend CORS is set to `proplayer://callback`
- If using different scheme, update `APP_ORIGIN` in `.env`

### Backend not responding
- Wait 30 seconds after deploy (Render spins up instance)
- Check `/health` endpoint
- View Render logs for errors

---

## Free Tier Limits

Render.com free tier includes:
- ✅ 750 free instance hours/month
- ✅ Auto-sleep after 15 min inactivity
- ✅ Wakes up on request (first request is slow)
- ⚠️ Service will pause if inactive

For production, upgrade to paid tier (~$7/month).

---

## Next Steps

1. ✅ Deploy backend to Render.com
2. ✅ Update ProPlayer to use backend
3. ✅ Test Spotify authentication
4. ⚠️ Keep `SPOTIFY_CLIENT_SECRET` secure (never commit to Git)
