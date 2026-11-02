import { motion } from "framer-motion";

import { SocialLinks } from "@hypa/ui/web";
import { useTheme } from "@/components/modules/theme/theme-provider";
import { getThemeAwareLogo } from "@/lib/theme-assets";

export default function FooterSection() {
  const { theme } = useTheme();

  return (
    <motion.footer
      className="border-t border-[var(--border)] py-8 bg-[var(--background)] text-sm"
      id="contact"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1 }}
    >
      <div className="container px-4 md:px-6 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img
              alt="Hypa Intelligence"
              className="h-8 w-auto"
              src={getThemeAwareLogo("hypaintelligence", theme)}
            />
            <span className="text-base font-medium">Hypa Intelligence</span>
          </div>
          <p className="flex items-center text-xs text-[var(--muted-foreground)] md:text-sm">
            © 2024 Hypa. All rights reserved.
          </p>
        </div>

        <div className="flex flex-col items-center md:items-end gap-4">
          <SocialLinks className="flex items-center gap-3 text-[var(--muted-foreground)]" />
          <div className="flex flex-wrap justify-center gap-6 text-[var(--muted-foreground)]">
            {[
              "Privacy Policy",
              "Terms of Service",
              "Accessibility",
              "Support",
            ].map((item) => (
              <motion.a
                key={item}
                className="transition-colors"
                href="#"
                whileHover={{ y: -2, color: "var(--foreground)" }}
              >
                {item}
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </motion.footer>
  );
}

