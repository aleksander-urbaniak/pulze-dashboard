"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

import ThemeToggle from "./ThemeToggle";
import type { User } from "../lib/types";

interface SidebarProps {
  user: User;
  onLogout?: () => void;
  settingsTabs?: {
    items: Array<{ value: string; label: string }>;
    active: string;
    onChange: (value: string) => void;
  };
}

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 12l8-8 8 8v7a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 19h16M7 16v-5M12 16V8M17 16v-3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    )
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M19.4 15.5a7.9 7.9 0 0 0 .1-3l2-1.6-2-3.4-2.4 1a8.4 8.4 0 0 0-2.6-1.5l-.4-2.6H9.9l-.4 2.6a8.4 8.4 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.6a7.9 7.9 0 0 0 .1 3l-2 1.6 2 3.4 2.4-1a8.4 8.4 0 0 0 2.6 1.5l.4 2.6h4.2l.4-2.6a8.4 8.4 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
];

export default function Sidebar({ user, onLogout, settingsTabs }: SidebarProps) {
  const pathname = usePathname();
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const isSettingsSection = pathname.startsWith("/settings");

  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-border bg-surface/90 px-5 py-6 shadow-card">
      <Link href="/" className="group flex items-center gap-3">
        <span className="brand-logo flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-base/80">
          <span className="brand-logo__image" />
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="brand-logo__fallback">
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
          <p className="text-lg font-semibold">Monitoring</p>
        </div>
      </Link>

      <nav className="mt-10 flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <div key={item.href} className="space-y-2">
              <Link
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold",
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-base/60 text-text"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
              {item.href === "/settings" && settingsTabs && isSettingsSection ? (
                <div className="ml-4 flex flex-col gap-2">
                  {settingsTabs.items.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => settingsTabs.onChange(tab.value)}
                      className={clsx(
                        "rounded-xl border px-4 py-2 text-xs uppercase tracking-[0.2em]",
                        settingsTabs.active === tab.value
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-base/60 text-muted"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        <div className="mt-4">
          <ThemeToggle />
        </div>
      </nav>

      <div className="mt-auto space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-base/60 p-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-surface/80">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={`${user.firstName} avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-semibold">{initials || "U"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </div>
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="w-full rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted"
          >
            Logout
          </button>
        ) : null}
      </div>
    </aside>
  );
}
