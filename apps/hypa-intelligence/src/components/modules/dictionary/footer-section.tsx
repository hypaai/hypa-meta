import { useTheme } from "@/components/modules/theme/theme-provider";
import { getThemeAwareLogo } from "@/lib/theme-assets";
import { Link } from "@/react-router-compat";
import { SocialLinks } from "@hypa/ui/web";

const FooterSection = () => {
  const { theme } = useTheme();

  return (
    <footer className="border-t border-[var(--border)] py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <img
                alt="Hypa Intelligence"
                className="h-8"
                src={getThemeAwareLogo("hypaintelligence", theme)}
              />
              <span className="text-lg font-semibold">Hypa Intelligence</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-[var(--muted-foreground)] leading-relaxed">
              Documenting, preserving, and making accessible all languages of
              the world. A language knowledge system for the future.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-sm font-semibold">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  to="/dictionary/languages"
                >
                  All Languages
                </Link>
              </li>
              <li>
                <a
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  href="#"
                >
                  Endangered Languages
                </a>
              </li>
              <li>
                <a
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  href="#"
                >
                  African Languages
                </a>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-sm font-semibold">About</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  href="#"
                >
                  Our Mission
                </a>
              </li>
              <li>
                <a
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  href="#"
                >
                  Contribute
                </a>
              </li>
              <li>
                <a
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  href="https://hypaintelligence.com/#contact"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted-foreground)]">
          <span>&copy; 2026 Hypa. All rights reserved.</span>
          <SocialLinks />
          <span className="italic">
            Preserving humanity&apos;s linguistic heritage.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
