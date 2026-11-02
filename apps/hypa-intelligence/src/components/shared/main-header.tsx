// @ts-nocheck
import { ThemeToggle } from "@/components/modules/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Grid3X3, House, Settings } from "lucide-react";
import {
  HELP_FAQ,
  APP_FEATURES,
  PRODUCTS,
  CONTACT_US_LINK,
} from "@/constants/app.constants";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/components/modules/theme/theme-provider";
import { getThemeAwareLogo } from "@/lib/theme-assets";

const MainHeader = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b px-4 md:px-6 bg-background/80 supports-[backdrop-filter]:bg-background/60 backdrop-blur shadow-sm">
      <div className="mx-auto max-w-7xl h-14 relative flex items-center">
        {/* Left side */}
        <div className="flex items-center gap-2 text-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2" variant="ghost">
                Features <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[36rem] max-w-[90vw] p-0 overflow-hidden"
            >
              <div className="max-h-[70vh] overflow-y-auto sm:max-h-[75vh]">
                <div className="grid sm:grid-cols-2">
                  <div className="p-4 sm:p-5">
                    <DropdownMenuLabel className="px-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      What makes Hypa different
                    </DropdownMenuLabel>
                    <div className="mt-3 space-y-3">
                      {APP_FEATURES.map(({ id, title, description }) => (
                        <article
                          key={id}
                          className="rounded-md p-2 transition-colors hover:bg-accent"
                        >
                          <h4 className="text-sm font-semibold leading-snug">
                            {title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-snug mt-1">
                            {description}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/40 bg-muted/30 p-4 sm:border-t-0 sm:border-l sm:p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      FAQs at a glance
                    </div>
                    <div className="mt-3 space-y-3">
                      {HELP_FAQ.slice(0, 4).map(({ q, a }) => (
                        <section
                          key={q}
                          className="rounded-md bg-background p-3 shadow-sm shadow-black/5"
                        >
                          <h5 className="text-sm font-semibold leading-tight">
                            {q}
                          </h5>
                          <p className="text-xs text-muted-foreground leading-snug mt-1">
                            {a}
                          </p>
                        </section>
                      ))}
                    </div>
                    <Button
                      asChild
                      className="mt-4 h-auto px-0 text-primary hover:text-primary/90"
                      size="sm"
                      variant="ghost"
                    >
                      <a
                        href={CONTACT_US_LINK}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        Need more help? Contact support ↗
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Centered logo */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <a href="/translate">
            <div className="flex items-center gap-2 text-xl md:text-2xl font-semibold">
              <img
                alt="Hypa Translate"
                className="h-8 md:h-10"
                src={getThemeAwareLogo("hypatranslate", theme)}
              />
              <span className="hidden md:inline">Hypa Translate</span>
            </div>
          </a>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle simple />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Apps"
                size="icon"
                title="Apps"
                variant="ghost"
              >
                <Grid3X3 className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="relative mx-1 p-2 rounded-xl shadow-2xl"
              side="bottom"
              sideOffset={8}
            >
              <div className="px-4 py-3 border-b border-divider/50">
                <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  Hypa Products
                </p>
              </div>
              <div className="grid relative grid-cols-3 gap-3">
                {PRODUCTS.map(({ id, name, href }) => (
                  <a
                    key={id}
                    className="flex flex-col items-center p-1.5 text-center justify-center gap-1 rounded-md hover:bg-accent"
                    href={href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <div className="w-9 h-9 flex items-center justify-center rounded-md">
                      <img
                        alt={name}
                        className={`max-w-full max-h-full object-contain`}
                        src={getThemeAwareLogo(id, theme)}
                      />
                    </div>
                    <div className="text-xs font-medium leading-tight">
                      {name}
                    </div>
                  </a>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  );
};

export default MainHeader;
