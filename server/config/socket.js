const { Server } = require("socket.io");
const { prisma } = require("../config/db");

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
          const oneMinuteAgo = new Date(Date.now() - 60000);
          
          // Prisma doesn't have direct array size query for JSON easily without raw query, so we might need raw query or fetch and filter.
          // For simplicity/performance on small scale, we can fetch all rooms with lastEmptyAt set.
          const roomsToCheck = await prisma.room.findMany({
              where: {
                  lastEmptyAt: {
                      lt: oneMinuteAgo,
                      not: null
                  }
              }
          });

          let deletedCount = 0;
          for (const room of roomsToCheck) {
              // Double check members count from JSON
              const members = room.members || [];
              if (members.length === 0) {
                  await prisma.room.delete({ where: { id: room.id } });
                  deletedCount++;
              }
          }

          if (deletedCount > 0) {
              console.log(`Cleaned up ${deletedCount} empty rooms`);
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
          // Transaction to handle concurrent joins safely (mostly)
          const room = await prisma.$transaction(async (tx) => {
              // 1. Find or Create Room
              let r = await tx.room.findUnique({ where: { roomId } });
              
              if (!r) {
                  r = await tx.room.create({
                      data: {
                          roomId,
                          host: socket.id,
                          hostUserId: user.userId || null,
                          videoUrl: user.videoUrl || null,
                          movieSlug: user.movieSlug || null,
                          members: [] // Initial empty members
                      }
                  });
              }

              // 2. Update Members List
              let members = r.members || [];
              if (!Array.isArray(members)) members = [];

              // Remove existing entry for this user (if any, e.g. refresh)
              const existingIndex = members.findIndex(m => m.username === user.username);
              if (existingIndex !== -1) {
                  members[existingIndex] = {
                      socketId: socket.id,
                      username: user.username,
                      joinedAt: new Date()
                  };
              } else {
                  members.push({
                      socketId: socket.id,
                      username: user.username,
                      joinedAt: new Date()
                  });
              }

              // 3. Update Room with new members
              // Also update Host logic if needed
              let host = r.host;
              
              // Ensure host exists in members
              if (!host || !members.some(m => m.socketId === host)) {
                   // Prioritize HostUserId match
                   const hostUserMember = members.find(m => m.username === user.username && r.hostUserId === user.userId);
                   if (hostUserMember) {
                       host = hostUserMember.socketId;
                   } else if (members.length > 0) {
                       host = members[0].socketId;
                   }
              }

              // Claim host if hostUserId matches
              if (user.userId && r.hostUserId === user.userId && host !== socket.id) {
                   const hostStillHere = members.some(m => m.socketId === host);
                   if (!hostStillHere) {
                       host = socket.id;
                   }
              }

              // Update URL/Slug if missing
              let videoUrl = r.videoUrl;
              let movieSlug = r.movieSlug;
              
              if (!movieSlug && user.movieSlug) movieSlug = user.movieSlug;
              if (!videoUrl && user.videoUrl) videoUrl = user.videoUrl;

              return await tx.room.update({
                  where: { roomId },
                  data: {
                      members,
                      host,
                      videoUrl,
                      movieSlug,
                      lastEmptyAt: null // Clear empty flag
                  }
              });
          });

          const debugMsg = `Server: Join Success. Members: ${room.members.length}. Host: ${room.host}`;
          console.log(debugMsg);
          socket.emit('server-log', debugMsg);

          // Emit Events
          const isHost = room.host === socket.id;
          socket.emit('room-joined', { 
              isHost, 
              videoUrl: room.videoUrl, 
              movieSlug: room.movieSlug,
              currentTime: room.currentTime || 0
          });
          
          socket.to(roomId).emit('user-joined', user);
          
          const memberList = (room.members || []).map(m => ({
              id: m.socketId,
              username: m.username,
              isHost: m.socketId === room.host
          }));
          io.to(roomId).emit('member-list', memberList);
          io.to(roomId).emit('room-size', (room.members || []).length);

          if (room.host && room.host !== socket.id) {
              io.to(room.host).emit('sync-pause', { requesterId: socket.id });
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
      // With JSON, we have to fetch all rooms and filter in code or simple raw query.
      // For simplicity/safety: fetch all active rooms (usually small number) or optimize later.
      // Better: fetch rooms where members string contains socket.id (hacky but works for JSON search if DB supports it)
      // Prisma: findMany where members path ... not fully supported for array search in all providers consistently.
      // Fallback: Fetch all rooms. (Inefficient for many rooms, but OK for now).
      
      const allRooms = await prisma.room.findMany();
      for (const room of allRooms) {
          const members = room.members || [];
          if (members.some(m => m.socketId === socket.id)) {
              await handleLeaveRoom(io, socket, room.roomId);
          }
      }
    });

    socket.on('chat-message', (roomId, message) => {
      socket.to(roomId).emit('chat-message', message);
    });

    // Video Sync Logic
    socket.on('player-state', async (roomId, state) => {
      try {
          socket.to(roomId).emit('player-state', state);
          
          let shouldUpdateDB = false;
          // Logic same as before: only update DB occasionally
          if (state.type !== 'timeupdate') {
              shouldUpdateDB = true;
          } else {
             if (state.time > 0 && Math.floor(state.time) % 10 === 0) {
                 shouldUpdateDB = true;
             }
          }

          if (!shouldUpdateDB) return;

          const updateData = {};
          if (state.url) {
              updateData.videoUrl = state.url;
              if (state.slug) updateData.movieSlug = state.slug;
          }
          if (state.type === 'play') updateData.isPlaying = true;
          else if (state.type === 'pause') updateData.isPlaying = false;
          
          if (state.time > 0) updateData.currentTime = state.time;

          if (Object.keys(updateData).length > 0) {
               await prisma.room.update({
                   where: { roomId },
                   data: updateData
               });
          }
      } catch (err) {
          console.error('Player state error:', err);
      }
    });
    
    // Request current state
    socket.on('request-sync', async (roomId) => {
        const room = await prisma.room.findUnique({ where: { roomId } });
        if (room) {
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
            const hostSocket = io.sockets.sockets.get(room.host);
            if (hostSocket && hostSocket.connected) {
                io.to(room.host).emit('get-current-state', socket.id);
                return;
            }
        }

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
            const room = await prisma.room.findUnique({ where: { roomId } });
            if (room && room.host === socket.id) {
                let members = room.members || [];
                const initialLength = members.length;
                members = members.filter(m => m.socketId !== targetSocketId);

                if (members.length !== initialLength) {
                    await prisma.room.update({
                        where: { roomId },
                        data: { members }
                    });
                    
                    io.to(targetSocketId).emit('kicked-from-room');
                    io.sockets.sockets.get(targetSocketId)?.leave(roomId);

                    const memberList = members.map(m => ({
                        id: m.socketId,
                        username: m.username,
                        isHost: m.socketId === room.host
                    }));
                    io.to(roomId).emit('member-list', memberList);
                    io.to(roomId).emit('room-size', members.length);
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
        // We need transaction to read-modify-write safely
        await prisma.$transaction(async (tx) => {
             const room = await tx.room.findUnique({ where: { roomId } });
             if (!room) return;

             let members = room.members || [];
             const leavingMember = members.find(m => m.socketId === socket.id);
             
             if (!leavingMember) {
                 // Member not found in DB list (maybe already removed), just ensure socket leaves
                 socket.leave(roomId);
                 return;
             }
             
             // Remove member
             members = members.filter(m => m.socketId !== socket.id);
             
             // Prepare update data
             const updateData = { members };
             
             socket.leave(roomId);
             socket.to(roomId).emit('user-left', { username: leavingMember.username });

             if (members.length === 0) {
                 updateData.lastEmptyAt = new Date();
                 console.log(`Room ${roomId} is empty, marked for cleanup`);
             } else {
                 updateData.lastEmptyAt = null;
                 // Host reassignment
                 if (room.host === socket.id) {
                     const newHost = members[0];
                     updateData.host = newHost.socketId;
                     // We can't emit inside transaction easily effectively if we want to ensure DB save first,
                     // but we can try.
                 }
             }

             const updatedRoom = await tx.room.update({
                 where: { roomId },
                 data: updateData
             });

             // Post-update emits
             if (updatedRoom.members.length > 0) {
                 if (room.host === socket.id) { // If host changed
                      io.to(updatedRoom.host).emit('promoted-to-host');
                 }
                 
                 const memberList = updatedRoom.members.map(m => ({
                      id: m.socketId,
                      username: m.username,
                      isHost: m.socketId === updatedRoom.host
                 }));
                 io.to(roomId).emit('member-list', memberList);
                 io.to(roomId).emit('room-size', updatedRoom.members.length);
             }
        });

    } catch (e) {
        console.error('Leave room error:', e);
    }
}

module.exports = initSocket;
