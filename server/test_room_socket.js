const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:5000'; // Adjust if needed

const client1 = io(SOCKET_URL, {
    reconnection: false,
    forceNew: true
});

const client2 = io(SOCKET_URL, {
    reconnection: false,
    forceNew: true
});

const roomId = 'test-room-' + Date.now();
const user1 = { username: 'HostUser', userId: 'user-123', videoUrl: 'http://test.com/video.m3u8' };
const user2 = { username: 'GuestUser', userId: null };

let step = 0;

function log(msg) {
    console.log(`[STEP ${step}] ${msg}`);
}

client1.on('connect', () => {
    log('Client 1 Connected ' + client1.id);
    
    // Step 1: Client 1 creates room
    step = 1;
    client1.emit('join-room', roomId, user1);
});

client1.on('room-joined', (data) => {
    if (step === 1) {
        log(`Client 1 Joined. isHost: ${data.isHost}. Url: ${data.videoUrl}`);
        if (data.isHost) {
            log('PASS: Client 1 is Host');
            // Step 2: Client 2 joins
            step = 2;
            client2.emit('join-room', roomId, user2);
        } else {
            log('FAIL: Client 1 is NOT Host');
            process.exit(1);
        }
    } else if (step === 4) {
        // Client 1 Re-joined
        log(`Client 1 Re-joined. isHost: ${data.isHost}`);
        if (data.isHost) {
            log('PASS: Client 1 Reclaimed Host');
            cleanup();
        } else {
            log('FAIL: Client 1 Did NOT Reclaim Host');
            // Check who is host?
            process.exit(1);
        }
    }
});

client2.on('connect', () => {
   // Wait for step 2
});

client2.on('room-joined', (data) => {
    log('Client 2 Joined. isHost: ' + data.isHost);
    if (!data.isHost) {
        log('PASS: Client 2 is Guest');
        
        // Wait for room size update
    }
});

client2.on('room-size', (size) => {
    log(`Client 2 received Room Size: ${size}`);
    if (step === 2 && size === 2) {
        log('PASS: Room Size is 2');
        
        // Step 3: Client 1 Disconnects
        step = 3;
        log('Disconnecting Client 1...');
        client1.disconnect();
        
        setTimeout(() => {
             // Step 4: Client 1 Re-connects
             step = 4;
             log('Re-connecting Client 1...');
             client1.connect();
             // Authenticate again
             client1.emit('join-room', roomId, user1);
        }, 1000);
    }
});

// Client 2 Host Promotion Check
client2.on('promoted-to-host', () => {
    log('Client 2 Promoted to Host (Expected when Host leaves)');
});

function cleanup() {
    log('TEST COMPLETE');
    client1.disconnect();
    client2.disconnect();
    process.exit(0);
}

// Timeout
setTimeout(() => {
    log('TIMEOUT');
    cleanup();
}, 10000);
