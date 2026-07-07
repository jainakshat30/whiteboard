import { awareness } from './yjs'

const colors = ['#e11d48', '#2563eb', '#16a34a', '#d97706', '#7c3aed']
const localColor = colors[Math.floor(Math.random() * colors.length)]
const localName = `User-${Math.floor(Math.random() * 1000)}`

awareness.setLocalStateField('user', { name: localName, color: localColor })

export function updateCursor(x: number | null, y: number | null) {
  awareness.setLocalStateField('cursor', x === null ? null : { x, y })
}

export function getRemoteCursors() {
  return Array.from(awareness.getStates().entries())
    .filter(([clientId]) => clientId !== awareness.clientID)
    .map(([, state]) => state)
    .filter((state) => state.cursor && state.user)
}