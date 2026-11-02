// @ts-nocheck
// This logger is a passthrough to console.* for now.
// It exists as a future abstraction point for logging (e.g., to add remote logging, filtering, or formatting).
// Do not remove as dead code; update here if logging needs change.
export const logger = {
  log: (...args: unknown[]) => console.log(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
