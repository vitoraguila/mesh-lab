// Same-origin WebSocket bridge: credentials arrive in the first frame, never the URL.
const http = require('node:http');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('node:fs');
const standalone = '.next/required-server-files.json';
if (fs.existsSync(standalone)) process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(JSON.parse(fs.readFileSync(standalone)).config);
const port = Number(process.env.PORT || 3000);
const app = next({ dev: process.env.NODE_ENV !== 'production', hostname: process.env.HOSTNAME || '127.0.0.1', port });
const sockets = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
app.prepare().then(() => {
 const server = http.createServer(app.getRequestHandler());
 server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/api/events') {
   // Development only: hand hot-reload upgrades back to Next. Production keeps
   // a single accepted upgrade path.
   if (process.env.NODE_ENV !== 'production') { app.getUpgradeHandler()(request, socket, head); return; }
   socket.destroy(); return;
  }
  let origin; try { origin = new URL(request.headers.origin).host; } catch { socket.destroy(); return; }
  if (origin !== request.headers.host || sockets.clients.size >= 50) { socket.destroy(); return; }
  sockets.handleUpgrade(request, socket, head, browser => {
   let upstream;
   const timer = setTimeout(() => browser.close(1008, 'Token required'), 5000);
   browser.once('message', raw => {
    clearTimeout(timer);
    let token;try { token=JSON.parse(raw.toString()).token; } catch { browser.close(1008,'Invalid message'); return; }
    if (typeof token !== 'string' || !token || token.length > 1024 || /[\r\n]/.test(token)) { browser.close(1008,'Token required'); return; }
    const url = new URL('/events',process.env.INTERNAL_API_URL);url.protocol='ws:';
    upstream = new WebSocket(url, { headers: { authorization: `Bearer ${token}` }, handshakeTimeout: 6000, maxPayload: 262144, perMessageDeflate: false });
    upstream.on('message', data => { if(browser.readyState===WebSocket.OPEN) { if(browser.bufferedAmount>262144) browser.close(1013,'Slow consumer'); else browser.send(data.toString()); } });
    upstream.on('error',()=>browser.close(1011,'Event stream unavailable or access denied'));
    upstream.on('close',()=>browser.close(1000,'Event stream ended'));
   });
   browser.on('close',()=>{clearTimeout(timer);upstream?.terminate()});
   browser.on('error',()=>upstream?.terminate());
  });
 });
 server.listen(port, process.env.HOSTNAME || '127.0.0.1');
 const shutdown = () => { for(const client of sockets.clients) client.terminate(); server.close(()=>process.exit(0)); setTimeout(()=>process.exit(0),5000).unref(); };
 process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
});
