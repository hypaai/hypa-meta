import { motion } from "framer-motion";
import { FEATURED_LANGUAGES } from "@/constants/dictionary";
import LanguageCard from "@/components/modules/dictionary/language-card";
import { ArrowRight } from "@/lucide-compat";
import { Link } from "@/react-router-compat";

const FeaturedSection = () => (
  <section className="border-t border-[var(--border)] py-8 md:py-20">
    <div className="mx-auto max-w-6xl px-4">
      {/* Header */}
      <motion.div
        className="flex items-end justify-between mb-10"
        initial={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.4 }}
        viewport={{ once: true, margin: "-50px" }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            Featured
          </p>
          <h2 className="mt-3 text-2xl font-normal sm:text-3xl text-[var(--muted-foreground)]">
            Languages to Discover
          </h2>
        </div>
        <Link
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium hover:underline text-[var(--muted-foreground)]"
          to="/dictionary/languages"
        >
          View all languages <ArrowRight className="size-4" />
        </Link>
      </motion.div>

      {/* Cards grid / carousel */}
      <div>
        {/* Desktop/tablet: grid, max 6 cards */}
        <div className="hidden sm:grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_LANGUAGES.slice(0, 6).map((lang, i) => (
            <motion.div
              key={lang.name}
              initial={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              viewport={{ once: true, margin: "-30px" }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <LanguageCard lang={lang} />
            </motion.div>
          ))}
        </div>

        {/* Mobile: horizontal carousel  */}
        <div className="sm:hidden overflow-x-auto snap-x snap-mandatory flex gap-4 pb-2 pr-4">
          {FEATURED_LANGUAGES.slice(0, 6).map((lang, i) => (
            <motion.div
              key={lang.name}
              className="min-w-[75vw] snap-start"
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
              viewport={{ once: true, margin: "-30px" }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
            >
              <LanguageCard lang={lang} />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="sm:hidden flex justify-center mt-8"
          initial={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          viewport={{ once: true }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <Link
            className="flex items-center gap-1.5 text-sm font-medium hover:underline text-[var(--muted-foreground)]"
            to="/dictionary/languages"
          >
            View all languages <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  </section>
);

export default FeaturedSection;
