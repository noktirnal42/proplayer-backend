# ProPlayer Backend - Quick Setup (15 minutes)

## 1️⃣ Create Spotify App (5 minutes)

1. Go to https://developer.spotify.com/dashboard
2. Login/sign up
3. Click "Create an App"
4. Name it "ProPlayer"
5. Accept terms
6. **Copy and save:**
   - **Client ID:** `abc123...`
   - **Client Secret:** `xyz789...` (keep this safe!)

## 2️⃣ Deploy Backend to Render.com (5 minutes)

### Option A: If you have GitHub account

1. Create new GitHub repo: `proplayer-backend`
2. Clone and push the backend code:
   ```bash
   cd /Users/jeremymcvay/MacDrop/ProPlayerBackend
   git init
   git add .
   git commit -m "Initial backend"
   git remote add origin https://github.com/YOUR_USERNAME/proplayer-backend
   git push -u origin main
   ```

3. Go to https://render.com
4. Sign up (free)
5. Click "New +" → "Web Service"
6. Connect GitHub → select `proplayer-backend`
7. Settings:
   - Name: `proplayer-backend`
   - Build: `npm install`
   - Start: `npm start`
8. Add Environment Variables:
   - `SPOTIFY_CLIENT_ID` = your Client ID
   - `SPOTIFY_CLIENT_SECRET` = your Client Secret
   - `NODE_ENV` = `production`
9. Click "Create Web Service"
10. Wait for deployment (2-3 minutes)

### Option B: If you don't have GitHub

Contact support - we can deploy differently.

## 3️⃣ Get Your Callback URL (1 minute)

Once deployed on Render.com, you'll see a URL like:
```
https://proplayer-backend-xxxx.onrender.com
```

Your **Callback URL** is:
```
https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback
```

## 4️⃣ Register Callback with Spotify (2 minutes)

1. Go back to https://developer.spotify.com/dashboard
2. Select your ProPlayer app
3. Click "Edit Settings"
4. Find "Redirect URIs"
5. Add:
   ```
   https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback
   ```
6. Save
7. Add another for local testing (optional):
   ```
   http://localhost:3000/auth/spotify/callback
   ```

## 5️⃣ Update Render Environment Variable (1 minute)

1. Go to Render dashboard
2. Select your service
3. Click "Environment" tab
4. Add new variable:
   - Name: `SPOTIFY_REDIRECT_URI`
   - Value: `https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback`
5. Save

Service will redeploy automatically.

## 6️⃣ Test Backend

```bash
# Test health
curl https://proplayer-backend-xxxx.onrender.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

✅ If you see the JSON response, backend is working!

## 7️⃣ Update ProPlayer App

Copy the new `SpotifyAuth.swift` from `ProPlayerBackend/` folder:

```bash
cp /Users/jeremymcvay/MacDrop/ProPlayerBackend/SpotifyAuth.swift \
   /Users/jeremymcvay/MacDrop/ProPlayer/ProPlayerAudio/
```

This version uses your backend instead of client-side OAuth.

Update the backend URL in SpotifyAuth.swift:
```swift
let backendURL = URL(string: "https://proplayer-backend-xxxx.onrender.com")!
```

## 8️⃣ Rebuild & Test

```bash
cd /Users/jeremymcvay/MacDrop/ProPlayer
xcodebuild -project ProPlayer.xcodeproj -scheme ProPlayer -configuration Release
```

Then test in ProPlayer:
1. Open ProPlayer preferences
2. Click "Spotify" tab
3. Click "Sign In with Spotify"
4. Authorize in browser
5. Should show "Signed in as: [your@email.com]"

---

## 🔑 Key Information

| What | Value | Where |
|------|-------|-------|
| **Client ID** | `abc123...` | Spotify dashboard |
| **Client Secret** | `xyz789...` | Spotify dashboard (keep safe!) |
| **Backend URL** | `https://proplayer-backend-xxxx.onrender.com` | Render dashboard |
| **Callback URL** | `https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback` | Spotify app settings |

---

## ❌ Common Issues

| Problem | Solution |
|---------|----------|
| "Redirect URI mismatch" | Ensure callback URL in Spotify app settings matches Render exactly |
| "Service Error" | Check Render logs (Dashboard → Logs tab) |
| Backend not responding | Wait 30 seconds after deploy, then refresh |
| ProPlayer won't sign in | Verify new `SpotifyAuth.swift` is in ProPlayer project |

---

## 📚 Full Documentation

- **Server details:** See `README.md`
- **Deployment help:** See `RENDER_DEPLOYMENT.md`
- **Architecture:** See `server.js` code comments
- **ProPlayer updates:** Use provided `SpotifyAuth.swift`

---

## ✅ Checklist

- [ ] Spotify app created (Client ID + Secret)
- [ ] Backend code pushed to GitHub
- [ ] Render.com service deployed
- [ ] Environment variables set
- [ ] Callback URL registered with Spotify
- [ ] Backend health check working
- [ ] New `SpotifyAuth.swift` copied to ProPlayer
- [ ] ProPlayer rebuilt
- [ ] Spotify sign-in tested

**Done!** Your ProPlayer now has secure OAuth. 🎉
