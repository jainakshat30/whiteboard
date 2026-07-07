import * as Y from 'yjs'
import { yElements } from './yjs'

export const undoManager = new Y.UndoManager(yElements, {
  captureTimeout: 500,
})

export function undo() {
  undoManager.undo()
}

export function redo() {
  undoManager.redo()
}