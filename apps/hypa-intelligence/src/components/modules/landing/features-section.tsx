import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useTheme } from "@/components/modules/theme/theme-provider";
import { getThemeAwareLogo } from "@/lib/theme-assets";

interface Tool {
  logo: string;
  alt: string;
  title: string;
  description: string;
  /** A cropped capture of the feature, or a looping clip (.mp4). */
  preview: string;
  path?: string;
}

const TOOLS: Tool[] = [
  {
    logo: "hypadictionary",
    alt: "Hypa Dictionary",
    title: "Dictionary",
    description: "Word of the day, definitions, and native pronunciation.",
    preview: "/screenshots/dictionary.mp4",
    path: "/dictionary",
  },
  {
    logo: "hypatranslate",
    alt: "Hypa Translate",
    title: "Translate",
    description: "Fast and high-quality translation between world languages.",
    preview: "/screenshots/translate.mp4",
    path: "/translate",
  },
  {
    logo: "hypachat",
    alt: "Hypa Chat",
    title: "Chat",
    description: "Ask anything in your language. Hypa translates, speaks and reads for you.",
    preview: "/screenshots/keyboard-chat.mp4",
    path: "/chat",
  },
  {
    logo: "hypakeyboard",
    alt: "Hypa Keyboard",
    title: "AI Keyboard",
    description: "Type seamlessly in your native characters with our keyboard.",
    preview: "/screenshots/keyboard.mp4",
  },
];

const VISIBLE = 3;
const ROTATE_MS = 5000;

function ToolCard({ tool, theme }: { tool: Tool; theme?: string }) {
  const body = (
    <>
      <div className="h-12 flex items-center mb-6">
        <img alt={tool.alt} className="h-10 w-auto" src={getThemeAwareLogo(tool.logo, theme)} />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-[var(--foreground)]">{tool.title}</h3>
      <p className="mb-8 flex-1 text-xs md:text-sm leading-relaxed text-[var(--muted-foreground)]">
        {tool.description}
      </p>
      <div className="relative mt-auto flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-t-xl border border-[var(--border)] border-b-0 bg-black">
        {tool.preview.endsWith(".mp4") ? (
          <video autoPlay loop muted playsInline aria-label={tool.alt} className="h-full w-full object-contain" src={tool.preview} />
        ) : (
          <img alt={tool.alt} className="h-full w-full object-contain" loading="lazy" src={tool.preview} />
        )}
      </div>
    </>
  );
  const className =
    "flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm overflow-hidden md:p-8";

  return tool.path ? (
    <Link className={`${className} transition-colors hover:border-[var(--foreground)]/30`} to={tool.path}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function FeaturesSection() {
  const { theme } = useTheme();
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = TOOLS.length;
  const move = (step: number) => setStart((current) => (current + step + count) % count);

  // Rotate one card at a time; stop while hovered or focused, or for reduced motion.
  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const timer = setInterval(() => move(1), ROTATE_MS);

    return () => clearInterval(timer);
  }, [paused]);

  const visible = Array.from({ length: VISIBLE }, (_, offset) => TOOLS[(start + offset) % count]);

  return (
    <section className="py-20 md:py-32 bg-[var(--background)]" id="updates">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)]">
            Four tools, one app
          </h2>
          <p className="mt-4 text-xs md:text-sm leading-relaxed text-[var(--muted-foreground)]">
            A comprehensive ecosystem for global communication.
          </p>
        </div>

        {/* Desktop and tablet: 3 cards at a time, rotating. */}
        <section
          aria-label="Hypa tools"
          aria-roledescription="carousel"
          className="hidden md:block max-w-6xl mx-auto"
          onBlur={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div aria-live={paused ? "polite" : "off"} className="grid grid-cols-3 gap-8">
            {visible.map((tool) => (
              <ToolCard key={tool.title} theme={theme} tool={tool} />
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              aria-label="Previous tool"
              className="rounded-full border border-[var(--border)] p-2 text-[var(--foreground)] hover:bg-[var(--muted)]"
              type="button"
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex gap-2">
              {TOOLS.map((tool, index) => (
                <button
                  key={tool.title}
                  aria-current={index === start}
                  aria-label={`Show ${tool.title} first`}
                  className={`h-2 rounded-full transition-all ${
                    index === start ? "w-6 bg-[var(--foreground)]" : "w-2 bg-[var(--border)]"
                  }`}
                  type="button"
                  onClick={() => setStart(index)}
                />
              ))}
            </div>
            <button
              aria-label="Next tool"
              className="rounded-full border border-[var(--border)] p-2 text-[var(--foreground)] hover:bg-[var(--muted)]"
              type="button"
              onClick={() => move(1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </section>

        {/* Mobile: one card at a time, swipe. */}
        <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 pr-4">
          {TOOLS.map((tool) => (
            <div key={tool.title} className="min-w-[80vw] snap-start">
              <ToolCard theme={theme} tool={tool} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
