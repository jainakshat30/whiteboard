'use client'

import { useState } from 'react'
import { deleteBoardAction } from '@/app/actions/boards'

export function DeleteBoardButton({ boardId }: { boardId: string }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()
    if (!confirm('Are you sure you want to delete this board?')) return
    setDeleting(true)
    try {
      await deleteBoardAction(boardId)
    } catch (err) {
      console.error('Failed to delete board:', err)
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      title="Delete Board"
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50 p-1 rounded hover:bg-red-50 transition cursor-pointer"
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}
