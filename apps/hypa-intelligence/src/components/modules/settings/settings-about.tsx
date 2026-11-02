import { ExternalLink, Info } from "@/lucide-compat";
import { useTheme } from "@/components/modules/theme/theme-provider";
import { getThemeAwareLogo } from "@/lib/theme-assets";
import { PRODUCTS, CONTACT_US_LINK } from "@/constants/dictionary";

import CardWidth from "./card-width";

const SettingsAbout = () => {
  const { theme } = useTheme();

  return (
    <CardWidth>
      <h3 className="font-semibold text-base lg:text-2xl xl:text-4xl flex items-center gap-2">
        <Info className="size-6" />
        About
      </h3>

      <div className="space-y-6 mt-8">
        <div>
          <h4 className="font-medium text-base mb-2">Hypa Dictionary</h4>
          <p className="text-[var(--muted-foreground)] text-sm lg:text-base leading-relaxed">
            The world&apos;s most comprehensive multilingual dictionary —
            preserving linguistic diversity one word at a time. Explore words,
            phrases, and cultural context across thousands of languages.
          </p>
        </div>

        <div>
          <h4 className="font-medium text-base mb-2">Version Information</h4>
          <p className="text-[var(--muted-foreground)] text-sm">
            Version: <span className="font-mono">0.1.0</span>
          </p>
        </div>

        <div>
          <h4 className="font-medium text-base mb-3">
            Support &amp; Information
          </h4>
          <div className="space-y-2">
            <a
              className="flex items-center gap-2 text-[var(--primary)] hover:text-[var(--primary)]/80 text-sm transition-colors w-fit"
              href={CONTACT_US_LINK}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              Contact Support
            </a>
            <a
              className="flex items-center gap-2 text-[var(--primary)] hover:text-[var(--primary)]/80 text-sm transition-colors w-fit"
              href="https://hypaintelligence.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              Visit Website
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-base mb-3">Also from Hypa</h4>
          <div className="space-y-2">
            {PRODUCTS.map(({ id, name, href }) => (
              <a
                key={id}
                className="flex items-center gap-3 text-[var(--primary)] hover:text-[var(--primary)]/80 text-sm transition-colors w-fit"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <img
                    alt={name}
                    className="max-w-full max-h-full object-contain"
                    src={getThemeAwareLogo(id, theme)}
                  />
                </div>
                {name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </CardWidth>
  );
};

export default SettingsAbout;
