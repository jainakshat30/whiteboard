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

export async function saveSnapshot(boardId, snapshot) {
  await pool.query(
    `INSERT INTO boards (id, snapshot, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (id) DO UPDATE SET snapshot = $2, updated_at = now()`,
    [boardId, snapshot]
  )
}