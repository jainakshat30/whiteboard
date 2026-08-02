import { Server } from '@hocuspocus/server'
import * as Y from 'yjs'
import { getSnapshot, saveSnapshot, getUserIdFromToken, getUserRole } from './db/index.js'
import { handleStatelessMessage } from './handlers/statelessHandler.js'
import { accessRequestService } from './services/accessRequestService.js'

const server = new Server({
  port: process.env.PORT || 1234,

  async onAuthenticate(data) {
    try {
      const token = data.token
      const userId = await getUserIdFromToken(token)
      
      const role = await getUserRole(data.documentName, userId)
      
      data.readOnly = (role === 'AUDIENCE' || !role)
      data.context = { userId, role }
      
      if (data.connection) {
        data.connection.readOnly = data.readOnly
        data.connection.context = { userId, role }
      }
      
      console.log(`User ${userId || 'anonymous'} joined ${data.documentName} as ${role || 'AUDIENCE'}`)
      return { userId, role: role || 'AUDIENCE', readOnly: data.readOnly }
    } catch (err) {
      console.error("Error in onAuthenticate:", err)
      data.readOnly = true
      data.context = { userId: null, role: 'AUDIENCE' }
      return { userId: null, role: 'AUDIENCE', readOnly: true }
    }
  },
  
  async onStateless(data) {
    await handleStatelessMessage(data)
  },

  async onDisconnect({ connection, documentName, context, instance, document }) {
    const userId = context?.userId || connection?.context?.userId
    if (userId) {
      const affected = accessRequestService.handleUserDisconnect(userId)
      affected.forEach(({ boardId }) => {
        const doc = document || instance?.documents?.get(boardId)
        if (doc) {
          const updatedPending = accessRequestService.getPendingRequests(boardId)
          doc.connections.forEach((state, conn) => {
            if (conn.context?.role === 'HOST') {
              conn.sendStateless(JSON.stringify({
                type: 'pending_requests_list',
                requests: updatedPending,
              }))
            }
          })
        }
      })
    }
  },

  async onLoadDocument({ documentName }) {
    const snapshot = await getSnapshot(documentName)
    if (snapshot) {
      console.log(`Loaded board "${documentName}" from database`)
      return snapshot
    }
    console.log(`No saved state for board "${documentName}", starting fresh`)
  },

  async onStoreDocument({ documentName, document }) {
    const update = Y.encodeStateAsUpdate(document)
    await saveSnapshot(documentName, Buffer.from(update))
    console.log(`Saved board "${documentName}"`)
  },
})

server.listen()