import * as Y from 'yjs'
import {getBoardConnection} from './yjs'

const undoManagers = new Map<string, Y.UndoManager>()

export function getUndoManager(boardId: string): Y.UndoManager {
  const existing = undoManagers.get(boardId)

  if (existing) {
    return existing
  }

  const { yElements } = getBoardConnection(boardId)
  const undoManager = new Y.UndoManager(yElements)

  undoManagers.set(boardId, undoManager)

  return undoManager
}

export function undo(boardId: string) {
  getUndoManager(boardId).undo()
}

export function redo(boardId: string) {
  getUndoManager(boardId).redo()
}