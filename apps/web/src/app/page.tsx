import Link from "next/link";
import { getBoards, BoardRecord } from "@/lib/db";
import { CreateBoardButton } from "@/components/CreateBoardButton";
import { BoardCard } from "@/components/BoardCard";
import { UserAuthButton } from "@/components/UserAuthButton";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const revalidate = 0;

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || null;

  let boards: BoardRecord[] = [];
  try {
    boards = await getBoards(userId);
  } catch (error) {
    console.error("Failed to fetch boards from PostgreSQL:", error);
  }

  return (
    <main className="flex min-h-screen w-full flex-col p-8 text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Whiteboards
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <CreateBoardButton />
          <UserAuthButton />
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 p-16 text-center bg-white/50 dark:bg-neutral-900/50">
          <div className="rounded-full bg-indigo-50 dark:bg-indigo-950/50 p-4 mb-4 text-indigo-600 dark:text-indigo-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">No boards created yet</h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mb-6">
            Click "+ Create Board" to start a new collaborative canvas session.
          </p>
          <CreateBoardButton />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </main>
  );
}