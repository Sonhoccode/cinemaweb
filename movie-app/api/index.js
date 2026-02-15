const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

app.use(cors());

// Proxy configuration
const proxy = createProxyMiddleware({
  target: process.env.BACKEND_URL, // e.g., https://your-backend.fly.dev
  changeOrigin: true,
  ws: true, // Attempt to proxy WebSockets
  pathRewrite: {
    // Keep URL as is, assuming backend handles /api/...
  },
  onProxyReq: (proxyReq, req, res) => {
    // Optional: Add custom headers if needed
  },
});

// Use proxy for all routes handled by this function (invoked via rewrites to /api/*)
app.use('/', proxy);

module.exports = app;
