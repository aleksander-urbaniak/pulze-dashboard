"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell } from "@fortawesome/free-regular-svg-icons";

import type { User } from "../lib/types";

type UserGreetingPillProps = {
  user: User;
};

export default function UserGreetingPill({ user }: UserGreetingPillProps) {
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U";
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/90 px-3.5 py-2 shadow-card">
      <span className="text-muted">
        <FontAwesomeIcon icon={faBell} className="h-3.5 w-3.5" />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-text">
        Hello, {user.firstName}!
      </span>
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-[rgb(var(--base))]">
        {initials}
      </span>
    </div>
  );
}

