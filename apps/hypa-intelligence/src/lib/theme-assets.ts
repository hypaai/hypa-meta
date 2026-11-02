/**
 * Theme-aware asset utilities
 */

/**
 * Get theme-aware logo path for a product
 */
export const getThemeAwareLogo = (productId: string, theme?: string): string => {
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "Dark"
        : "Light"
      : theme === "dark"
        ? "Dark"
        : "Light";

  switch (productId) {
    case "hypaintelligence":
      return `/Hypa_Intelligence_${resolvedTheme}.svg`;
    case "hypachat":
      return `/Hypa_Chat_${resolvedTheme}.svg`;
    case "hypatranslate":
      return `/Hypa_Translate_${resolvedTheme}.svg`;
    case "hypalab":
      return `/Hypa_Labs_${resolvedTheme}.svg`;
    case "hypadictionary":
      return `/Hypa_Dictionary_${resolvedTheme}.svg`;
    case "hypareality":
      return `/Hypa_Reality_${resolvedTheme}.svg`;
    case "hypamarket":
      return `/Hypa_Market_${resolvedTheme}.svg`;
    case "hypachain":
      return `/Hypa_Chain_${resolvedTheme}.svg`;
    case "hypacast":
      return `/Hypa_Cast_${resolvedTheme}.svg`;
    case "hypakeyboard":
      return `/Hypa_Keyboard_${resolvedTheme}.svg`;
    case "hypa":
      return `/Hypa_Logo_${resolvedTheme}.svg`;
    case "hypasocials":
      return `/Hypa_Socials_${resolvedTheme}.svg`;
    default:
      return "/logo.jpg";
  }
};
