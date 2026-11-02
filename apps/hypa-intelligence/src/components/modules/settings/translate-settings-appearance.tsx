// @ts-nocheck
import { ChevronDown, Monitor, Moon, Sun, Check } from "lucide-react";
import { THEME_OPTIONS } from "@/constants/app.constants";

import { Button } from "../../ui/button";
import CardWidth from "../../ui/card-with";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { useTheme } from "../theme/theme-provider";

const SettingsAppearance = () => {
  const { theme, setTheme } = useTheme();

  const themeOptionsWithIcons = THEME_OPTIONS.map((option) => ({
    ...option,
    icon:
      option.value === "light" ? Sun : option.value === "dark" ? Moon : Monitor,
  }));

  const currentTheme = themeOptionsWithIcons.find(
    (option) => option.value === theme,
  );

  return (
    <CardWidth>
      <h3 className="text-card-foreground font-semibold text-base lg:text-2xl xl:text-4xl">
        Appearance
      </h3>
      <div className="mt-8">
        <p className="text-base text-card-foreground font-medium mb-3">Theme</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Theme selector"
              className="min-w-40 lg:w-56 justify-between"
              variant="outline"
            >
              <div className="flex items-center gap-2">
                {currentTheme && <currentTheme.icon className="size-4" />}
                <span>{currentTheme?.label || "System Default"}</span>
              </div>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="overflow-auto"
            style={{ width: "var(--radix-dropdown-menu-trigger-width)" }}
          >
            {themeOptionsWithIcons.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className={theme === option.value ? "bg-accent" : ""}
                onClick={() => setTheme(option.value)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <option.icon className="size-4 shrink-0" />
                  <span className="min-w-0">{option.label}</span>
                </div>
                {theme === option.value && (
                  <Check className="size-4 ml-auto shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardWidth>
  );
};

export default SettingsAppearance;
