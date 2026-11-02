import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FEATURED_LANGUAGES,
  LANGUAGE_REGION_FILTERS,
  LANGUAGE_STATUS_FILTERS,
} from "@/constants/dictionary";
import LanguageCard from "@/components/modules/dictionary/language-card";

const AllLanguagesPage = () => {
  const [search, setSearch] = useState("");
  const [activeRegion, setActiveRegion] = useState<string>("All Region");
  const [activeStatus, setActiveStatus] = useState<string>("All Status");

  const filtered = useMemo(() => {
    let results = FEATURED_LANGUAGES;

    if (search.trim()) {
      const q = search.toLowerCase();

      results = results.filter(
        (lang) =>
          lang.name.toLowerCase().includes(q) ||
          lang.nativeName.toLowerCase().includes(q) ||
          lang.region.toLowerCase().includes(q),
      );
    }

    if (activeRegion !== "All Region") {
      results = results.filter((lang) =>
        lang.region.toLowerCase().includes(activeRegion.toLowerCase()),
      );
    }

    if (activeStatus === "Endangered") {
      results = results.filter(
        (lang) => lang.status.toUpperCase() === "ENDANGERED",
      );
    }

    return results;
  }, [search, activeRegion, activeStatus]);

  return (
    <div className="overflow-y-hidden">
      {/* Header */}
      <section className="pt-10 pb-6 md:pt-14 md:pb-8">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Preservation
            </p>
            <h1 className="mt-3 text-3xl font-normal sm:text-4xl md:text-5xl leading-[1.15]">
              All Languages
            </h1>
            <p className="mt-4 max-w-2xl text-sm text-[var(--muted-foreground)] leading-relaxed">
              Over 3,000 languages are at risk of disappearing by the end of
              this century. Hypa is committed to documenting and preserving
              these invaluable pieces of human heritage.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters bar */}
      <section className=" border-none  py-4">
        <div className="mx-auto max-w-6xl px-4">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, delay: 0.15 }}
          >
            {/* Search */}
            <input
              className="rounded-none border-0 border-b border-[var(--input)] bg-[var(--background)] px-3 py-1.5 text-sm outline-none placeholder:text-[var(--muted-foreground)] w-40 sm:w-48"
              placeholder="Search languages..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Region filters */}
            {LANGUAGE_REGION_FILTERS.map((region) => (
              <button
                key={region}
                className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeRegion === region
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                }`}
                onClick={() => setActiveRegion(region)}
              >
                {region}
              </button>
            ))}

            {/* Status filters */}
            {LANGUAGE_STATUS_FILTERS.map((status) => (
              <button
                key={status}
                className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeStatus === status
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--accent)]"
                }`}
                onClick={() => setActiveStatus(status)}
              >
                {status}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Results count */}
      <section className="pt-6 pb-2">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {filtered.length} language{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </section>

      {/* Language cards grid */}
      <section className="pb-16 md:pb-20">
        <div className="mx-auto max-w-6xl px-4">
          {filtered.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {filtered.map((lang, i) => (
                <motion.div
                  key={lang.name}
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <LanguageCard lang={lang} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-lg font-medium text-[var(--muted-foreground)]">
                No languages match your filters.
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AllLanguagesPage;
