// @ts-nocheck
import { useSettings } from "@/context/settings-context";
import { ExternalLink, Info } from "lucide-react";
import { CONTACT_US_LINK, PRODUCTS } from "@/constants/app.constants";
import { useTheme } from "@/components/modules/theme/theme-provider";
import { getThemeAwareLogo } from "@/lib/theme-assets";

import CardWidth from "../../ui/card-with";

const SettingsAbout = () => {
  const { settings } = useSettings();
  const { theme } = useTheme();

  return (
    <CardWidth>
      <h3 className="text-card-foreground font-semibold text-base lg:text-2xl xl:text-4xl flex items-center gap-2">
        <Info className="size-6" />
        About
      </h3>

      <div className="space-y-6 mt-8">
        {/* App Description */}
        <div>
          <h4 className="text-card-foreground font-medium text-base mb-2">
            Hypa Translate
          </h4>
          <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">
            Translate text and webpages with Hypa. Generate speech from
            translated text with advanced voice controls and customizable
            settings.
          </p>
        </div>

        {/* Version Info */}
        <div>
          <h4 className="text-card-foreground font-medium text-base mb-2">
            Version Information
          </h4>
          <p className="text-muted-foreground text-sm">
            Version: <span className="font-mono">{settings.version}</span>
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-card-foreground font-medium text-base mb-3">
            Support & Information
          </h4>
          <div className="space-y-2">
            <a
              className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm transition-colors w-fit"
              href={CONTACT_US_LINK}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              Contact Support
            </a>
            <a
              className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm transition-colors w-fit"
              href="https://hypachat.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              Visit Website
            </a>
            <a
              className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm transition-colors w-fit"
              href="https://hypatranslate.com/policy"
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4" />
              Privacy Policy
            </a>
          </div>
        </div>

        {/* Also from Hypa */}
        <div>
          <h4 className="text-card-foreground font-medium text-base mb-3">
            Also from Hypa
          </h4>
          <div className="space-y-2">
            {PRODUCTS.map(({ id, name, href }) => (
              <a
                key={id}
                className="flex items-center gap-3 text-primary hover:text-primary/80 text-sm transition-colors w-fit"
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
