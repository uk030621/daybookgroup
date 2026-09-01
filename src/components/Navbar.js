"use client";

import { signOut } from "next-auth/react";
import { NotebookPen, LogOut, Users, ShieldAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar({ user }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-paper/85 dark:bg-dusk/85 border-b border-rule dark:border-dusk-rule">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-ink dark:bg-paper flex items-center justify-center shrink-0">
            <NotebookPen className="w-4 h-4 text-paper dark:text-ink" />
          </div>
          <span className="font-display italic text-lg sm:text-xl text-ink dark:text-paper truncate">
            Daybook
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <Link
            href="/family"
            title="Family"
            className="p-2 rounded-md text-ink-faint hover:text-ink dark:text-paper/60 dark:hover:text-paper hover:bg-ink/5 dark:hover:bg-paper/10 transition"
          >
            <Users className="w-4 h-4" />
          </Link>

          {user?.isPlatformAdmin && (
            <Link
              href="/admin"
              title="Platform admin"
              className="p-2 rounded-md text-ink-faint hover:text-amber-dark dark:text-paper/60 dark:hover:text-amber hover:bg-amber/10 transition"
            >
              <ShieldAlert className="w-4 h-4" />
            </Link>
          )}

          <div className="w-px h-6 bg-rule dark:bg-dusk-rule mx-1 hidden sm:block" />

          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name || "Profile photo"}
                width={30}
                height={30}
                className="rounded-full border border-rule dark:border-dusk-rule"
              />
            ) : (
              <div className="w-[30px] h-[30px] rounded-full bg-sage text-white flex items-center justify-center text-xs font-semibold">
                {user?.name?.[0] ?? "U"}
              </div>
            )}
            <span className="text-sm text-ink dark:text-paper hidden sm:block max-w-[9rem] truncate">
              {user?.name}
            </span>
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="p-2 rounded-md text-ink-faint hover:text-coral dark:text-paper/60 dark:hover:text-coral hover:bg-coral/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
