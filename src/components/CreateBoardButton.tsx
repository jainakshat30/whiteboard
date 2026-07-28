"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBoardAction } from "@/app/actions/boards";

export function CreateBoardButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreateBoard() {
    if (loading) return;
    setLoading(true);
    try {
      const boardId = crypto.randomUUID();
      await createBoardAction(boardId, "Untitled Board");
      router.push(`/board/${boardId}`);
    } catch (err) {
      console.error("Failed to create board:", err);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreateBoard}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
    >
      {loading ? "Creating..." : "+ Create Board"}
    </button>
  );
}