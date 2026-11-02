import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  useAcModelLanguages,
  useModelLanguages,
} from "@/hooks/use-model-languages";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "@/lucide-compat";

type ModelLanguageSource = "ac" | "mt";

type ModelLanguagePickerProps = {
  value: string | null;
  onValueChange: (language: string) => void;
  modelSource?: ModelLanguageSource;
  excludeLanguages?: string[];
  placeholder?: string;
  autoSelectFirst?: boolean;
  containerClassName?: string;
  buttonClassName?: string;
  labelClassName?: string;
  chevronClassName?: string;
  menuClassName?: string;
  itemClassName?: string;
  selectedItemClassName?: string;
  selectedCheckClassName?: string;
  prefix?: ReactNode;
  menuPlacement?: "top" | "bottom";
  disabled?: boolean;
};

export function ModelLanguagePicker({
  value,
  onValueChange,
  modelSource = "ac",
  excludeLanguages = [],
  placeholder = "Select language",
  autoSelectFirst = false,
  containerClassName,
  buttonClassName,
  labelClassName,
  chevronClassName,
  menuClassName,
  itemClassName,
  selectedItemClassName,
  selectedCheckClassName,
  prefix,
  menuPlacement = "bottom",
  disabled = false,
}: ModelLanguagePickerProps) {
  const acLanguages = useAcModelLanguages();
  const mtLanguages = useModelLanguages();
  const modelLanguages = modelSource === "mt" ? mtLanguages : acLanguages;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const filteredLanguages = useMemo(() => {
    if (excludeLanguages.length === 0) return modelLanguages;

    const excluded = new Set(excludeLanguages.map((l) => l.toLowerCase()));

    return modelLanguages.filter((l) => !excluded.has(l.toLowerCase()));
  }, [excludeLanguages, modelLanguages]);

  const selectedValue =
    value && filteredLanguages.includes(value) ? value : null;

  useEffect(() => {
    if (filteredLanguages.length === 0) return;

    if (!selectedValue) {
      if (value === null && !autoSelectFirst) return;
      onValueChange(filteredLanguages[0]);
    }
  }, [autoSelectFirst, filteredLanguages, onValueChange, selectedValue, value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const displayValue = selectedValue ?? placeholder;
  const hasOptions = filteredLanguages.length > 0;

  return (
    <div ref={rootRef} className={cn("relative", containerClassName)}>
      <button
        className={cn(
          "flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50",
          buttonClassName,
        )}
        disabled={disabled || !hasOptions}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
      >
        {prefix}
        <span className={cn("truncate", labelClassName)}>{displayValue}</span>
        <ChevronDown
          className={cn(
            "size-3.5 text-[var(--muted-foreground)] transition-transform duration-200",
            open && "rotate-180",
            chevronClassName,
          )}
        />
      </button>

      <AnimatePresence>
        {open && hasOptions && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "absolute left-0 z-50 max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] py-1 shadow-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              menuPlacement === "top" ? "bottom-full mb-2" : "top-full mt-1",
              menuClassName,
            )}
            exit={{ opacity: 0, y: menuPlacement === "top" ? 8 : 4 }}
            initial={{ opacity: 0, y: menuPlacement === "top" ? 8 : 4 }}
            transition={{ duration: 0.15 }}
          >
            {filteredLanguages.map((language, index) => {
              const isSelected = selectedValue === language;

              return (
                <button
                  key={index}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-[var(--accent)]",
                    itemClassName,
                    isSelected && selectedItemClassName,
                  )}
                  onClick={() => {
                    onValueChange(language);
                    setOpen(false);
                  }}
                >
                  <span>{language}</span>
                  {isSelected && (
                    <Check
                      className={cn(
                        "size-3.5 text-[var(--foreground)]",
                        selectedCheckClassName,
                      )}
                    />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
