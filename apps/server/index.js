import { Server } from '@hocuspocus/server'
import * as Y from 'yjs'
import { getSnapshot, saveSnapshot, getUserIdFromToken, getUserRole, updateUserRole } from './db/index.js'

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
  
  async onStateless({ connection, documentName, payload, context }) {
    try {
      const msg = JSON.parse(payload)
      const ctx = context || connection?.context || {}
      let userId = ctx.userId
      let role = ctx.role
      
      if (!role && userId) {
        role = await getUserRole(documentName, userId)
      }
      
      if (msg.type === 'get_role') {
        if (!userId && msg.token) {
          userId = await getUserIdFromToken(msg.token)
        }
        if (userId) {
          role = await getUserRole(documentName, userId)
        }
        const userRole = role || 'AUDIENCE'
        if (connection) {
          connection.sendStateless(JSON.stringify({ type: 'role_assigned', role: userRole }))
        }
      } else if (msg.type === 'request_access') {
        const userName = msg.userName || 'Someone'
        // Broadcast to all HOSTs
        server.documents.get(documentName)?.connections.forEach(conn => {
          if (conn.context?.role === 'HOST') {
            conn.sendStateless(JSON.stringify({
              type: 'access_requested',
              userId: userId,
              userName: userName
            }))
          }
        })
      } else if (msg.type === 'approve_access' && role === 'HOST') {
        const targetUserId = msg.userId
        await updateUserRole(documentName, targetUserId, 'EDITOR')
        
        // Find the target user's connection and update it
        server.documents.get(documentName)?.connections.forEach(conn => {
          if (conn.context?.userId === targetUserId) {
            conn.readOnly = false
            conn.context.role = 'EDITOR'
            conn.sendStateless(JSON.stringify({ type: 'role_assigned', role: 'EDITOR' }))
          }
        })
      } else if (msg.type === 'deny_access' && role === 'HOST') {
        // Find the target user's connection and notify them
        server.documents.get(documentName)?.connections.forEach(conn => {
          if (conn.context?.userId === msg.userId) {
            conn.sendStateless(JSON.stringify({ type: 'role_assigned', role: 'AUDIENCE' }))
          }
        })
      } else if (msg.type === 'revoke_access' && role === 'HOST') {
        const targetUserId = msg.userId
        await updateUserRole(documentName, targetUserId, 'AUDIENCE')
        server.documents.get(documentName)?.connections.forEach(conn => {
          if (conn.context?.userId === targetUserId) {
            conn.readOnly = true
            conn.context.role = 'AUDIENCE'
            conn.sendStateless(JSON.stringify({ type: 'role_assigned', role: 'AUDIENCE' }))
          }
        })
      }
    } catch (e) {
      console.error('Failed to handle stateless message', e)
    }
  },

  async onLoadDocument({ documentName }) {
    const snapshot = await getSnapshot(documentName)
    if (snapshot) {
      console.log(`Loaded board "${documentName}" from database`)
      return snapshot // Hocuspocus accepts a raw Uint8Array update directly
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