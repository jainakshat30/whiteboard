import { useSceneStore } from './scene'
import { Element } from '@/types/elements'

type Command = {
  undo: () => void
  redo: () => void
}

const undoStack: Command[] = []
const redoStack: Command[] = []

function replaceElementSnapshot(element: Element) {
  useSceneStore.setState((state) => ({
    elements: state.elements.map((current) => (current.id === element.id ? { ...element } : current)),
  }))
}

function upsertElementSnapshot(element: Element) {
  useSceneStore.setState((state) => ({
    elements: [...state.elements.filter((current) => current.id !== element.id), { ...element }],
  }))
}

export function pushCommand(command: Command) {
  undoStack.push(command)
  redoStack.length = 0
}

export function undo() {
  const command = undoStack.pop()
  if (!command) return
  command.undo()
  redoStack.push(command)
}

export function redo() {
  const command = redoStack.pop()
  if (!command) return
  command.redo()
  undoStack.push(command)
}

export function createCreateCommand(element: Element): Command {
  const snapshot = { ...element, points: element.points ? [...element.points] : undefined }

  return {
    undo: () => {
      useSceneStore.getState().removeElement(snapshot.id)
    },
    redo: () => {
      upsertElementSnapshot(snapshot)
    },
  }
}

export function createUpdateCommand(before: Element, after: Element): Command {
  const beforeSnapshot = { ...before, points: before.points ? [...before.points] : undefined }
  const afterSnapshot = { ...after, points: after.points ? [...after.points] : undefined }

  return {
    undo: () => {
      replaceElementSnapshot(beforeSnapshot)
    },
    redo: () => {
      replaceElementSnapshot(afterSnapshot)
    },
  }
}