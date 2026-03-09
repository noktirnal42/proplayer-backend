const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.APP_ORIGIN || 'proplayer://callback',
  credentials: true
}));
app.use(express.json());

// Environment variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

/**
 * POST /auth/spotify/token
 * Exchange authorization code for access token
 * Body: { code: string, state: string }
 * Returns: { access_token, refresh_token, expires_in, token_type }
 */
app.post('/auth/spotify/token', async (req, res) => {
  const { code, state } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }

  try {
    // Exchange code for tokens
    const response = await axios.post(SPOTIFY_TOKEN_URL, null, {
      params: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    res.json({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type
    });
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.status(401).json({
      error: 'Failed to exchange authorization code',
      details: error.response?.data?.error || error.message
    });
  }
});

/**
 * POST /auth/spotify/refresh
 * Refresh access token using refresh token
 * Body: { refresh_token: string }
 * Returns: { access_token, expires_in, token_type }
 */
app.post('/auth/spotify/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const response = await axios.post(SPOTIFY_TOKEN_URL, null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in,
      token_type: response.data.token_type
    });
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    res.status(401).json({
      error: 'Failed to refresh token',
      details: error.response?.data?.error || error.message
    });
  }
});

/**
 * GET /auth/spotify/config
 * Get Spotify OAuth configuration for the app
 * Returns: { client_id, redirect_uri, scopes }
 */
app.get('/auth/spotify/config', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming'
  ];

  res.json({
    client_id: SPOTIFY_CLIENT_ID,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scopes: scopes.join(' ')
  });
});

/**
 * GET /auth/spotify/authorize
 * Redirect to Spotify authorization endpoint
 * Query params: ?state=unique_state_string
 */
app.get('/auth/spotify/authorize', (req, res) => {
  const state = req.query.state || '';
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming'
  ].join('%20');

  const authorizeUrl =
    `https://accounts.spotify.com/authorize?` +
    `client_id=${encodeURIComponent(SPOTIFY_CLIENT_ID)}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&` +
    `scope=${scopes}&` +
    `state=${encodeURIComponent(state)}`;

  res.redirect(authorizeUrl);
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ProPlayer OAuth Backend listening on port ${PORT}`);
  console.log(`Spotify Redirect URI: ${SPOTIFY_REDIRECT_URI}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
