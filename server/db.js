import 'dotenv/config'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function getSnapshot(boardId) {
  const result = await pool.query(
    'SELECT snapshot FROM boards WHERE id = $1',
    [boardId]
  )
  if (result.rows.length === 0) return null
  return result.rows[0].snapshot
}

export async function getBoards() {
  const result = await pool.query(`
    SELECT
      id,
      title,
      created_at,
      updated_at
    FROM boards
    ORDER BY updated_at DESC
  `)

  return result.rows
}

export async function saveSnapshot(boardId, snapshot) {
  await pool.query(
    `INSERT INTO boards (
        id,
        title,
        snapshot,
        created_at,
        updated_at
    )
    VALUES (
        $1,
        'Untitled Board',
        $2,
        now(),
        now()
    )
    ON CONFLICT (id)
    DO UPDATE SET
    snapshot = EXCLUDED.snapshot,
    updated_at = now();`,
    [boardId, snapshot]
  )
}