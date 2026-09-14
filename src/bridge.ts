/**
 * bridge.ts — Real-time WebSocket Synchronization Bridge
 * Synchronizes Eva 4D Face state between Linux Terminal and Web Browsers.
 * Port: 8094
 */

import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = parseInt(process.env.BRIDGE_PORT || '8094', 10);

const server = createServer((req, res) => {
  // CORS & Health check
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'online',
      service: 'eva-face-bridge',
      clients: wss.clients.size,
      timestamp: Date.now(),
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server });

let lastState = {
  variant: 'phosphor',
  tier: 'auto',
  lastUpdated: Date.now(),
};

wss.on('connection', (ws: WebSocket, req) => {
  const clientIp = req.socket.remoteAddress || 'unknown';
  console.log(`[Bridge] Client connected (${clientIp}), active clients: ${wss.clients.size}`);

  // Send current state to newly joined client
  ws.send(JSON.stringify({
    type: 'sync',
    ...lastState,
  }));

  ws.on('message', (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString('utf8'));

      if (msg.type === 'variant' && msg.variant) {
        lastState.variant = msg.variant;
        lastState.lastUpdated = Date.now();
        console.log(`[Bridge] 🌀 Variant switched to: ${msg.variant}`);
      } else if (msg.type === 'tier' && msg.tier) {
        lastState.tier = msg.tier;
        lastState.lastUpdated = Date.now();
      }

      // Broadcast message to all other connected clients
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(msg));
        }
      }
    } catch (err) {
      console.warn('[Bridge] Invalid message payload:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[Bridge] Client disconnected, remaining: ${wss.clients.size}`);
  });

  ws.on('error', (err) => {
    console.warn('[Bridge] WebSocket error:', err.message);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[⚡ EVA 4D BRIDGE] WebSocket server running on ws://0.0.0.0:${PORT}`);
});
