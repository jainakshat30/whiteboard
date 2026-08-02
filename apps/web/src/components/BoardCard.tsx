import Link from "next/link";
import { BoardRecord } from "@/lib/db";
import { DeleteBoardButton } from "@/components/DeleteBoardButton";

interface BoardCardProps {
  board: BoardRecord;
}

export function BoardCard({ board }: BoardCardProps) {
  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xs transition hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate pr-2">
            {board.title || "Untitled Board"}
          </h2>
          <DeleteBoardButton boardId={board.id} />
        </div>
        {board.subject && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {board.subject}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          Updated {new Date(board.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
        <Link
          href={`/board/${board.id}`}
          className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
        >
          Open &rarr;
        </Link>
      </div>
    </div>
  );
}
