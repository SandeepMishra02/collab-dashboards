import http from 'http'
import { setupWSConnection } from 'y-websocket/bin/utils.js'
import ws from 'ws'
const server = http.createServer((_, res) => { res.writeHead(200); res.end('OK') })
const wss = new ws.Server({ server })
wss.on('connection', (conn, req) => setupWSConnection(conn, req, { gc: true }))
server.listen(1234, () => console.log('y-websocket running on :1234'))
