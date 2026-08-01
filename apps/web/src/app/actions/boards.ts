'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { getBoards, createBoard, deleteBoard, updateBoardTitle, BoardRecord } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function fetchBoardsAction(): Promise<BoardRecord[]> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id || null
  return await getBoards(userId)
}

export async function createBoardAction(id: string, title?: string): Promise<BoardRecord> {
  const session = await getServerSession(authOptions)
  let userId = (session?.user as any)?.id || null

  if (!userId) {
    try {
      const cookieStore = await cookies()
      const req = { headers: { cookie: cookieStore.toString() } } as any
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      userId = token?.sub || (token as any)?.id || null
    } catch (e) {
      console.error('Error fetching JWT in createBoardAction:', e)
    }
  }

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

export async function getWsTokenAction(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  let userId = (session?.user as any)?.id || null

  if (!userId) {
    try {
      const cookieStore = await cookies()
      const req = { headers: { cookie: cookieStore.toString() } } as any
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      userId = token?.sub || (token as any)?.id || null
    } catch (e) {
      console.error('Error fetching JWT in getWsTokenAction:', e)
    }
  }

  if (!userId) return null

  const token = randomUUID()
  await prisma.verificationToken.create({
    data: {
      identifier: `ws_${userId}`,
      token,
      expires: new Date(Date.now() + 1000 * 60 * 5) // 5 minutes
    }
  })
  
  return token
}
