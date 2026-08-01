import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { Element } from "@/types/elements"
import { create } from "zustand"

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
    console.log('[LOG] updates to useConnectionStore.userRole:', userRole)
    set({ userRole })
  },
}))

export type BoardConnection = {
  ydoc: Y.Doc
  yElements: Y.Map<Element>
  provider: HocuspocusProvider
}

const connections = new Map<string, BoardConnection>()
const tokensMap = new Map<string, string | null>()

export function getBoardConnection(
  boardId: string,
  token?: string | null
): BoardConnection {
  const existing = connections.get(boardId)

  if (existing) {
    if (token && tokensMap.get(boardId) !== token) {
      tokensMap.set(boardId, token)
      try {
        existing.provider.destroy()
      } catch (e) {}
      connections.delete(boardId)
    } else {
      return existing
    }
  }

  if (token) {
    tokensMap.set(boardId, token)
  }

  const ydoc = new Y.Doc()
  const yElements = ydoc.getMap<Element>("elements")

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
          console.log('[LOG] role received on the frontend:', msg.role)
          useConnectionStore.getState().setUserRole(msg.role)
        } else if (msg.type === 'access_requested') {
          // Trigger a custom event for the UI to listen to
          window.dispatchEvent(new CustomEvent('hocuspocus:access_requested', { detail: msg }))
        }
      } catch (e) {
        console.error('Failed to parse stateless message', e)
      }
    }
  })

  const connection = {
    ydoc,
    yElements,
    provider,
  }

  connections.set(boardId, connection)

  return connection
}

