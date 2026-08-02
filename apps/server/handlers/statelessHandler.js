import { parseAndValidateMessage } from '../validators/messageValidator.js'
import { accessRequestService } from '../services/accessRequestService.js'
import { getUserRole, updateUserRole, getUserIdFromToken } from '../db/index.js'

/**
 * Helper to safely broadcast stateless message to all Host connections on a document
 */
function broadcastToHosts(doc, payloadString) {
  if (!doc || !doc.connections) return

  doc.connections.forEach((state, conn) => {
    const role = conn.context?.role || (state.isReadOnly === false ? 'HOST' : null) || (conn.readOnly === false ? 'HOST' : null)
    if (role === 'HOST' || role === 'EDITOR' || state.isReadOnly === false || conn.readOnly === false) {
      if (typeof conn.sendStateless === 'function') {
        conn.sendStateless(payloadString)
      }
    }
  })
}

/**
 * Helper to safely send stateless message to a target user
 */
function sendToUser(doc, targetUserId, payloadString, updateReadOnlyTo = null) {
  if (!doc || !doc.connections) return

  doc.connections.forEach((state, conn) => {
    const connUserId = conn.context?.userId
    if (connUserId === targetUserId) {
      if (updateReadOnlyTo !== null) {
        conn.readOnly = updateReadOnlyTo
        state.isReadOnly = updateReadOnlyTo
        if (conn.context) conn.context.role = updateReadOnlyTo ? 'AUDIENCE' : 'EDITOR'
      }

      if (typeof conn.sendStateless === 'function') {
        conn.sendStateless(payloadString)
      }
    }
  })
}

/**
 * Handles incoming stateless WebSocket messages securely.
 */
export async function handleStatelessMessage({ instance, document, connection, documentName, payload, context }) {
  const { valid, error, data } = parseAndValidateMessage(payload)
  if (!valid) {
    if (connection) {
      connection.sendStateless(JSON.stringify({ type: 'error', message: error }))
    }
    return
  }

  const ctx = context || connection?.context || {}
  let userId = ctx.userId
  let role = ctx.role

  // Re-resolve user identity securely if missing from context
  if (!userId && data.token) {
    userId = await getUserIdFromToken(data.token)
  }
  if (userId && !role) {
    role = await getUserRole(documentName, userId)
  }

  const doc = document || instance?.documents?.get(documentName)

  switch (data.type) {
    case 'get_role': {
      if (!userId && data.token) {
        userId = await getUserIdFromToken(data.token)
      }
      if (userId) {
        role = await getUserRole(documentName, userId)
      }
      const userRole = role || 'AUDIENCE'
      
      if (connection) {
        if (!connection.context) connection.context = {}
        connection.context.userId = userId
        connection.context.role = userRole
        
        if (context) {
           context.userId = userId
           context.role = userRole
        }
        
        connection.sendStateless(JSON.stringify({ type: 'role_assigned', role: userRole }))
      }
      break
    }

    case 'get_pending_requests': {
      if (role !== 'HOST') {
        if (connection) {
          connection.sendStateless(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
        }
        return
      }

      const pending = accessRequestService.getPendingRequests(documentName)
      if (connection) {
        connection.sendStateless(JSON.stringify({
          type: 'pending_requests_list',
          requests: pending
        }))
      }
      break
    }

    case 'request_access': {
      if (!userId) {
        if (connection) {
          connection.sendStateless(JSON.stringify({
            type: 'request_failed',
            reason: 'unauthenticated',
            message: 'You must be logged in to request access',
          }))
        }
        return
      }

      if (role === 'HOST' || role === 'EDITOR') {
        if (connection) {
          connection.sendStateless(JSON.stringify({
            type: 'request_failed',
            reason: 'already_editor',
            message: 'You already have editing permissions',
          }))
        }
        return
      }

      const userName = data.userName || 'Someone'
      const result = accessRequestService.addRequest(documentName, userId, userName, (bId) => {
        const updatedPending = accessRequestService.getPendingRequests(bId)
        broadcastToHosts(doc, JSON.stringify({
          type: 'pending_requests_list',
          requests: updatedPending,
        }))
      })

      if (!result.success) {
        if (connection) {
          connection.sendStateless(JSON.stringify({
            type: 'request_failed',
            reason: result.reason,
            message: result.message,
          }))
        }
        return
      }

      // Acknowledge requester that request is pending
      if (connection) {
        connection.sendStateless(JSON.stringify({
          type: 'request_pending_ack',
          message: 'Request sent to host',
        }))
      }

      // Broadcast real-time access_requested payload to all connected HOSTs
      const broadcastPayload = JSON.stringify({
        type: 'access_requested',
        request: result.request,
        userId: result.request.userId,
        userName: result.request.userName,
      })
      broadcastToHosts(doc, broadcastPayload)
      break
    }

    case 'approve_access': {
      if (role !== 'HOST') {
        if (connection) {
          connection.sendStateless(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
        }
        return
      }

      const targetUserId = data.userId
      if (!targetUserId) return

      const approvedReq = accessRequestService.approveRequest(documentName, targetUserId)
      if (!approvedReq) return

      await updateUserRole(documentName, targetUserId, 'EDITOR')

      // Promote target user's active WebSocket connection and send notification
      sendToUser(doc, targetUserId, JSON.stringify({ type: 'role_assigned', role: 'EDITOR' }), false)

      // Broadcast updated pending list to all HOSTs
      const updatedPending = accessRequestService.getPendingRequests(documentName)
      broadcastToHosts(doc, JSON.stringify({
        type: 'request_handled',
        action: 'approved',
        userId: targetUserId,
        userName: approvedReq.userName,
        requests: updatedPending,
      }))
      break
    }

    case 'deny_access': {
      if (role !== 'HOST') {
        if (connection) {
          connection.sendStateless(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
        }
        return
      }

      const targetUserId = data.userId
      if (!targetUserId) return

      const deniedReq = accessRequestService.denyRequest(documentName, targetUserId)
      if (!deniedReq) return

      sendToUser(doc, targetUserId, JSON.stringify({
        type: 'role_assigned',
        role: 'AUDIENCE',
        denied: true,
      }), true)

      const updatedPending = accessRequestService.getPendingRequests(documentName)
      broadcastToHosts(doc, JSON.stringify({
        type: 'request_handled',
        action: 'denied',
        userId: targetUserId,
        userName: deniedReq.userName,
        requests: updatedPending,
      }))
      break
    }

    default:
      break
  }
}
