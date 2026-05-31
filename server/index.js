// Sockets With Rooms

const { WebSocketServer } = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken')
const SECRET = 'mera_secret'

// index.js mein sabse upar, server.listen se pehle
const testToken = jwt.sign(
    { id: '123', username: 'Ankit' },
    SECRET
)
console.log('Token:', testToken)

const server = http.createServer();
const wss = new WebSocketServer({ server });
const rooms = new Map(); // roomName -> Set of clients

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.id = Date.now();
    ws.username = '';
    ws.roomId = '';

    ws.on('message', (message) => {
        let data
        try {
            data = JSON.parse(message)
        } catch (e) {
            return
        }
        if (!ws.isAuthenticated) {
            if (data.type === 'auth') {
                try {
                    console.log('Token received:', data.token)
                    const decoded = jwt.verify(data.token, SECRET);
                    console.log('Decoded JWT:', decoded);
                    ws.isAuthenticated = true;
                    ws.username = decoded.username;
                    ws.tokenExpiry = decoded.exp * 1000; // convert to milliseconds
                    ws.send(JSON.stringify({ type: 'auth_success', message: 'Authentication successful' }))
                } catch (error) {
                    console.log('JWT verification failed:', error.message);
                    ws.send(JSON.stringify({ type: 'auth_failed', message: 'Invalid token' }))
                    ws.close()
                }
            }
            // Unauthenticated user ka koi bhi message process nahi hona chahiye — chahe type kuch bhi ho.
            return
        }

        if (ws.isAuthenticated && Date.now() > ws.tokenExpiry) {
            ws.send(JSON.stringify({ type: 'token_expired' }))
            ws.close()
            return
        }


        if (data.type === 'join') {
            ws.username = data.username;
            ws.roomId = data.roomId;

            if (!rooms.has(data.roomId)) {
                rooms.set(data.roomId, new Set());
            }

            rooms.get(data.roomId).add(ws);

            rooms.get(data.roomId).forEach(client => {
                if (client.readyState !== 1) return  // ← readyState check missing tha
                if (client === ws) {
                    client.send(JSON.stringify({
                        type: 'notification',
                        message: `Welcome ${ws.username}!`,
                        onlineCount: rooms.get(data.roomId).size
                    }))
                } else {
                    client.send(JSON.stringify({
                        type: 'notification',
                        message: `${ws.username} joined`,
                        onlineCount: rooms.get(data.roomId).size
                    }))
                }
            })
        }

        if (data.type === 'chat') {
            const room = rooms.get(ws.roomId);
            if (room) {
                room.forEach((client) => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({
                            type: 'chat',
                            username: ws.username,
                            message: data.message
                            // onlineCount chat mein nahi chahiye
                        }));
                    }
                });
            }
        }

        if (data.type === 'typing') {
            const room = rooms.get(ws.roomId)
            if (room) {
                room.forEach(client => {
                    if (client !== ws && client.readyState === 1) {
                        client.send(JSON.stringify({ type: 'typing', username: ws.username }))
                    }
                })
            }
        }

        if (data.type === 'stop_typing') {
            const room = rooms.get(ws.roomId)
            if (room) {
                room.forEach(client => {
                    if (client !== ws && client.readyState === 1) {
                        client.send(JSON.stringify({ type: 'stop_typing', username: ws.username }))
                    }
                })
            }
        }
    })

    ws.on('close', () => {
        const room = rooms.get(ws.roomId)
        if (room) {
            room.delete(ws)
            if (room.size === 0) {
                rooms.delete(ws.roomId)  // empty room hatao
            } else {
                // ← yeh missing tha
                room.forEach(client => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({
                            type: 'notification',
                            message: `${ws.username} left`,
                            onlineCount: room.size
                        }))
                    }
                })
            }
        }
    })
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
