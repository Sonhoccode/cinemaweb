const { Server } = require("socket.io");
const Room = require("../models/Room");

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  // Cleanup empty rooms periodically
  const cleanupRooms = async () => {
      try {
          // Delete rooms empty for > 1 minute
          const oneMinuteAgo = new Date(Date.now() - 60000);
          const result = await Room.deleteMany({ 
              members: { $size: 0 },
              lastEmptyAt: { $lt: oneMinuteAgo, $ne: null }
          });
          if (result.deletedCount > 0) {
              console.log(`Cleaned up ${result.deletedCount} empty rooms`);
          }
      } catch (e) {
          console.error('Cleanup error:', e);
      }
  };
  
  // Run cleanup every minute
  setInterval(cleanupRooms, 60000);
  cleanupRooms();

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join-room', async (roomId, user) => {
      await socket.join(roomId);
      console.log(`${user.username} joined room ${roomId}`);
      
      try {
          // 1. Try to update existing member ( Atomic )
          // This handles "Refresh Page" scenario perfectly
          let room = await Room.findOneAndUpdate(
              { roomId, "members.username": user.username },
              { 
                  $set: { 
                      "members.$.socketId": socket.id,
                      "members.$.joinedAt": new Date()
                  }
              },
              { new: true }
          );

          // 2. If not found (New User or New Room), Push or Create
          if (!room) {
              // Try to push to existing room
              room = await Room.findOneAndUpdate(
                  { roomId },
                  { 
                      $push: { members: { socketId: socket.id, username: user.username } },
                      $setOnInsert: { // Only set these if creating (upsert)
                           host: socket.id,
                           hostUserId: user.userId || null,
                           videoUrl: user.videoUrl || null,
                           movieSlug: user.movieSlug || null,
                           createdAt: new Date()
                      }
                  },
                  { new: true, upsert: true } // Create if not exists
              );
          }

          // 3. Post-Update Logic (Host Check & Consistency)
          // We fetched the updated room, now verify consistency
          if (room) {
              let changed = false;

              // Ensure host exists
              if (!room.host || !room.members.some(m => m.socketId === room.host)) {
                  // Prioritize: 1. HostUserId, 2. First Member
                  const hostUserMember = room.members.find(m => m.username === user.username && room.hostUserId === user.userId);
                  if (hostUserMember) {
                       room.host = hostUserMember.socketId;
                       changed = true;
                  } else if (room.members.length > 0) {
                       room.host = room.members[0].socketId;
                       changed = true;
                  }
              }
              
              // 4. Claim Host only if current host is missing
              if (user.userId && room.hostUserId === user.userId && room.host !== socket.id) {
                  const hostStillHere = room.members.some(m => m.socketId === room.host);
                  if (!hostStillHere) {
                      room.host = socket.id;
                      changed = true;
                  }
              }

              // Update URL/Slug if missing (Restore from User if Room lost it)
              if (!room.movieSlug && user.movieSlug) {
                  room.movieSlug = user.movieSlug;
                  changed = true;
              }
              
              if (!room.videoUrl && user.videoUrl) {
                  room.videoUrl = user.videoUrl;
                  changed = true;
              }

              if (changed) {
                  await room.save();
              }
              
              const debugMsg = `Server: Join Success. Members: ${room.members.length}. Host: ${room.host}`;
              console.log(debugMsg);
              socket.emit('server-log', debugMsg);

              // Emit Events
              const isHost = room.host === socket.id;
              socket.emit('room-joined', { 
                  isHost, 
                  videoUrl: room.videoUrl, 
                  movieSlug: room.movieSlug,
                  currentTime: room.currentTime || 0 // Send current time
              });
              
              socket.to(roomId).emit('user-joined', user);
              
              const memberList = room.members.map(m => ({
                  id: m.socketId,
                  username: m.username,
                  isHost: m.socketId === room.host
              }));
              io.to(roomId).emit('member-list', memberList);
              io.to(roomId).emit('room-size', room.members.length);

              // Ask host to pause for sync when a new user joins
              if (room.host && room.host !== socket.id) {
                  io.to(room.host).emit('sync-pause', { requesterId: socket.id });
              }
          }

      } catch (err) {
          console.error('Join room error:', err);
          socket.emit('server-log', `Server Error: ${err.message}`);
      }
    });

    socket.on('leave-room', async (roomId) => {
       await handleLeaveRoom(io, socket, roomId);
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      // Find rooms where this socket is a member
      const rooms = await Room.find({ "members.socketId": socket.id });
      for (const room of rooms) {
          await handleLeaveRoom(io, socket, room.roomId);
      }
    });

    socket.on('chat-message', (roomId, message) => {
      socket.to(roomId).emit('chat-message', message);
    });

    // Video Sync Logic
    socket.on('player-state', async (roomId, state) => {
      try {
          socket.to(roomId).emit('player-state', state);
          
          // Only update DB for significant events (URL change, Pause, etc.)
          // Allow 'timeupdate' but throttle it (e.g. only every 10s per room approx)
          // We don't have per-room state easily here without memory leak risk, 
          // so we rely on client sending every 2s, and we check if time % 10 < 2
          
          let shouldUpdateDB = false;
          if (state.type !== 'timeupdate') {
              shouldUpdateDB = true;
          } else {
             // Only save timeupdate if it's a multiple of ~10s (approx)
             // state.time is float.
             if (state.time > 0 && Math.floor(state.time) % 10 === 0) {
                 shouldUpdateDB = true;
             }
          }

          if (!shouldUpdateDB) return;

          // Update room video URL and slug if provided
          const updateData = {};
          
          if (state.url) {
              console.log(`Room ${roomId} Video URL Update: ${state.url}`);
              updateData.videoUrl = state.url;
              if (state.slug) updateData.movieSlug = state.slug;
          }

          if (state.type === 'play') {
              updateData.isPlaying = true;
          } else if (state.type === 'pause') {
              updateData.isPlaying = false;
          }
          
          // Persist current time (only on pause/seek/url OR throttled timeupdate)
          if (state.time > 0) {
              updateData.currentTime = state.time;
          }

          if (Object.keys(updateData).length > 0) {
               await Room.updateOne({ roomId }, updateData);
          }
      } catch (err) {
          console.error('Player state error:', err);
      }
    });
    
    // Request current state (for new joiners)
    socket.on('request-sync', async (roomId) => {
        const room = await Room.findOne({ roomId });
        if (room) {
            // Immediate fallback snapshot from DB
            if (room.videoUrl || room.currentTime) {
                io.to(socket.id).emit('player-state', {
                    type: room.isPlaying ? 'play' : 'pause',
                    time: room.currentTime || 0,
                    url: room.videoUrl || null,
                    slug: room.movieSlug || null
                });
            }
        }
        if (room && room.host) {
            // Priority: Ask Host
            const hostSocket = io.sockets.sockets.get(room.host);
            if (hostSocket && hostSocket.connected) {
                io.to(room.host).emit('get-current-state', socket.id);
                return;
            }
        }

        // Fallback: Ask any other client
        const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
        const otherClient = clients.find(id => id !== socket.id);
        if (otherClient) {
            io.to(otherClient).emit('get-current-state', socket.id);
        }
    });

    socket.on('sync-response', (requesterId, state) => {
        io.to(requesterId).emit('player-state', state);
    });

    // Host Controls
    socket.on('kick-member', async (roomId, targetSocketId) => {
        try {
            const room = await Room.findOne({ roomId });
            if (room && room.host === socket.id) {
                // Remove from DB
                await Room.updateOne({ roomId }, { $pull: { members: { socketId: targetSocketId } } });
                
                io.to(targetSocketId).emit('kicked-from-room');
                io.sockets.sockets.get(targetSocketId)?.leave(roomId); // Force leave socket room
                
                // Update lists
                const updatedRoom = await Room.findOne({ roomId });
                 if (updatedRoom) {
                     const memberList = updatedRoom.members.map(m => ({
                        id: m.socketId,
                        username: m.username,
                        isHost: m.socketId === updatedRoom.host
                     }));
                     io.to(roomId).emit('member-list', memberList);
                     io.to(roomId).emit('room-size', updatedRoom.members.length);
                 }
            }
        } catch (e) {
            console.error('Kick error:', e);
        }
    });

  });

  return io;
};

// Helper to handle leaving
async function handleLeaveRoom(io, socket, roomId) {
    try {
        const room = await Room.findOne({ roomId });
        if (!room) return;

        // Remove member
        await Room.updateOne({ roomId }, { $pull: { members: { socketId: socket.id } } });
        
        const updatedRoom = await Room.findOne({ roomId });
        
        socket.leave(roomId);
        
        // Find username from old room object
        const leavingMember = room.members.find(m => m.socketId === socket.id);
        if (leavingMember) {
            socket.to(roomId).emit('user-left', { username: leavingMember.username });
        }

        if (!updatedRoom || updatedRoom.members.length === 0) {
            // Empty room -> Mark for deletion (don't delete immediately to allow refresh)
            await Room.updateOne({ roomId }, { lastEmptyAt: new Date() });
            console.log(`Room ${roomId} is empty, marked for cleanup in 1 min`);
        } else {
             // Room not empty, clear lastEmptyAt
             await Room.updateOne({ roomId }, { lastEmptyAt: null });

             // If host left, assign new host
             if (room.host === socket.id) {
                 const newHost = updatedRoom.members[0]; // First remaining
                 updatedRoom.host = newHost.socketId;
                 await updatedRoom.save();
                 io.to(newHost.socketId).emit('promoted-to-host');
             }

             // Update member list
             const memberList = updatedRoom.members.map(m => ({
                  id: m.socketId,
                  username: m.username,
                  isHost: m.socketId === updatedRoom.host
             }));
             io.to(roomId).emit('member-list', memberList);
             io.to(roomId).emit('room-size', updatedRoom.members.length);
        }

    } catch (e) {
        console.error('Leave room error:', e);
    }
}

module.exports = initSocket;
