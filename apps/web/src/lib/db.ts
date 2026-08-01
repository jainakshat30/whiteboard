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
  created_at: Date
  updated_at: Date
  userId?: string | null
}

let isInitialized = false

export async function initDb() {
  if (isInitialized) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Board',
      snapshot BYTEA,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "userId" TEXT REFERENCES "User"(id) ON DELETE CASCADE
    );
  `)
  // Create board_participants just in case (though Prisma db push handles this)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS board_participants (
      id TEXT PRIMARY KEY,
      "boardId" TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'AUDIENCE',
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE("boardId", "userId")
    );
  `).catch(() => {})
  isInitialized = true
}

export async function getBoards(userId?: string | null): Promise<BoardRecord[]> {
  await initDb()
  if (userId) {
    const result = await pool.query<BoardRecord>(
      `
      SELECT id, title, created_at, updated_at, "userId"
      FROM boards
      WHERE "userId" = $1 OR "userId" IS NULL
      ORDER BY updated_at DESC
      `,
      [userId]
    )
    return result.rows
  } else {
    const result = await pool.query<BoardRecord>(`
      SELECT id, title, created_at, updated_at, "userId"
      FROM boards
      WHERE "userId" IS NULL
      ORDER BY updated_at DESC
    `)
    return result.rows
  }
}

export async function createBoard(id: string, title: string = 'Untitled Board', userId: string | null = null): Promise<BoardRecord> {
  await initDb()
  const result = await pool.query<BoardRecord>(
    `
    INSERT INTO boards (id, title, snapshot, created_at, updated_at, "userId")
    VALUES ($1, $2, NULL, NOW(), NOW(), $3)
    RETURNING id, title, created_at, updated_at, "userId"
    `,
    [id, title, userId]
  )
  
  if (userId) {
    const { randomUUID } = await import('crypto')
    const uuid = randomUUID()
    try {
      await pool.query(
        `
        INSERT INTO board_participants (id, "boardId", "userId", role, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'HOST'::"BoardRole", NOW(), NOW())
        ON CONFLICT ("boardId", "userId") DO UPDATE SET role = 'HOST'::"BoardRole"
        `,
        [uuid, id, userId]
      )
    } catch (e) {
      await pool.query(
        `
        INSERT INTO board_participants (id, "boardId", "userId", role, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'HOST', NOW(), NOW())
        ON CONFLICT ("boardId", "userId") DO UPDATE SET role = 'HOST'
        `,
        [uuid, id, userId]
      ).catch(() => {})
    }
  }

  return result.rows[0]
}

export async function deleteBoard(id: string): Promise<void> {
  await initDb()
  await pool.query('DELETE FROM boards WHERE id = $1', [id])
}

export async function updateBoardTitle(id: string, title: string): Promise<void> {
  await initDb()
  await pool.query(
    'UPDATE boards SET title = $1, updated_at = NOW() WHERE id = $2',
    [title, id]
  )
}
