import { getBoardConnection } from './yjs'

const colors = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
]

const localColor =
  colors[Math.floor(Math.random() * colors.length)]

// Track which boards have been initialized to prevent duplicate presence on refresh
const globalAny = globalThis as any
const pageSessionId = globalAny.__yjs_page_session
const lastPresenceSessionId = globalAny.__yjs_presence_session
const isPageRefresh = lastPresenceSessionId !== undefined && lastPresenceSessionId !== pageSessionId

// On page refresh, clear initialized boards so presence can be reinitialized
const initializedBoards: Set<string> = isPageRefresh ? new Set() : (globalAny.__yjs_initialized_boards || new Set())
globalAny.__yjs_initialized_boards = initializedBoards
globalAny.__yjs_presence_session = pageSessionId

export function getSavedUserName(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('user_display_name')
}

export function setSavedUserName(name: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem('user_display_name', name)
}

export function initializePresence(boardId: string, customName?: string) {
  const { provider } = getBoardConnection(boardId)
  if (!provider.awareness) return

  // If already initialized in this page session, skip
  if (initializedBoards.has(boardId)) {
    return
  }

  const savedName = getSavedUserName()
  const displayName = customName || savedName || `User-${Math.floor(Math.random() * 1000)}`

  if (customName) {
    setSavedUserName(customName)
  }

  provider.awareness.setLocalStateField("user", {
    name: displayName,
    color: localColor,
  })
  provider.awareness.setLocalStateField("isDrawing", false)
  initializedBoards.add(boardId)
}

export function updateCursor(
  boardId: string,
  x: number | null,
  y: number | null
) {
  const { provider } = getBoardConnection(boardId)
  if (!provider.awareness) return

  provider.awareness.setLocalStateField(
    "cursor",
    x === null ? null : { x, y }
  )
}

export function updateIsDrawing(boardId: string, isDrawing: boolean) {
  const { provider } = getBoardConnection(boardId)
  if (!provider.awareness) return

  provider.awareness.setLocalStateField("isDrawing", isDrawing)
}

export type RemoteState = {
  user?: { name: string; color: string }
  cursor?: { x: number; y: number } | null
  isDrawing?: boolean
}

export function getRemoteCursors(boardId: string): RemoteState[] {
  const { provider } = getBoardConnection(boardId)
  const awareness = provider.awareness
  if (!awareness) return []

  return Array.from(awareness.getStates().entries())
    .filter(([clientId]) => clientId !== awareness.clientID)
    .map(([, state]) => state as RemoteState)
    .filter((state) => state.user && state.cursor)
}

export type UserPresence = {
  clientId: number
  name: string
  color: string
  isDrawing: boolean
  isLocal: boolean
}

export function getOnlineUsers(boardId: string): UserPresence[] {
  const { provider } = getBoardConnection(boardId)
  const awareness = provider.awareness
  if (!awareness) return []

  const allUsers = Array.from(awareness.getStates().entries())
    .map(([clientId, state]) => {
      const s = state as RemoteState
      if (!s.user) return null
      return {
        clientId,
        name: s.user.name,
        color: s.user.color,
        isDrawing: Boolean(s.isDrawing),
        isLocal: clientId === awareness.clientID,
      }
    })
    .filter((u): u is UserPresence => u !== null)
  
  // Deduplicate users by name - prefer local connection, then most recent
  const usersByName = new Map<string, UserPresence>()
  for (const user of allUsers) {
    const existing = usersByName.get(user.name)
    if (!existing) {
      usersByName.set(user.name, user)
    } else {
      // Prefer local connection over remote
      if (user.isLocal && !existing.isLocal) {
        usersByName.set(user.name, user)
      }
      // If both are remote or both are local, keep the first one
      // (the server will eventually timeout the stale one)
    }
  }
  
  return Array.from(usersByName.values())
}