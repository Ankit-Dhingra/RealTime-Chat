const { WebSocketServer } = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.id = Date.now();
    ws.username = '';

    ws.on('message', (message) => {
        let data
        try {
            data = JSON.parse(message)
        } catch (e) {
            return
        }

        if (data.type === 'join') {
            ws.username = data.username;
            wss.clients.forEach(client => {
                if (!client.readyState === 1) return  // ← readyState check missing tha
                if (client === ws) {
                    client.send(JSON.stringify({
                        type: 'notification',
                        message: `Welcome ${ws.username}!`,
                        onlineCount: wss.clients.size
                    }))
                } else {
                    client.send(JSON.stringify({
                        type: 'notification',
                        message: `${ws.username} joined`,
                        onlineCount: wss.clients.size
                    }))
                }
            })
        }  // ← yeh bracket missing tha tere code mein

        if (data.type === 'chat') {
            wss.clients.forEach((client) => {
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

        if (data.type === 'typing') {
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === 1) {
                    client.send(JSON.stringify({ type: 'typing', username: ws.username }));
                }
            })
        }

        if (data.type === 'stop_typing') {
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === 1) {
                    client.send(JSON.stringify({ type: 'stop_typing', username: ws.username }));
                }
            })
        }
    })

    ws.on('close', () => {
        console.log('Client disconnected');
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({
                    type: 'notification',
                    message: `${ws.username} has left the chat`,
                    onlineCount: wss.clients.size
                }));
            }
        })
    });
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});