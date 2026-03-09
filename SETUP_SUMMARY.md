# ProPlayer Secure OAuth Backend - Complete Setup Guide

## 📦 What's Included

You now have a complete secure OAuth backend with:

### Backend Files
- **`server.js`** — Express server with OAuth endpoints (175 lines)
- **`package.json`** — Dependencies (express, axios, cors, dotenv)
- **`.env.example`** — Environment variables template
- **`.gitignore`** — Git ignore rules

### Documentation
- **`QUICKSTART.md`** ⭐ — Start here (15 minutes to working backend)
- **`RENDER_DEPLOYMENT.md`** — Detailed Render.com deployment
- **`README.md`** — Complete API reference
- **`SETUP_SUMMARY.md`** — This file

### ProPlayer Integration
- **`SpotifyAuth.swift`** — Updated secure OAuth handler for ProPlayer
  - Replaces the client-side OAuth version
  - Uses your backend instead of exposing secrets
  - Same API, more secure

## 🚀 Quick Start (Follow QUICKSTART.md)

### 3 Steps:

1. **Create Spotify App**
   - https://developer.spotify.com/dashboard
   - Copy Client ID + Client Secret

2. **Deploy to Render.com**
   - Push code to GitHub
   - Create Render service
   - Set environment variables
   - Callback URL: `https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback`

3. **Update ProPlayer**
   - Copy new `SpotifyAuth.swift` to ProPlayer project
   - Update backend URL in the code
   - Rebuild and test

**Total time: ~15 minutes**

## 📋 File Overview

### server.js (OAuth Backend)

```
POST /auth/spotify/token       → Exchange code for tokens
POST /auth/spotify/refresh     → Refresh access token
GET  /auth/spotify/config      → Get OAuth config
GET  /auth/spotify/authorize   → Authorize URL (optional)
GET  /health                   → Health check
```

**Key features:**
- ✅ Secure code exchange (Client Secret stored server-side)
- ✅ Token refresh handling
- ✅ CORS support
- ✅ Error handling
- ✅ No database needed

### SpotifyAuth.swift (ProPlayer)

```swift
// Initialize with backend
let auth = SpotifyAuth(
    backendURL: URL(string: "https://your-backend.onrender.com")!
)

// Use as before
await auth.authenticate()
await auth.ensureValidToken()
await auth.refreshAccessToken()
auth.logout()
```

**Improvements:**
- ✅ Uses backend for secure OAuth
- ✅ Keeps Client Secret safe
- ✅ Same public API
- ✅ Keychain token storage

## 🔑 Security Architecture

### Before (Insecure - Client-side OAuth)
```
ProPlayer App
    |
    ├─ Client ID (visible)
    └─ Client Secret (⚠️ visible - SECURITY RISK!)
        └─ Spotify API
```

### After (Secure - Backend OAuth) ✅
```
ProPlayer App
    |
    └─ Backend Server
        ├─ Client ID (secure)
        ├─ Client Secret (⚠️ secure - NOT exposed)
        └─ Spotify API
```

The Client Secret never leaves the server.

## 📊 Environment Variables

**Required on Render.com:**
```
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
SPOTIFY_REDIRECT_URI=https://your-app.onrender.com/auth/spotify/callback
NODE_ENV=production
```

**Local development (.env):**
```
SPOTIFY_CLIENT_ID=your_id
SPOTIFY_CLIENT_SECRET=your_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback
NODE_ENV=development
PORT=3000
```

⚠️ **Never commit secrets to Git!**

## 🔄 OAuth Flow

```
1. User clicks "Sign In"
   → App calls SpotifyAuth.authenticate()

2. Browser opens Spotify login
   → User authorizes

3. Spotify redirects with code
   → https://your-backend.onrender.com/auth/spotify/callback?code=ABC

4. Backend exchanges code
   → Backend uses CLIENT_SECRET (safe!)
   → Returns access_token to app

5. App stores tokens
   → access_token in memory
   → refresh_token in Keychain

6. When token expires
   → App calls SpotifyAuth.refreshAccessToken()
   → Backend exchanges refresh token
   → New access_token returned
```

## 💾 Token Storage

**Access Token** (short-lived, ~1 hour)
- Stored in memory
- Used for API calls
- Automatically refreshed when expired

**Refresh Token** (long-lived, 6 months)
- Stored in macOS Keychain
- Survives app restart
- Never sent to server after initial exchange

## 🧪 Testing Checklist

### Backend Testing
```bash
# Health check
curl https://your-backend/health
# Expected: {"status":"ok","timestamp":"..."}

# Config endpoint
curl https://your-backend/auth/spotify/config
# Expected: {"client_id":"...","redirect_uri":"...","scopes":"..."}
```

### ProPlayer Testing
1. ✅ Open ProPlayer preferences
2. ✅ Click "Spotify" tab
3. ✅ Click "Sign In with Spotify"
4. ✅ Browser opens Spotify login
5. ✅ User authorizes
6. ✅ Browser redirects to backend
7. ✅ ProPlayer shows "Signed in as: [email]"
8. ✅ Can play Spotify tracks

## 📝 Implementation Checklist

### Initial Setup
- [ ] Create Spotify app (https://developer.spotify.com/dashboard)
- [ ] Copy Client ID and Client Secret
- [ ] Create GitHub repository
- [ ] Push backend code to GitHub

### Render.com Deployment
- [ ] Create Render.com account
- [ ] Create Web Service from GitHub
- [ ] Set environment variables
- [ ] Wait for deployment to complete
- [ ] Note your backend URL

### Spotify Configuration
- [ ] Add callback URI to Spotify app settings:
  ```
  https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback
  ```
- [ ] Save and verify

### ProPlayer Updates
- [ ] Copy new `SpotifyAuth.swift` to ProPlayer project
- [ ] Update backend URL in code
- [ ] Rebuild ProPlayer
- [ ] Test Spotify sign-in
- [ ] Verify token storage in Keychain

## 🐛 Troubleshooting

### Backend won't deploy
- Check Render logs (Dashboard → Logs tab)
- Verify all environment variables are set
- Ensure GitHub repo is public

### "Invalid redirect URI" error
- Check URI matches exactly in:
  1. Spotify app settings
  2. Render.com environment variable
  3. ProPlayer code
- Must include full path: `https://domain.com/auth/spotify/callback`

### ProPlayer can't sign in
- Verify backend health: `curl https://your-backend/health`
- Check ProPlayer is using correct backend URL
- View Render logs for errors

### Token refresh fails
- Verify refresh token in Keychain
- Check Spotify app is active
- Render logs show detailed error

## 📞 Support

1. **Check logs:** Render.com Dashboard → Logs tab
2. **Test endpoint:** `curl https://your-backend/health`
3. **Verify config:** `curl https://your-backend/auth/spotify/config`
4. **Read errors:** Both Render logs and ProPlayer console output

## 🎯 Next Steps

1. ✅ Follow QUICKSTART.md (15 minutes)
2. ✅ Deploy backend to Render.com
3. ✅ Update ProPlayer with new SpotifyAuth.swift
4. ✅ Test Spotify sign-in
5. ✅ Optional: Add refresh token rotation in v1.2

## 📚 Additional Resources

- **QUICKSTART.md** — Step-by-step setup
- **RENDER_DEPLOYMENT.md** — Detailed deployment
- **README.md** — API reference & architecture
- **server.js** — Code comments & implementation

## ✨ Benefits of This Approach

| Benefit | Details |
|---------|---------|
| **Security** | Client secret never exposed |
| **Simplicity** | No local secrets management |
| **Scalability** | Can add users without app update |
| **Maintenance** | Server-side token logic updates don't require app rebuild |
| **Compliance** | Follows OAuth 2.0 best practices |
| **Cost** | Free tier sufficient for 100+ users |

---

**You're all set!** Follow QUICKSTART.md to get started. 🚀
