"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

import type { User } from "../lib/types";
import ThemeToggle from "./ThemeToggle";

interface AppHeaderProps {
  title: string;
  user: User;
  onLogout: () => void;
}

export default function AppHeader({ title, user, onLogout }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!open) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  return (
    <header className="nav-static z-20 border-b border-border/70 bg-base/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="group inline-flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface/90 shadow-card">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path
                d="M4 16h6l3-6 6 12 3-6h6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted">PulZe</p>
            <h1 className="text-3xl font-semibold">{title}</h1>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]">
            Hello, {user.firstName}!
          </div>
          <ThemeToggle />
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em]"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              Menu
            </button>
            <div
              className={clsx(
                "absolute right-0 mt-2 w-44 origin-top-right rounded-2xl border border-border bg-surface/95 p-2 text-sm shadow-card backdrop-blur transition duration-200 ease-in-out",
                open
                  ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "invisible pointer-events-none -translate-y-1 scale-95 opacity-0"
              )}
              aria-hidden={!open}
            >
              <Link
                href="/"
                className="block rounded-xl px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-base/60"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="block rounded-xl px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-base/60"
                onClick={() => setOpen(false)}
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="mt-1 w-full rounded-xl px-3 py-2 text-left text-xs uppercase tracking-[0.2em] text-muted hover:bg-base/60"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
