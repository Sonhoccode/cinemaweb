const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('../server/config/db');

dotenv.config();

// Connect to database
// Note: In serverless, we need to ensure we don't open too many connections.
// Mongoose mostly handles this, but it's good practice to cache the connection if possible.
// For now, standard connectDB() should work fine for low traffic.
connectDB();

const app = express();

app.use(cors({
    origin: '*', // Allow all origins for now (or configure for your Vercel frontend domain)
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/history', require('../server/routes/history'));
app.use('/api/comments', require('../server/routes/comment'));
app.use('/api/ratings', require('../server/routes/rating'));

app.get('/', (req, res) => {
  res.send('API is running on Vercel...');
});

// Error Middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
