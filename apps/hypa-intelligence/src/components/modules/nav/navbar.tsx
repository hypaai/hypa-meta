import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { ThemeToggle } from "@/components/modules/theme/theme-toggle";
import { useTheme } from "@/components/modules/theme/theme-provider";
import { getThemeAwareLogo } from "@/lib/theme-assets";
import { ChevronDown, Grid3X3 } from "@/lucide-compat";
import {
  HELP_FAQ,
  APP_FEATURES,
  PRODUCTS,
  CONTACT_US_LINK,
} from "@/constants/dictionary";

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };

    document.addEventListener("mousedown", listener);

    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

const Navbar = () => {
  const { theme } = useTheme();
  const location = useLocation();

  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const featuresRef = useRef<HTMLDivElement>(null);
  const appsRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setFeaturesOpen(false);
    setAppsOpen(false);
    setMobileMenuOpen(false);
  }, []);

  useClickOutside(featuresRef, () => setFeaturesOpen(false));
  useClickOutside(appsRef, () => setAppsOpen(false));
  useClickOutside(mobileMenuRef, () => setMobileMenuOpen(false));

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };

    document.addEventListener("keydown", handleEsc);

    return () => document.removeEventListener("keydown", handleEsc);
  }, [closeAll]);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Chat", path: "/chat" },
  ];

  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-[var(--border)] bg-[var(--background)]/80 supports-[backdrop-filter]:bg-[var(--background)]/60 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-14 relative flex items-center justify-between">
          
          {/* Left Side: Logo + Features */}
          <div className="flex items-center gap-2 md:gap-4 text-sm z-10 w-1/3">
            <a className="flex items-center" href="/">
              <img
                alt="Hypa Intelligence"
                className="h-6 sm:h-7 lg:h-8 mr-1 sm:mr-2 lg:mr-4"
                src={getThemeAwareLogo("hypaintelligence", theme)}
              />
            </a>

            <div ref={featuresRef} className="block">
              <button
                className="inline-flex items-center gap-1 sm:gap-2 rounded-md px-1 sm:px-2 lg:px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                onClick={() => {
                  setFeaturesOpen(!featuresOpen);
                  setAppsOpen(false);
                  setMobileMenuOpen(false);
                }}
              >
                Features <ChevronDown className="size-4" />
              </button>

              {featuresOpen && (
                <div className="absolute left-0 top-full z-[60] mt-1 w-[36rem] max-w-[90vw] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-md">
                  <div className="max-h-[70vh] overflow-y-auto sm:max-h-[75vh]">
                    <div className="grid sm:grid-cols-2">
                      {/* Features column */}
                      <div className="p-4 sm:p-5">
                        <div className="px-0 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          What makes Hypa different
                        </div>
                        <div className="mt-3 space-y-3">
                          {APP_FEATURES.map(({ title, description }) => (
                            <article
                              key={title}
                              className="rounded-md p-2 transition-colors hover:bg-[var(--accent)]"
                            >
                              <h4 className="text-sm font-semibold leading-snug">
                                {title}
                              </h4>
                              <p className="text-xs text-[var(--muted-foreground)] leading-snug mt-1">
                                {description}
                              </p>
                            </article>
                          ))}
                        </div>
                      </div>

                      {/* FAQ column */}
                      <div className="border-t border-[var(--border)]/40 bg-[var(--muted)]/30 p-4 sm:border-t-0 sm:border-l sm:p-5">
                        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          FAQs at a glance
                        </div>
                        <div className="mt-3 space-y-3">
                          {HELP_FAQ.slice(0, 4).map(({ q, a }) => (
                            <section
                              key={q}
                              className="rounded-md bg-[var(--background)] p-3 shadow-sm shadow-black/5"
                            >
                              <h5 className="text-sm font-semibold leading-tight">
                                {q}
                              </h5>
                              <p className="text-xs text-[var(--muted-foreground)] leading-snug mt-1">
                                {a}
                              </p>
                            </section>
                          ))}
                        </div>
                        <a
                          className="mt-4 inline-block text-sm text-[var(--ring)] hover:text-[var(--ring)]/90"
                          href={CONTACT_US_LINK}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Need more help? Contact support ↗
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Links (Desktop only) */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-1 lg:gap-4 z-10">
            {navLinks.map((link) => {
              const isActive =
                link.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(link.path);

              return (
                <Link
                  key={link.path}
                  className={`px-3 lg:px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "underline underline-offset-4 decoration-[1.5px]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                  to={link.path}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 w-1/3 z-10">
            <ThemeToggle simple />

            {/* Apps Grid */}
            <div ref={appsRef} className="relative">
              <button
                aria-label="Apps"
                className="inline-flex items-center justify-center rounded-md p-1.5 sm:p-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                title="Apps"
                onClick={() => {
                  setAppsOpen(!appsOpen);
                  setFeaturesOpen(false);
                  setMobileMenuOpen(false);
                }}
              >
                <Grid3X3 className="size-5" />
              </button>

              {appsOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[16rem] rounded-xl border border-[var(--border)] bg-[var(--popover)] p-2 text-[var(--popover-foreground)] shadow-2xl">
                  <div className="px-4 py-3 border-b border-[var(--border)]/50">
                    <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Hypa Products
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 p-2">
                    {PRODUCTS.map(({ id, name, href }) => (
                      <a
                        key={id}
                        className="flex flex-col items-center p-1.5 text-center justify-center gap-1 rounded-md hover:bg-[var(--accent)]"
                        href={href}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <div className="w-9 h-9 flex items-center justify-center rounded-md">
                          <img
                            alt={name}
                            className="max-w-full max-h-full object-contain"
                            src={getThemeAwareLogo(id, theme)}
                          />
                        </div>
                        <div className="text-xs font-medium leading-tight">
                          {name}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Get Hypa Button (Desktop) */}
            <a
              className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              href="/#get-app"
            >
              <span>Get Hypa</span>
            </a>

            {/* Mobile Menu Dropdown (Right Side) */}
            <div ref={mobileMenuRef} className="md:hidden relative">
              <button
                className="inline-flex items-center justify-center rounded-md p-1.5 sm:p-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setFeaturesOpen(false);
                  setAppsOpen(false);
                }}
              >
                {mobileMenuOpen ? (
                  <X className="size-5" />
                ) : (
                  <Menu className="size-5" />
                )}
              </button>

              {mobileMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[12rem] rounded-xl border border-[var(--border)] bg-[var(--popover)] p-2 text-[var(--popover-foreground)] shadow-2xl">

                  <nav className="flex flex-col gap-1">
                    {navLinks.map((link) => {
                      const isActive =
                        link.path === "/"
                          ? location.pathname === "/"
                          : location.pathname.startsWith(link.path);

                      return (
                        <Link
                          key={link.path}
                          className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]/50 hover:text-[var(--foreground)]"
                          }`}
                          to={link.path}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {link.name}
                        </Link>
                      );
                    })}
                  </nav>

                  <div className="pt-2 mt-2 border-t border-[var(--border)]/50 sm:hidden">
                    <a
                      className="flex w-full justify-center items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
                      href="/#get-app"
                    >
                      Get Hypa
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
