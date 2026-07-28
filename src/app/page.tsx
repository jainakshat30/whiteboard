import Link from "next/link";
import { getBoards, BoardRecord } from "@/lib/db";
import { CreateBoardButton } from "@/components/CreateBoardButton";
import { DeleteBoardButton } from "@/components/DeleteBoardButton";

export const revalidate = 0;

export default async function HomePage() {
  let boards: BoardRecord[] = [];
  try {
    boards = await getBoards();
  } catch (error) {
    console.error("Failed to fetch boards from PostgreSQL:", error);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
            Whiteboards
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Real-time collaborative drawing boards synced with PostgreSQL
          </p>
        </div>
        <CreateBoardButton />
      </div>

      {boards.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 p-16 text-center">
          <div className="rounded-full bg-indigo-50 p-4 mb-4 text-indigo-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-neutral-900">No boards created yet</h3>
          <p className="mt-1 text-sm text-neutral-500 max-w-sm mb-6">
            Click "+ Create Board" to start a new collaborative canvas session.
          </p>
          <CreateBoardButton />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <div
              key={board.id}
              className="group relative flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6 shadow-xs transition hover:shadow-md hover:border-indigo-200"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-neutral-900 group-hover:text-indigo-600 transition truncate pr-2">
                    {board.title || "Untitled Board"}
                  </h2>
                  <DeleteBoardButton boardId={board.id} />
                </div>
                <p className="text-xs text-neutral-400 font-mono truncate">
                  ID: {board.id.substring(0, 8)}...
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-neutral-100 text-xs text-neutral-500">
                <span>
                  Updated {new Date(board.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <Link
                  href={`/board/${board.id}`}
                  className="font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Open &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}