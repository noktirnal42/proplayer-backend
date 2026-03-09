const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/auth/spotify/callback';

console.log('ProPlayer Spotify OAuth Backend');
console.log(`Client ID: ${SPOTIFY_CLIENT_ID ? SPOTIFY_CLIENT_ID.substring(0, 8) + '...' : 'NOT SET'}`);
console.log(`Redirect URI: ${SPOTIFY_REDIRECT_URI}`);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ProPlayer Spotify OAuth Backend',
    version: '1.0.0'
  });
});

// MARK: - OAuth Callback Endpoint
// Handles redirect from Spotify after user authorizes
app.get('/auth/spotify/callback', async (req, res) => {
  console.log('📍 OAuth callback received');
  const { code, error, state } = req.query;

  if (error) {
    console.error('Spotify error:', error);
    return res.redirect(`proplayer://spotify-callback?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error('No authorization code in callback');
    return res.redirect(`proplayer://spotify-callback?error=no_code`);
  }

  try {
    console.log('🔄 Exchanging code for token...');

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('✅ Token received, redirecting to app...');

    // Redirect back to app with token
    return res.redirect(`proplayer://spotify-callback?token=${encodeURIComponent(accessToken)}`);
  } catch (error) {
    console.error('❌ OAuth error:', error);
    return res.redirect(`proplayer://spotify-callback?error=${encodeURIComponent(error.message)}`);
  }
});

// MARK: - Token Exchange Endpoint
// Called directly by ProPlayer app to exchange code for token
app.post('/auth/spotify/token', async (req, res) => {
  console.log('📍 Token endpoint called');
  const { code } = req.body;

  if (!code) {
    console.error('Missing code in request');
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  try {
    console.log('🔄 Exchanging code for token...');

    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token exchange error:', error);
      return res.status(400).json(error);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Token exchanged successfully');
    return res.json(tokenData);
  } catch (error) {
    console.error('❌ Token exchange error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// MARK: - Test Endpoint
// For testing the backend is working
app.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'ProPlayer backend is running',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    has_client_id: !!SPOTIFY_CLIENT_ID,
    has_client_secret: !!SPOTIFY_CLIENT_SECRET,
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Callback: ${SPOTIFY_REDIRECT_URI}`);
  console.log(`🧪 Test: http://localhost:${PORT}/test`);
});
