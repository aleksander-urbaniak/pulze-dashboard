"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

type FilterSelectOption = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  value: string;
  options: ReadonlyArray<FilterSelectOption>;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  containerClassName?: string;
};

export default function FilterSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder,
  disabled,
  className,
  menuClassName,
  optionClassName,
  containerClassName
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedLabel = useMemo(() => {
    const match = options.find((option) => option.value === value);
    return match?.label ?? placeholder ?? "Select";
  }, [options, placeholder, value]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleToggle() {
    if (disabled) {
      return;
    }
    setOpen((prev) => !prev);
  }

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={clsx("relative", containerClassName)}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx("inline-flex items-center justify-between gap-2", className)}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          className={clsx("h-4 w-4 transition-transform duration-200", open ? "rotate-180" : "rotate-0")}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        role="listbox"
        aria-hidden={!open}
        className={clsx(
          "absolute left-0 mt-2 min-w-full origin-top rounded-2xl border border-border bg-surface/95 p-1 shadow-card backdrop-blur transition duration-200 ease-in-out z-50 max-h-64 overflow-y-auto",
          open
            ? "visible pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "invisible pointer-events-none -translate-y-1 scale-95 opacity-0",
          menuClassName
        )}
      >
        {options.map((option) => {
          const isPlaceholder = option.value === "";
          const isSelected = option.value === value && !isPlaceholder;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelect(option.value)}
              className={clsx(
                "dropdown-option w-full rounded-xl px-3 py-2 text-left transition-colors",
                isSelected
                  ? "bg-accent text-white"
                  : isPlaceholder
                    ? "text-muted hover:bg-base/70"
                    : "text-text hover:bg-base/70",
                optionClassName
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
