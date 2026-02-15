const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { connectDB } = require('./config/db');
const initSocket = require('./config/socket');

dotenv.config();



const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/history', require('./routes/history'));
app.use('/api/comments', require('./routes/comment'));
app.use('/api/ratings', require('./routes/rating'));

app.get('/', (req, res) => {
  res.send('API is running...');
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

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await connectDB();
    
    // Initialize Socket.io after DB is connected
    const io = initSocket(server);

    server.listen(PORT, '0.0.0.0', () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
  } catch (err) {
    console.error('Failed to connect to DB', err);
    process.exit(1);
  }
};

startServer();

