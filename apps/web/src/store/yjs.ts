import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { Element } from "@/types/elements"
import { create } from "zustand"

export type ConnectionStatus = "connecting" | "connected" | "disconnected"

type ConnectionStateStore = {
  status: ConnectionStatus
  setStatus: (status: ConnectionStatus) => void
}

export const useConnectionStore = create<ConnectionStateStore>((set) => ({
  status: "connecting",
  setStatus: (status) => set({ status }),
}))

export type BoardConnection = {
  ydoc: Y.Doc
  yElements: Y.Map<Element>
  provider: HocuspocusProvider
}

const connections = new Map<string, BoardConnection>()

export function getBoardConnection(
  boardId: string
): BoardConnection {
  const existing = connections.get(boardId)

  if (existing) {
    return existing
  }

  const ydoc = new Y.Doc()
  const yElements = ydoc.getMap<Element>("elements")

  const provider = new HocuspocusProvider({
    url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234",
    name: boardId,
    document: ydoc,

    onStatus({ status }) {
      useConnectionStore.getState().setStatus(status as ConnectionStatus)
    },
  })

  const connection = {
    ydoc,
    yElements,
    provider,
  }

  connections.set(boardId, connection)

  return connection
}

