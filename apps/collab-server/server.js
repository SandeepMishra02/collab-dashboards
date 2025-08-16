
import http from 'http'
import { WebSocketServer } from 'ws'
import { createRequire } from 'module'

// pull CJS utils from y-websocket
const require = createRequire(import.meta.url)
const { setupWSConnection } = require('y-websocket/bin/utils.cjs')

const PORT = process.env.PORT || 1234

const server = http.createServer((_, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('OK')
})

const wss = new WebSocketServer({ server })
wss.on('connection', (conn, req) => setupWSConnection(conn, req, { gc: true }))

server.listen(PORT, () => {
  console.log(`y-websocket running on :${PORT}`)
})

