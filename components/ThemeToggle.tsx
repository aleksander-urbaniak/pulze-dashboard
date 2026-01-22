"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof document !== "undefined") {
          document.documentElement.classList.add("theme-transition");
          if (transitionTimeoutRef.current) {
            window.clearTimeout(transitionTimeoutRef.current);
          }
          transitionTimeoutRef.current = window.setTimeout(() => {
            document.documentElement.classList.remove("theme-transition");
          }, 700);
        }
        setTheme(isDark ? "light" : "dark");
      }}
      className="rounded-full border border-border px-3 py-2 text-xs uppercase tracking-[0.2em]"
      aria-label="Toggle theme"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center">
        {isDark ? (
          <svg
            className="theme-icon theme-icon--moon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            suppressHydrationWarning
          >
            <path
              d="M21 14.5C19.7 15.2 18.2 15.6 16.6 15.6C12.1 15.6 8.4 11.9 8.4 7.4C8.4 5.8 8.8 4.3 9.5 3C6.1 4.1 3.6 7.2 3.6 10.9C3.6 15.6 7.4 19.4 12.1 19.4C15.8 19.4 18.9 16.9 21 14.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            className="theme-icon theme-icon--sun"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            suppressHydrationWarning
          >
            <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M12 3v2.2M12 18.8V21M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M3 12h2.2M18.8 12H21M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
