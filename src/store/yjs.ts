import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { Element } from '@/types/elements'

export const ydoc = new Y.Doc()
export const yElements = ydoc.getMap<Element>('elements')

const roomName = 'demo-room'

export const provider = new WebsocketProvider(
	'ws://localhost:1234',
	roomName,
	ydoc
)

export const awareness = provider.awareness