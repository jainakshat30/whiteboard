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

export async function getUserIdFromToken(token) {
  if (!token) return null
  const result = await pool.query(
    'SELECT identifier, expires FROM "VerificationToken" WHERE token = $1',
    [token]
  )
  if (result.rows.length === 0) return null
  
  const { identifier, expires } = result.rows[0]
  if (expires && new Date(expires).getTime() < Date.now() - 1000 * 60 * 60 * 24) {
    return null
  }
  
  if (identifier && identifier.startsWith('ws_')) {
    return identifier.replace('ws_', '')
  }
  return null
}

export async function getUserRole(boardId, userId) {
  if (!userId) {
    return 'AUDIENCE'
  }
  
  try {
    const result = await pool.query(
      'SELECT role FROM board_participants WHERE "boardId" = $1 AND "userId" = $2',
      [boardId, userId]
    )
    if (result.rows.length > 0) {
      return result.rows[0].role
    }
  } catch (e) {
    console.error("Error querying board_participants:", e)
  }

  try {
    const boardResult = await pool.query(
      'SELECT "userId" FROM boards WHERE id = $1',
      [boardId]
    )
    
    if (boardResult.rows.length > 0) {
      const creatorId = boardResult.rows[0].userId
      if (creatorId === userId || !creatorId) {
        await updateUserRole(boardId, userId, 'HOST')
        return 'HOST'
      }
    } else {
      await updateUserRole(boardId, userId, 'HOST')
      return 'HOST'
    }
  } catch (e) {
    console.error("Error checking board creator:", e)
    return 'HOST'
  }

  return 'AUDIENCE'
}

export async function updateUserRole(boardId, userId, role) {
  if (!userId) return
  const { randomUUID } = await import('crypto')
  const uuid = randomUUID()
  try {
    await pool.query(
      `
      INSERT INTO board_participants (id, "boardId", "userId", role, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4::"BoardRole", now(), now())
      ON CONFLICT ("boardId", "userId") DO UPDATE SET
      role = EXCLUDED.role,
      "updatedAt" = now()
      `,
      [uuid, boardId, userId, role]
    )
  } catch (e) {
    await pool.query(
      `
      INSERT INTO board_participants (id, "boardId", "userId", role, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, now(), now())
      ON CONFLICT ("boardId", "userId") DO UPDATE SET
      role = EXCLUDED.role,
      "updatedAt" = now()
      `,
      [uuid, boardId, userId, role]
    ).catch(err => console.error("Error updating user role:", err))
  }
}