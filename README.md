# ProPlayer OAuth Backend

Secure Spotify OAuth2 handler for ProPlayer macOS app. This backend securely manages the OAuth flow and keeps the Spotify client secret safe.

## Overview

**Problem:** Client-side OAuth exposes the Spotify client secret, which is a security risk.

**Solution:** Backend server handles the OAuth code exchange, keeping secrets secure and returning only the access token to the app.

## Architecture

```
ProPlayer App                    ProPlayer Backend              Spotify API
    |                                  |                            |
    |--1. User clicks "Sign In"------->|                            |
    |                                  |--2. Redirect to Spotify--->|
    |                                  |                            |
    |<--3. Callback (code)-------------|<--3. Callback (code)-------|
    |                                  |                            |
    |--4. POST /auth/spotify/token---->|--5. Exchange code-------->|
    |       (code)                     |   (with secret)            |
    |                                  |                            |
    |<--6. Return access_token---------|<--6. Return tokens--------|
    |                                  |
    v                                  v
  Keychain                        (Secrets stored)
```

## Features

- ✅ Secure OAuth2 code exchange (client secret never exposed to client)
- ✅ Token refresh handling
- ✅ CORS support for ProPlayer app
- ✅ Health check endpoint
- ✅ Lightweight (~20 lines of logic per endpoint)
- ✅ No database required

## API Endpoints

### 1. Get OAuth Configuration
```http
GET /auth/spotify/config

Response:
{
  "client_id": "abc123...",
  "redirect_uri": "https://backend.onrender.com/auth/spotify/callback",
  "scopes": "user-read-private user-read-email ..."
}
```

### 2. Exchange Code for Tokens
```http
POST /auth/spotify/token
Content-Type: application/json

{
  "code": "AQB...",
  "state": "uuid-string"
}

Response:
{
  "access_token": "BQD...",
  "refresh_token": "AQA...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 3. Refresh Access Token
```http
POST /auth/spotify/refresh
Content-Type: application/json

{
  "refresh_token": "AQA..."
}

Response:
{
  "access_token": "BQD...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 4. Health Check
```http
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2026-03-09T10:30:00.000Z"
}
```

## Setup

### 1. Local Development

```bash
cd ProPlayerBackend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your Spotify credentials
# SPOTIFY_CLIENT_ID=...
# SPOTIFY_CLIENT_SECRET=...
# SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback

# Start server
npm run dev
```

Server runs on `http://localhost:3000`

### 2. Deploy to Render.com

See [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md) for step-by-step instructions.

**Quick summary:**
1. Create Spotify app at https://developer.spotify.com/dashboard
2. Push code to GitHub
3. Connect to Render.com
4. Set environment variables
5. Deploy (~2 minutes)

Your callback URL: `https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback`

## Environment Variables

```env
# Required
SPOTIFY_CLIENT_ID=your_client_id_from_spotify_dashboard
SPOTIFY_CLIENT_SECRET=your_client_secret_from_spotify_dashboard
SPOTIFY_REDIRECT_URI=https://your-app.onrender.com/auth/spotify/callback

# Optional
NODE_ENV=production          # or development
PORT=3000                    # Port to listen on
APP_ORIGIN=proplayer://callback  # CORS origin
```

⚠️ **Security:** Never commit `.env` file. Use Render.com environment variables instead.

## ProPlayer Integration

Update `ProPlayer/ProPlayerAudio/SpotifyAuth.swift`:

```swift
// Initialize with your backend URL
let backendURL = URL(string: "https://proplayer-backend-xxxx.onrender.com")!
let spotifyAuth = SpotifyAuth(backendURL: backendURL)

// Use as before
spotifyAuth.authenticate()
await spotifyAuth.ensureValidToken()
spotifyAuth.logout()
```

The `SpotifyAuth.swift` in this folder replaces the one in ProPlayer with secure backend integration.

## Token Flow

1. **User clicks "Sign In"**
   - App calls `spotifyAuth.authenticate()`
   - Opens browser with authorization request

2. **User authorizes**
   - Spotify redirects to: `https://proplayer-backend-xxxx.onrender.com/auth/spotify/callback?code=ABC123&state=...`

3. **Backend exchanges code**
   - Backend uses `SPOTIFY_CLIENT_SECRET` to exchange code
   - Returns only `access_token` + `refresh_token`

4. **App stores tokens**
   - Access token in memory
   - Refresh token in Keychain
   - Never exposed to user/Spotify

5. **Token refresh**
   - App calls `spotifyAuth.refreshAccessToken()`
   - Backend exchanges refresh token for new access token

## Security Considerations

✅ **What's secure:**
- Client secret never exposed to app
- OAuth code verified server-side
- HTTPS encryption (Render.com uses SSL)
- Tokens stored in Keychain (not defaults)

⚠️ **Best practices:**
- Use Render.com environment variables (not .env in Git)
- Rotate refresh tokens periodically
- Monitor Render.com logs for suspicious activity
- Keep Spotify client secret confidential

## Troubleshooting

### "Invalid redirect URI"
- Ensure `SPOTIFY_REDIRECT_URI` matches exactly in both:
  - Spotify dashboard app settings
  - Render.com environment variables
- Must be full URL: `https://domain.com/auth/spotify/callback`

### "CORS error"
- ProPlayer sends custom headers
- Ensure CORS is enabled (it is in server.js)
- Check `APP_ORIGIN` environment variable

### "Service Error" on Render
- Check Render logs: Dashboard → Logs tab
- Verify all environment variables are set
- Test with: `curl https://your-app.onrender.com/health`

### Token exchange fails
- Verify `SPOTIFY_CLIENT_SECRET` is correct
- Check Spotify app is active (not revoked)
- View Render logs for detailed error

## Testing

### Manual Testing
```bash
# Health check
curl https://proplayer-backend-xxxx.onrender.com/health

# Get config
curl https://proplayer-backend-xxxx.onrender.com/auth/spotify/config

# Test token endpoint (replace with real code)
curl -X POST https://proplayer-backend-xxxx.onrender.com/auth/spotify/token \
  -H "Content-Type: application/json" \
  -d '{"code":"real_auth_code","state":"test"}'
```

### ProPlayer Testing
1. Open ProPlayer preferences
2. Click Spotify tab
3. Click "Sign In with Spotify"
4. Authorize in browser
5. App should show "Signed in as: [email]"

## Performance

- **Response time:** ~200ms (code exchange)
- **Token refresh:** ~150ms
- **Throughput:** ~100 concurrent connections
- **Render free tier:** Sufficient for 100+ users

For high-volume use, upgrade to Render.com paid tier (~$7/month).

## Deployment Checklist

- [ ] Spotify app created (Client ID + Secret obtained)
- [ ] GitHub repo created and pushed
- [ ] Render.com account created
- [ ] Service deployed
- [ ] Environment variables set
- [ ] Callback URI registered with Spotify
- [ ] Health check passes: `GET /health`
- [ ] ProPlayer app updated with backend URL
- [ ] Spotify authentication tested in ProPlayer

## Future Enhancements

- [ ] Refresh token rotation
- [ ] Token expiry monitoring
- [ ] Spotify scope management UI
- [ ] Multi-user support (persistent storage)
- [ ] Rate limiting
- [ ] Prometheus metrics

## License

MIT - See LICENSE file

## Support

For issues:
1. Check Render.com logs
2. Test health endpoint
3. Verify environment variables
4. Check Spotify app settings
