import { motion } from "framer-motion";
import { REGIONS } from "@/constants/dictionary";
import { ArrowRight } from "@/lucide-compat";
import { Link } from "@/react-router-compat";

const RegionsSection = () => (
  <section className="border-t border-[var(--border)] py-16 md:py-20">
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
            Explore:
          </p>
          <h2 className="mt-4 text-2xl font-normal sm:text-3xl text-[var(--muted-foreground)]">
            Languages by Region
          </h2>
        </div>
        <Link
          className="hidden sm:flex items-center gap-1.5 text-sm font-medium hover:underline text-[var(--muted-foreground)]"
          to="/dictionary/languages"
        >
          View all languages <ArrowRight className="size-4" />
        </Link>
      </motion.div>

      {/* Region cards — horizontal row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {REGIONS.map(({ name, languages }, i) => (
          <motion.button
            key={name}
            className=" border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-center transition-colors hover:bg-[var(--accent)]"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            viewport={{ once: true, margin: "-30px" }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <div className="text-sm font-semibold">{name}</div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              {languages} languages
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  </section>
);

export default RegionsSection;
