import { getBoardConnection } from './yjs'
import * as Y from 'yjs'

const colors = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#8b5cf6",
]

const localColor =
  colors[Math.floor(Math.random() * colors.length)]

const localName = `User-${Math.floor(Math.random() * 1000)}`

export function initializePresence(boardId: string) {
  const { provider } = getBoardConnection(boardId)

  if (!provider.awareness) return

  provider.awareness.setLocalStateField("user", {
    name: localName,
    color: localColor,
  })
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
    x === null
      ? null
      : {
          x,
          y,
        }
  )
}

export function getRemoteCursors(boardId: string) {
  const { provider } = getBoardConnection(boardId)

  const awareness = provider.awareness

  if (!awareness) {
    return []
  }

  return Array.from(awareness.getStates().entries())
    .filter(([clientId]) => clientId !== awareness.clientID)
    .map(([, state]) => state)
    .filter((state) => state.user && state.cursor)
}