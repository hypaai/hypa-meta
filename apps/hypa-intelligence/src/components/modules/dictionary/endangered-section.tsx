import { motion } from "framer-motion";
import { ENDANGERED_TAGS } from "@/constants/dictionary";
import { ArrowRight } from "@/lucide-compat";
import { Link } from "@/react-router-compat";

const EndangeredSection = () => (
  <section className="py-4 md:py-28">
    <motion.div
      className="mx-auto max-w-6xl px-4"
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true, margin: "-60px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className=" border border-black bg-[var(--card)] px-8 py-10 md:px-12 md:py-14">
        <p className="text-[12px] font-regular uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Preservation
        </p>
        <h2 className="mt-2 text-2xl font-meduim sm:text-3xl text-[var(--muted-foreground)]">
          Endangered Languages
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--muted-foreground)] leading-relaxed">
          Over 3,000 languages are at risk of disappearing by the end of this
          century. Hypa is committed to documenting and preserving these
          invaluable pieces of human heritage.
        </p>

        {/* Tags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {ENDANGERED_TAGS.map((tag) => (
            <span
              key={tag}
              className="rounded border-1 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] bg-[var(--muted)]/30"
            >
              {tag}
            </span>
          ))}
        </div>

        <Link
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium hover:underline text-[var(--muted-foreground)]"
          to="/dictionary/languages"
        >
          View all endangered languages <ArrowRight className="size-4" />
        </Link>
      </div>
    </motion.div>
  </section>
);

export default EndangeredSection;
