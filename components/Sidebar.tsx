"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleLeft,
  faArrowRightFromBracket,
  faBarsStaggered,
  faBrush,
  faChartColumn,
  faClockRotateLeft,
  faDatabase,
  faGaugeHigh,
  faShieldHalved,
  faUserGear,
  faUsers
} from "@fortawesome/free-solid-svg-icons";

import { useAppSession } from "../lib/app-session";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  onLogout?: () => void;
  onOpenProfileEditor?: () => void;
  settingsTabs?: {
    items: Array<{ value: string; label: string }>;
    active: string;
    onChange: (value: string) => void;
  };
}

const navItems = [
  { href: "/", label: "Dashboard", icon: faGaugeHigh },
  { href: "/analytics", label: "Analytics", icon: faChartColumn }
];

const settingsIcons: Record<string, typeof faDatabase> = {
  data: faDatabase,
  users: faUsers,
  appearance: faBrush,
  audit: faClockRotateLeft,
  access: faShieldHalved
};

const staticSettingsItems = [
  { value: "data", label: "Data Sources" },
  { value: "users", label: "Users & Groups" },
  { value: "appearance", label: "Apperance" },
  { value: "audit", label: "Audit Trail" },
  { value: "access", label: "SSO & Access" }
];

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "v1.0.0";
const sidebarCollapseKey = "pulze.sidebar.collapsed";

export default function Sidebar({ onLogout, onOpenProfileEditor, settingsTabs }: SidebarProps) {
  const { user } = useAppSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    const saved = window.localStorage.getItem(sidebarCollapseKey);
    return saved === "true";
  });

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(sidebarCollapseKey, String(isCollapsed));
  }, [isCollapsed]);

  if (!user) {
    return null;
  }

  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  const configurationItems = staticSettingsItems.filter((item) => {
    if (item.value === "data" || item.value === "appearance") {
      return user.permissions?.includes("settings.read");
    }
    if (item.value === "audit") {
      return user.permissions?.includes("audit.read");
    }
    if (item.value === "access") {
      return user.permissions?.includes("settings.write");
    }
    return true;
  });

  return (
    <aside
      className={clsx(
        "nav-static sticky top-0 z-30 flex w-full flex-col border-b border-[rgb(var(--app-divider)/0.9)] bg-[rgb(var(--app-sidebar-bg))] px-4 py-4 transition-[width,padding] duration-200 md:h-screen md:border-b-0 md:border-r md:py-5 md:overflow-y-auto",
        isCollapsed ? "md:w-[84px] md:px-2.5" : "md:w-64 md:px-4"
      )}
    >
      <div
        className={clsx(
          "flex items-center justify-between gap-3",
          isCollapsed && "md:flex-col md:justify-start md:gap-3"
        )}
      >
        <Link href="/" className={clsx("group flex items-center gap-3 px-1", isCollapsed && "md:px-0")}>
          <span className="brand-logo radius-ui flex h-9 w-9 items-center justify-center border border-accent/45 bg-accent text-[#031313] shadow-[0_0_20px_rgb(var(--accent)/0.32)]">
            <span className="brand-logo__image" />
            <svg
              width="18"
              height="18"
              viewBox="0 0 32 32"
              fill="none"
              className="brand-logo__fallback text-[#031313]"
            >
              <path
                d="M4 16h6l3-6 6 12 3-6h6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          {!isCollapsed ? (
            <div className="leading-tight">
              <p className="text-[1.08rem] font-semibold uppercase tracking-[0.08em] text-text">
                PULZE <span className="font-normal text-text/60">DASHBOARD</span>
              </p>
              <p className="pt-1 text-[10px] uppercase tracking-[0.2em] text-muted">
                Version {appVersion}
              </p>
            </div>
          ) : null}
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={clsx(
              "radius-ui hidden border border-border bg-base/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted md:inline-flex",
              isCollapsed && "md:h-9 md:w-9 md:items-center md:justify-center md:px-0"
            )}
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FontAwesomeIcon
              icon={faAngleLeft}
              className={clsx("h-3.5 w-3.5 transition-transform", isCollapsed && "rotate-180")}
            />
          </button>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="radius-ui border border-border bg-base/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="sidebar-menu"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <FontAwesomeIcon icon={faBarsStaggered} className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div
        id="sidebar-menu"
        className={clsx(
          "mt-6 flex flex-1 flex-col",
          isMobileMenuOpen ? "flex" : "hidden",
          "md:flex",
          isCollapsed && "md:mt-5"
        )}
      >
        <nav className={clsx("flex flex-1 flex-col gap-2", isCollapsed && "md:items-center md:gap-1.5")}>
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={clsx(
                  "nav-link radius-ui flex items-center border px-3 py-2.5 text-[1.02rem] font-medium",
                  isCollapsed ? "justify-center md:h-11 md:w-11 md:px-0" : "gap-3",
                  active
                    ? "border-transparent bg-accent/12 text-accent"
                    : "border-transparent text-muted hover:bg-white/5 hover:text-text"
                )}
              >
                <FontAwesomeIcon icon={item.icon} className="h-4 w-4 shrink-0" />
                {!isCollapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}

          {configurationItems.length > 0 ? (
            <div className="space-y-2 pt-5">
              {!isCollapsed ? (
                <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted/80">
                  Configuration
                </p>
              ) : null}
              {configurationItems.map((tab) => {
                const tabIsActive =
                  pathname === "/settings" &&
                  ((settingsTabs?.active ?? searchParams.get("tab") ?? "data") === tab.value);
                return (
                  <Link
                    key={tab.value}
                    href={`/settings?tab=${tab.value}`}
                    onClick={() => {
                      settingsTabs?.onChange(tab.value);
                      setIsMobileMenuOpen(false);
                    }}
                    title={isCollapsed ? tab.label : undefined}
                    className={clsx(
                      "nav-link radius-ui flex w-full items-center border px-3 py-2 text-left text-[0.98rem] font-medium",
                      isCollapsed ? "justify-center md:h-11 md:w-11 md:px-0" : "gap-3",
                      tabIsActive
                        ? "border-accent/25 bg-accent/12 text-accent"
                        : "border-transparent text-muted hover:bg-white/5 hover:text-text"
                    )}
                  >
                    <FontAwesomeIcon
                      icon={settingsIcons[tab.value] ?? faUserGear}
                      className="h-4 w-4 shrink-0"
                    />
                    {!isCollapsed ? <span>{tab.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </nav>

        <div
          className={clsx(
            "mt-auto space-y-3 border-t border-border px-1 pb-1 pt-4",
            isCollapsed && "md:space-y-2 md:px-0"
          )}
        >
          <div
            className="relative"
          >
            <button
              type="button"
              title={`${user.firstName} ${user.lastName} - ${user.email}`}
              onClick={onOpenProfileEditor}
              className={clsx(
                "w-full rounded-xl text-left transition hover:bg-white/5",
                isCollapsed ? "flex items-center justify-center p-0" : "px-1 py-0.5"
              )}
            >
              <div
                className={clsx(
                  isCollapsed
                    ? "flex items-center justify-center"
                    : "grid grid-cols-[36px_minmax(0,1fr)] items-center gap-x-2"
                )}
              >
                <div className="relative h-9 w-9">
                  <div className="radius-pill flex h-9 w-9 items-center justify-center overflow-hidden border border-[#2a4269] bg-base/35 text-[11px] font-bold shadow-[0_0_0_1px_rgb(8_23_42)]">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={`${user.firstName} avatar`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-100">{initials || "U"}</span>
                    )}
                  </div>
                  {!isCollapsed ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-[rgb(var(--app-sidebar-bg))] bg-emerald-400" />
                  ) : null}
                </div>

                {!isCollapsed ? (
                  <div className="min-w-0">
                    <div className="truncate text-[1rem] font-semibold leading-tight text-slate-100">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="truncate text-[11px] leading-tight text-slate-400">{user.email}</div>
                  </div>
                ) : null}
              </div>
            </button>
          </div>

          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              title={isCollapsed ? "Logout" : undefined}
              className={clsx(
                "radius-ui flex w-full items-center px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-text",
                isCollapsed ? "justify-center md:h-10 md:w-10 md:px-0" : "gap-2"
              )}
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} className="h-4 w-4 shrink-0" />
              {!isCollapsed ? "Logout" : null}
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
