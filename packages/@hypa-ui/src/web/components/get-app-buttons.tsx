const IOS_TESTFLIGHT_URL = "https://testflight.apple.com/join/1u423Uz4";
const ANDROID_OPEN_TESTING_URL =
  "https://play.google.com/apps/testing/com.hypaintelligence.hypaintelligence";

const BUTTON_CLASS =
  "inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-opacity hover:opacity-90 md:text-base";

export function GetAppButtons() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          className={`${BUTTON_CLASS} bg-[var(--foreground)] text-[var(--background)]`}
          href={IOS_TESTFLIGHT_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Try it on iPhone
        </a>
        <a
          className={`${BUTTON_CLASS} border border-[var(--border)] text-[var(--foreground)]`}
          href={ANDROID_OPEN_TESTING_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          Try it on Android
        </a>
      </div>
      <p className="text-xs text-[var(--muted-foreground)] md:text-sm">
        iPhone is on TestFlight. Android is in open testing.
      </p>
    </div>
  );
}
