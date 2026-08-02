import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { Element } from "@/types/elements"
import { create } from "zustand"
import { toast } from "sonner"
import { useNotificationStore } from "./notifications"

export type ConnectionStatus = "connecting" | "connected" | "disconnected"

type ConnectionStateStore = {
  status: ConnectionStatus
  setStatus: (status: ConnectionStatus) => void
  userRole: string
  setUserRole: (role: string) => void
}

export const useConnectionStore = create<ConnectionStateStore>((set) => ({
  status: "connecting",
  setStatus: (status) => set({ status }),
  userRole: "AUDIENCE",
  setUserRole: (userRole) => {
    set({ userRole })
  },
}))

export type BoardConnection = {
  ydoc: Y.Doc
  yElements: Y.Map<Element>
  provider: HocuspocusProvider
}

const globalAny = globalThis as any
const connections: Map<string, BoardConnection> = globalAny.__yjs_connections || new Map()
const tokensMap: Map<string, string | null> = globalAny.__yjs_tokens || new Map()
// Track user roles across page refreshes to prevent false toast notifications
const userRolesMap: Map<string, string> = globalAny.__yjs_user_roles || new Map()
// Track page session to detect refreshes
const pageSessionId = Math.random().toString(36)
const lastPageSessionId = globalAny.__yjs_page_session
const isPageRefresh = lastPageSessionId !== undefined && lastPageSessionId !== pageSessionId

globalAny.__yjs_connections = connections
globalAny.__yjs_tokens = tokensMap
globalAny.__yjs_user_roles = userRolesMap
globalAny.__yjs_page_session = pageSessionId

// On page refresh, destroy old providers to force clean reconnection
if (isPageRefresh) {
  connections.forEach((conn, boardId) => {
    try {
      if (conn.provider) {
        if (conn.provider.awareness) {
          conn.provider.awareness.setLocalState(null)
        }
        conn.provider.destroy()
      }
      // Keep the Y.Doc but clear the provider reference
      conn.provider = null as any
    } catch (e) {
      console.error(`[YJS] Error cleaning up provider for ${boardId}:`, e)
    }
  })
}

function createHocuspocusProvider(boardId: string, ydoc: Y.Doc): HocuspocusProvider {
  const provider = new HocuspocusProvider({
    url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234",
    name: boardId,
    document: ydoc,
    token: () => tokensMap.get(boardId) || "",

    onStatus({ status }) {
      useConnectionStore.getState().setStatus(status as ConnectionStatus)
      if (status === 'connected') {
        setTimeout(() => {
          try {
            const token = tokensMap.get(boardId)
            provider.sendStateless(JSON.stringify({ type: 'get_role', token }))
          } catch (e) {
            console.error('Error sending get_role:', e)
          }
        }, 50)
      }
    },

    onStateless({ payload }) {
      try {
        const msg = JSON.parse(payload as string)

        if (msg.type === 'role_assigned') {
          const oldRole = useConnectionStore.getState().userRole
          const persistedRole = userRolesMap.get(boardId)
          useConnectionStore.getState().setUserRole(msg.role)
          userRolesMap.set(boardId, msg.role)

          if (msg.role === 'HOST') {
            provider.sendStateless(JSON.stringify({ type: 'get_pending_requests' }))
          } else if (msg.role === 'EDITOR') {
            useNotificationStore.getState().setAudienceState('approved')
            // Only show toast if this is a NEW approval (not a refresh/reconnect)
            if (persistedRole === 'AUDIENCE' || (!persistedRole && oldRole === 'AUDIENCE')) {
              toast.success('Request approved! You can now draw on the board.')
            }
          } else if (msg.role === 'AUDIENCE' && msg.denied) {
            useNotificationStore.getState().setAudienceState('denied')
            toast.error('Your drawing access request was denied by the host.')
          }
        } else if (msg.type === 'access_requested') {
          if (msg.request) {
            useNotificationStore.getState().addPendingRequest(msg.request)
            toast.info(`New drawing access request from ${msg.request.userName}`, {
              description: 'Click the notification bell to approve or deny.',
            })
          }
        } else if (msg.type === 'pending_requests_list') {
          if (Array.isArray(msg.requests)) {
            useNotificationStore.getState().setPendingRequests(msg.requests)
          }
        } else if (msg.type === 'request_handled') {
          if (msg.userId) {
            useNotificationStore.getState().removePendingRequest(msg.userId)
            if (msg.requests) {
              useNotificationStore.getState().setPendingRequests(msg.requests)
            }
            if (msg.action === 'approved') {
              toast.success(`Approved ${msg.userName || 'user'} for drawing access`)
            } else if (msg.action === 'denied') {
              toast.info(`Denied drawing access for ${msg.userName || 'user'}`)
            }
          }
        } else if (msg.type === 'request_pending_ack') {
          useNotificationStore.getState().setAudienceState('pending')
          toast.info('Access request sent to host', {
            description: 'Waiting for host approval...',
          })
        } else if (msg.type === 'request_failed') {
          useNotificationStore.getState().setAudienceState('idle')
          if (msg.reason === 'rate_limited') {
            toast.warning(msg.message || 'Request failed: Rate limited')
          } else if (msg.reason === 'already_pending') {
            toast.info('Request already pending')
          } else {
            toast.error(msg.message || 'Request failed')
          }
        }
      } catch (e) {
        console.error('Failed to parse stateless message', e)
      }
    },
  })

  return provider
}

export function getBoardConnection(
  boardId: string,
  token?: string | null
): BoardConnection {
  const existing = connections.get(boardId)
  const previousToken = tokensMap.get(boardId)

  if (token) {
    tokensMap.set(boardId, token)
  }

  if (existing) {
    // If provider was destroyed (e.g., on page refresh), recreate it
    if (!existing.provider || (existing.provider as any).isDestroyed) {
      const newProvider = createHocuspocusProvider(boardId, existing.ydoc)
      existing.provider = newProvider
    } else if (token && previousToken !== token) {
      try {
        // Clear local awareness state before destroying to prevent ghost connections
        if (existing.provider.awareness) {
          existing.provider.awareness.setLocalState(null)
        }
        existing.provider.destroy()
        
        // Clear the initialized flag so presence can be reinitialized on new provider
        const globalAny = globalThis as any
        const initializedBoards = globalAny.__yjs_initialized_boards as Set<string>
        if (initializedBoards) {
          initializedBoards.delete(boardId)
        }
      } catch (e) {
        console.error('[getBoardConnection] Error destroying provider:', e)
      }

      const newProvider = createHocuspocusProvider(boardId, existing.ydoc)
      existing.provider = newProvider
    }
    
    // Restore persisted role to prevent false toast on refresh
    const persistedRole = userRolesMap.get(boardId)
    if (persistedRole) {
      useConnectionStore.getState().setUserRole(persistedRole)
    }
    
    return existing
  }

  const ydoc = new Y.Doc()
  const yElements = ydoc.getMap<Element>("elements")
  const provider = createHocuspocusProvider(boardId, ydoc)

  const connection = {
    ydoc,
    yElements,
    provider,
  }

  connections.set(boardId, connection)
  return connection
}
