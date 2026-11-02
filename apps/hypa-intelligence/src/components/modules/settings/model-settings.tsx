import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Cpu } from "@/lucide-compat";
import {
  useSettingsStore,
  acModels,
  type ModelOption,
} from "@/stores/settings-store";
import { showToast } from "@/components/shared/toast";

import CardWidth from "./card-width";

/* ─── Reusable model dropdown ─── */

interface ModelDropdownProps {
  label: string;
  options: ModelOption[];
  current: string;
  onSelect: (name: string) => void;
  disabled?: boolean;
}

const ModelDropdown = ({
  label,
  options,
  current,
  onSelect,
  disabled = false,
}: ModelDropdownProps) => {
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

  const selected = options.find((m) => m.name === current);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  if (options.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="text-base font-medium mb-3">{label}</p>
      <div ref={ref} className="relative inline-block">
        <button
          aria-label={`${label} selector`}
          className={`inline-flex min-w-[280px] lg:min-w-[400px] items-center justify-between gap-2 rounded-md border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm font-medium transition-colors ${
            disabled
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
          }`}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen(!open);
          }}
        >
          <span className="truncate">
            {selected?.displayName ?? current ?? `Select ${label}`}
          </span>
          <ChevronDown className="size-4 flex-shrink-0" />
        </button>

        {open && !disabled && (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[280px] lg:min-w-[400px] max-h-80 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="px-2 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
              Available models
            </div>
            <div className="h-px bg-[var(--border)]" />
            {options.map((m) => (
              <button
                key={m.name}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-sm transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] ${
                  current === m.name ? "bg-[var(--accent)]" : ""
                }`}
                onClick={() => {
                  onSelect(m.name);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col flex-1 min-w-0 text-left">
                  <span className="font-medium">{m.displayName ?? m.name}</span>
                  {m.languages && m.languages.length > 0 && (
                    <span className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {m.languages.length} languages
                    </span>
                  )}
                </div>
                {current === m.name && (
                  <Check className="size-4 ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Show supported languages */}
      {selected?.languages && selected.languages.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-[var(--muted-foreground)] mb-1.5">
            Supported languages:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.languages.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Model Settings section ─── */

const ModelSettings = () => {
  const acModel = useSettingsStore((s) => s.acModel);
  const ttsModel = useSettingsStore((s) => s.ttsModel);
  const { setAcModel, setTtsModel, getTtsModels, resetToDefaults } =
    useSettingsStore((s) => s.actions);

  const currentTtsModels = getTtsModels();

  return (
    <CardWidth>
      <div className="flex items-center gap-2 mb-2">
        <Cpu className="size-5" />
        <h3 className="font-semibold text-base lg:text-2xl xl:text-4xl">
          Model Settings
        </h3>
      </div>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Choose which AI models to use. The selected model determines available
        languages for dictionary search, translation, and text-to-speech.
      </p>

      <ModelDropdown
        current={acModel}
        label="AC Model"
        options={acModels}
        onSelect={(name) => {
          setAcModel(name);
          showToast("AC model updated");
        }}
      />

      <ModelDropdown
        current={ttsModel}
        label="Text-to-Speech Model"
        options={currentTtsModels}
        onSelect={(name) => {
          setTtsModel(name);
          showToast("TTS model updated");
        }}
      />

      <button
        className="mt-2 inline-flex items-center rounded-md border border-[var(--input)] bg-[var(--background)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
        onClick={() => {
          resetToDefaults();
          showToast("Settings reset to defaults");
        }}
      >
        Reset to Defaults
      </button>
    </CardWidth>
  );
};

export default ModelSettings;
