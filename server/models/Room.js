const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  host: {
    type: String, // Socket ID of current host
    default: null
  },
  hostUserId: {
    type: String, // User ID (if authenticated) for persistence
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  movieSlug: {
    type: String,
    default: null
  },
  currentTime: {
    type: Number,
    default: 0
  },
  isPlaying: {
    type: Boolean,
    default: false
  },
  members: [{
    socketId: String,
    username: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  lastEmptyAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Check MongoDB TTL index logic (seconds) = 24h
  }
});

module.exports = mongoose.model('Room', RoomSchema);
