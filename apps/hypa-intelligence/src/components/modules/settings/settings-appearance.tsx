import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Monitor,
  Moon,
  Sun,
  Check,
} from "@/lucide-compat";
import { useTheme } from "next-themes";
import { THEME_OPTIONS } from "@/constants/dictionary";

import CardWidth from "./card-width";

const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const;

const SettingsAppearance = () => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentOption = THEME_OPTIONS.find((o) => o.value === theme);
  const CurrentIcon = (themeIcons as Record<string, any>)[theme || "system"] || Monitor;

  return (
    <CardWidth>
      <h3 className="font-semibold text-base lg:text-2xl xl:text-4xl">
        Appearance
      </h3>
      <div className="mt-8">
        <p className="text-base font-medium mb-3">Theme</p>
        <div ref={ref} className="relative inline-block">
          <button
            aria-label="Theme selector"
            className="inline-flex min-w-40 lg:w-56 items-center justify-between gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            onClick={() => setOpen(!open)}
          >
            <span className="flex items-center gap-2">
              <CurrentIcon className="size-4" />
              {currentOption?.label || "System Default"}
            </span>
            <ChevronDown className="size-4" />
          </button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 min-w-40 lg:w-56 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-md">
              {THEME_OPTIONS.map(({ value, label }) => {
                const Icon = (themeIcons as Record<string, any>)[value];

                return (
                  <button
                    key={value}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] ${
                      theme === value ? "bg-[var(--accent)]" : ""
                    }`}
                    onClick={() => {
                      setTheme(value as "light" | "dark" | "system");
                      setOpen(false);
                    }}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 min-w-0 text-left">{label}</span>
                    {theme === value && (
                      <Check className="size-4 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </CardWidth>
  );
};

export default SettingsAppearance;
