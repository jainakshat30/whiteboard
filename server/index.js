const http = require('http')
const { WebSocketServer, WebSocket } = require('ws')
const Y = require('yjs')
const encoding = require('lib0/encoding')
const decoding = require('lib0/decoding')
const syncProtocol = require('y-protocols/sync')
const awarenessProtocol = require('y-protocols/awareness')

const messageSync = 0
const messageAwareness = 1
const messageQueryAwareness = 3

const rooms = new Map()

function getAwarenessClientIDs(update) {
  const decoder = decoding.createDecoder(update)
  const clientIDs = []
  const len = decoding.readVarUint(decoder)

  for (let i = 0; i < len; i++) {
    clientIDs.push(decoding.readVarUint(decoder))
    decoding.readVarUint(decoder)
    decoding.readVarString(decoder)
  }

  return clientIDs
}

function getRoom(roomname) {
  let room = rooms.get(roomname)
  if (room) return room

  const doc = new Y.Doc()
  const clients = new Set()
  const awareness = new awarenessProtocol.Awareness(doc)

  room = { doc, clients, awareness }

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

  awareness.on('update', ({ added, updated, removed }, origin) => {
    const changedClients = added.concat(updated, removed)
    if (changedClients.length === 0) return

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, messageAwareness)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    )
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
  ws._awarenessClientIDs = new Set()

  const awarenessEncoder = encoding.createEncoder()
  encoding.writeVarUint(awarenessEncoder, messageAwareness)
  encoding.writeVarUint8Array(
    awarenessEncoder,
    awarenessProtocol.encodeAwarenessUpdate(
      room.awareness,
      Array.from(room.awareness.getStates().keys())
    )
  )
  ws.send(encoding.toUint8Array(awarenessEncoder))

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
    } else if (messageType === messageAwareness) {
      const update = decoding.readVarUint8Array(decoder)
      getAwarenessClientIDs(update).forEach((clientID) => ws._awarenessClientIDs.add(clientID))
      awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws)
    } else if (messageType === messageQueryAwareness) {
      encoding.writeVarUint(encoder, messageAwareness)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(room.awareness.getStates().keys())
        )
      )
      ws.send(encoding.toUint8Array(encoder))
    }
  })

  ws.on('close', () => {
    room.clients.delete(ws)
    if (ws._awarenessClientIDs && ws._awarenessClientIDs.size > 0) {
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        Array.from(ws._awarenessClientIDs),
        ws
      )
    }
  })
})

server.listen(port, () => {
  console.log(`y-websocket server listening on ws://localhost:${port}`)
})