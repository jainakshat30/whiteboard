import { Server } from '@hocuspocus/server'
import * as Y from 'yjs'
import { getSnapshot, saveSnapshot } from './db/index.js'

const server = new Server({
  port: process.env.PORT || 1234,

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