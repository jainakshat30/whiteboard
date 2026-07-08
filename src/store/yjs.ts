import * as Y from "yjs"
import { HocuspocusProvider } from "@hocuspocus/provider"
import { Element } from "@/types/elements"

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
    url: "ws://localhost:1234",
    name: boardId,
    document: ydoc,
  })

  const connection = {
    ydoc,
    yElements,
    provider,
  }

  connections.set(boardId, connection)

  return connection
}
