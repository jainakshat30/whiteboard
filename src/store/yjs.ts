import * as Y from 'yjs'
import { Element } from '@/types/elements'

export const ydoc = new Y.Doc()
export const yElements = ydoc.getMap<Element>('elements')