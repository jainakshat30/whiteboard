'use server'

import { revalidatePath } from 'next/cache'
import { getBoards, createBoard, deleteBoard, updateBoardTitle, BoardRecord } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function fetchBoardsAction(): Promise<BoardRecord[]> {
  return await getBoards()
}

export async function createBoardAction(id: string, title?: string): Promise<BoardRecord> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id || null
  const board = await createBoard(id, title, userId)
  revalidatePath('/')
  return board
}

export async function deleteBoardAction(id: string): Promise<void> {
  await deleteBoard(id)
  revalidatePath('/')
}

export async function updateBoardTitleAction(id: string, title: string): Promise<void> {
  await updateBoardTitle(id, title)
  revalidatePath('/')
}
