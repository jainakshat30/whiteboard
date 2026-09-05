import { Pool } from 'pg'

const globalForPg = globalThis as unknown as { pool: Pool | undefined }

export const pool =
  globalForPg.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool

export type BoardRecord = {
  id: string
  title: string
  subject?: string | null
  created_at: Date
  updated_at: Date
  userId?: string | null
}

export async function getBoards(
  userId?: string | null
): Promise<BoardRecord[]> {
  // Ownerless boards (e.g. the benchmark test board) belong to nobody and are shown to nobody.
  if (!userId) return []

  const result = await pool.query(
    `SELECT id, title, subject, created_at, updated_at, "userId"
     FROM boards
     WHERE "userId" = $1
     ORDER BY updated_at DESC`,
    [userId]
  )

  return result.rows
}

export async function createBoard(
  id: string,
  title: string = 'Untitled Board',
  subject: string | null = null,
  userId: string | null = null
): Promise<BoardRecord> {
  const result = await pool.query(
    `INSERT INTO boards
       (id, title, subject, snapshot, created_at, updated_at, "userId")
     VALUES ($1, $2, $3, NULL, NOW(), NOW(), $4)
     RETURNING id, title, subject, created_at, updated_at, "userId"`,
    [id, title, subject, userId]
  )

  if (userId) {
    const { randomUUID } = await import('crypto')
    const uuid = randomUUID()

    await pool.query(
      `INSERT INTO board_participants
         (id, "boardId", "userId", role, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'HOST'::"BoardRole", NOW(), NOW())
       ON CONFLICT ("boardId", "userId")
       DO UPDATE SET role = 'HOST'::"BoardRole"`,
      [uuid, id, userId]
    )
  }

  return result.rows[0]
}

export async function deleteBoard(id: string): Promise<void> {
  await pool.query('DELETE FROM boards WHERE id = $1', [id])
}

export async function updateBoardTitle(
  id: string,
  title: string
): Promise<void> {
  await pool.query(
    'UPDATE boards SET title = $1, updated_at = NOW() WHERE id = $2',
    [title, id]
  )
}