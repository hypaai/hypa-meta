// @ts-nocheck
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check } from "lucide-react";

export type LangOption = { code: string; name: string };

type LangSelectProps = {
  value: LangOption;
  onChange: (l: LangOption) => void;
  options: LangOption[];
  className?: string;
  label?: string;
};

export function LangSelect({
  value,
  onChange,
  options,
  className,
}: LangSelectProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild data-testid="source-lang-select">
        <Button
          aria-label="Language selector"
          className={"w-56 justify-between " + (className ?? "")}
          variant="outline"
        >
          <span>{value.name}</span>
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 overflow-auto"
        style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}
      >
        {/* <DropdownMenuLabel>Languages</DropdownMenuLabel>
        <DropdownMenuSeparator /> */}
        {options.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => onChange(l)}>
            <span className="flex-1 min-w-0">{l.name}</span>
            {value.code === l.code && (
              <Check className="size-4 ml-auto shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LangSelect;
