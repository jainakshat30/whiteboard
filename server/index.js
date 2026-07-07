const http = require('http')
const { WebSocketServer, WebSocket } = require('ws')
const Y = require('yjs')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')
const syncProtocol = require('y-protocols/sync')

const messageSync = 0

const rooms = new Map()

function getRoom(roomname) {
  let room = rooms.get(roomname)
  if (room) return room

  const doc = new Y.Doc()
  const clients = new Set()

  room = { doc, clients }

  doc.on('update', (update, origin) => {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageSync)
    syncProtocol.writeUpdate(encoder, update)
    const message = encoding.toUint8Array(encoder)

    for (const client of clients) {
      if (client !== origin && client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  })

  rooms.set(roomname, room)
  return room
}

const port = process.env.PORT || 1234

const server = http.createServer((req, res) => {
  res.writeHead(200)
  res.end('y-websocket server is running')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  const roomname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname.slice(1) || 'default'
  const room = getRoom(roomname)

  room.clients.add(ws)

  ws.on('message', (data) => {
    const decoder = decoding.createDecoder(new Uint8Array(data))
    const encoder = encoding.createEncoder()
    const messageType = decoding.readVarUint(decoder)

    if (messageType === messageSync) {
      encoding.writeVarUint(encoder, messageSync)
      syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws)
      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder))
      }
    }
  })

  ws.on('close', () => {
    room.clients.delete(ws)
  })
})

server.listen(port, () => {
  console.log(`y-websocket server listening on ws://localhost:${port}`)
})