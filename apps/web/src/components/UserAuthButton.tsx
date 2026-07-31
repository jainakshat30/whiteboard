"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { LogIn, LogOut, User } from "lucide-react";
import Image from "next/image";

export function UserAuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex h-10 w-24 animate-pulse items-center rounded-md bg-neutral-200 dark:bg-neutral-800" />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white p-1 pr-3 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || "User Avatar"}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
              <User size={16} />
            </div>
          )}
          <span className="max-w-[120px] truncate text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {session.user.name?.split(" ")[0] || "User"}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-500 transition hover:bg-neutral-100 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-red-400"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
    >
      <LogIn size={16} />
      <span>Sign In</span>
    </button>
  );
}
