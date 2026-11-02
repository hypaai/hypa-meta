import { useReducedMotion } from "framer-motion";

/**
 * Props for items that animate in when a page opens, the way the Home hero does:
 * a fade and a short slide up, started `delay` seconds after the page mounts.
 * With reduced motion on, items simply appear.
 */
export function usePageEnter() {
  const reduceMotion = useReducedMotion();

  return (delay = 0, { duration = 0.5, y = 15 } = {}) =>
    reduceMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration, delay },
        };
}
