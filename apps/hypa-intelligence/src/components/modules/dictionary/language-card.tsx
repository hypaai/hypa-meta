import type { FeaturedLanguage } from "@/constants/dictionary";

const LanguageCard = ({ lang }: { lang: FeaturedLanguage }) => (
  <div className="border border-[var(--border)] bg-[var(--card)] p-5">
    {/* Header: name + badge */}
    <div className="flex items-start justify-between mb-1">
      <div>
        <h3 className="text-2xl font-normal">{lang.name}</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          {lang.nativeName}
        </p>
      </div>
      <span className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
        {lang.status}
      </span>
    </div>

    {/* Details rows */}
    <div className="mt-4 space-y-2.5 text-sm">
      <div className="flex justify-between">
        <span className="text-[var(--muted-foreground)]">Region</span>
        <span className="font-normal">{lang.region}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[var(--muted-foreground)]">Speakers</span>
        <span className="font-normal">{lang.speakers}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[var(--muted-foreground)]">Writing System</span>
        <span className="font-normal">{lang.writingSystem}</span>
      </div>
    </div>

    {/* Sample words */}
    <div className="mt-4">
      <p className="text-[14px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)] mb-2 border-t-1 p-2">
        Sample Words
      </p>
      <div className="flex flex-wrap gap-1.5">
        {lang.sampleWords.map((word) => (
          <span
            key={word}
            className="rounded bg-[var(--muted)]/30 border-1 px-2.5 py-1 text-xs font-medium"
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default LanguageCard;
