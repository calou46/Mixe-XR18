import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dgram from 'dgram';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// XR18 UDP OSC State
let xr18TargetIp = '192.168.1.100';
let xr18TargetPort = 10024;
let isUdpSocketActive = false;
let lastOscMessageSent = '';
let lastOscMessageTime = 0;
let oscLogHistory: Array<{ timestamp: number; direction: 'tx' | 'rx'; address: string; value?: any }> = [];

let udpSocket: dgram.Socket | null = null;

function initUdpSocket() {
  try {
    if (udpSocket) {
      try {
        udpSocket.close();
      } catch (e) {
        // ignore
      }
    }
    udpSocket = dgram.createSocket('udp4');
    
    udpSocket.on('error', (err) => {
      console.warn('UDP Socket warning:', err.message);
    });

    udpSocket.on('message', (msg, rinfo) => {
      // Decode OSC address if possible
      const oscStr = msg.toString('utf8', 0, Math.min(msg.length, 64));
      const nullIdx = oscStr.indexOf('\0');
      const address = nullIdx > 0 ? oscStr.slice(0, nullIdx) : oscStr;
      
      oscLogHistory.unshift({
        timestamp: Date.now(),
        direction: 'rx',
        address: address.startsWith('/') ? address : '/raw',
      });
      if (oscLogHistory.length > 50) oscLogHistory.pop();
    });

    udpSocket.bind(0, () => {
      isUdpSocketActive = true;
      console.log('XR18 UDP Client Socket bound successfully');
    });
  } catch (err) {
    console.warn('Could not bind UDP socket (falling back to simulator):', err);
    isUdpSocketActive = false;
  }
}

initUdpSocket();

// Encode simple OSC message buffer
function encodeOscMessage(address: string, floatVal?: number, intVal?: number, strVal?: string): Buffer {
  // OSC string padded to 4-byte boundary
  const pad4 = (str: string) => {
    let buf = Buffer.from(str + '\0');
    while (buf.length % 4 !== 0) {
      buf = Buffer.concat([buf, Buffer.from([0])]);
    }
    return buf;
  };

  const addrBuf = pad4(address);
  let typeTag = ',';
  const valBufs: Buffer[] = [];

  if (typeof floatVal === 'number') {
    typeTag += 'f';
    const b = Buffer.alloc(4);
    b.writeFloatBE(floatVal, 0);
    valBufs.push(b);
  } else if (typeof intVal === 'number') {
    typeTag += 'i';
    const b = Buffer.alloc(4);
    b.writeInt32BE(intVal, 0);
    valBufs.push(b);
  } else if (typeof strVal === 'string') {
    typeTag += 's';
    valBufs.push(pad4(strVal));
  }

  const typeBuf = pad4(typeTag);
  return Buffer.concat([addrBuf, typeBuf, ...valBufs]);
}

// API Routes
app.get('/api/osc/status', (req, res) => {
  res.json({
    connectedToIp: xr18TargetIp,
    port: xr18TargetPort,
    udpSocketActive: isUdpSocketActive,
    lastSent: lastOscMessageSent,
    lastSentTime: lastOscMessageTime,
    recentLogs: oscLogHistory.slice(0, 20),
  });
});

app.post('/api/osc/config', (req, res) => {
  const { ip, port } = req.body;
  if (ip) xr18TargetIp = String(ip).trim();
  if (port) xr18TargetPort = parseInt(port, 10) || 10024;
  res.json({ success: true, ip: xr18TargetIp, port: xr18TargetPort });
});

app.post('/api/osc/send', (req, res) => {
  const { address, floatVal, intVal, strVal } = req.body;
  if (!address) {
    return res.status(400).json({ error: 'Missing address' });
  }

  lastOscMessageSent = `${address} ${floatVal ?? intVal ?? strVal ?? ''}`;
  lastOscMessageTime = Date.now();

  oscLogHistory.unshift({
    timestamp: Date.now(),
    direction: 'tx',
    address,
    value: floatVal ?? intVal ?? strVal,
  });
  if (oscLogHistory.length > 50) oscLogHistory.pop();

  if (udpSocket && isUdpSocketActive) {
    try {
      const packet = encodeOscMessage(address, floatVal, intVal, strVal);
      udpSocket.send(packet, 0, packet.length, xr18TargetPort, xr18TargetIp, (err) => {
        if (err) {
          console.warn('UDP send error to', xr18TargetIp, err.message);
        }
      });
    } catch (e: any) {
      console.warn('OSC packing error:', e.message);
    }
  }

  res.json({ success: true, address, sent: true });
});

// Serve frontend with Vite in dev, static files in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server },
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`XR18 Controller server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
