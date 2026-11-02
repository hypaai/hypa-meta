// @ts-nocheck
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";

interface ModelOption {
  name: string;
  displayName?: string;
  modelCardUrl?: string;
  notes?: string;
}

interface ModelSelectorProps {
  title: string;
  options: ModelOption[];
  currentModel: string;
  onSelect: (modelName: string) => void;
}

const ModelSelector = ({
  title,
  options,
  currentModel,
  onSelect,
}: ModelSelectorProps) => {
  if (!options || options.length === 0) {
    return null;
  }

  const selectedOption = options.find((m) => m.name === currentModel);

  return (
    <div className="mb-6">
      <p className="text-lg text-card-foreground font-medium mb-3">{title}</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`${title} selector`}
            className="min-w-[280px] lg:min-w-[400px] justify-between"
            variant="outline"
          >
            <span className="truncate">
              {selectedOption?.displayName || currentModel || `Select ${title}`}
            </span>
            <ChevronDown className="size-4 flex-shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-80 min-w-[280px] lg:min-w-[400px] overflow-auto"
        >
          <DropdownMenuLabel>Available models</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((m) => (
            <DropdownMenuItem
              key={m.name}
              className={currentModel === m.name ? "bg-accent" : ""}
              onClick={() => onSelect(m.name)}
            >
              <span className="font-medium">{m.displayName || m.name}</span>
              {currentModel === m.name && (
                <Check className="size-4 ml-auto shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ModelSelector;
