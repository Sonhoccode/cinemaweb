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
          // Delete rooms empty for > 1 minute
          const oneMinuteAgo = new Date(Date.now() - 60000);
          
          // Prisma doesn't support array size filtering directly easily for JSON/Scalar lists without raw query or relation check
          // But our Room model in Prisma doesn't have 'members' relation yet, it was just a schema definition.
          // Wait, 'Room' in schema.prisma defined 'members' as comment?
          // Let's check schema.prisma again. 
          // Result from previous view_file:
          // model Room { ... // Members are transient ... }
          // So 'members' are NOT in DB. They are transient in socket memory usually, BUT the code relies on DB persistence for members?
          // The previous Mongoose code stored members in DB. 
          // If we want to persist members, we need a Relation or Json field.
          // For now, to match Mongoose logic without huge refactor, let's treat members as ephemeral in memory OR use a JSON field if we really need persistence.
          // HOWEVER, the previous logic explicitly did `Room.findOneAndUpdate` with members. 
          // To fix this fast: I will add `members` as a Json field to Room model in schema.prisma.
          
          // For this function, I will skip cleanup logic if we switch to memory, but to keep logic:
          // I will assume we add `members` Json field.
          
          // Actually, standard socket.io logic usually keeps members in memory adapter.
          // The existing code was hybrid. 
          // Let's stick to the prompt "Rewrite socket.js to use Prisma". 
          // I will use a local variable `rooms` for members or better, add `members` field to schema.
      } catch (e) {
          console.error('Cleanup error:', e);
      }
  };
  
  // Note: The original code heavily relied on MongoDB for member state.
  // With PostgreSQL/Prisma, updating a JSON column for every join/leave is possible but might be locking.
  // Given we just need it to work, I will update schema.prisma to include `members Json[]` or `members Json`.
  
  // ... functionality continues below ...
};

// WAIT. I need to update schema.prisma FIRST to support `members` if I want to persist it.
// The Mongoose model had: members: [{ socketId, username, joinedAt }]
// I will add `members Json @default("[]")` to Prisma Room model.

module.exports = (server) => {
    // Re-implementing with in-memory strategy for members to avoid DB locking issues with SQL,
    // OR just mapping to Prisma if we strictly follow "Migrate".
    // I'll choose to Map to Prisma with JSON type for speed of migration.
    
    // ... (Code will be generated in next step after verifying schema update)
    return initSocket(server);
}
