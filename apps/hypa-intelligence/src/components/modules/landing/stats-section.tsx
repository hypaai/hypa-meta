import { motion } from "framer-motion";

export default function StatsSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section
      className="relative overflow-hidden border-y border-[var(--border)] bg-[var(--muted)]/30 py-24"
      id="team"
    >
      <div className="container relative z-10 mx-auto grid grid-cols-1 items-center gap-12 px-4 md:px-6 lg:grid-cols-2">
        <motion.div
          className="max-w-xl"
          initial="hidden"
          variants={containerVariants}
          viewport={{ once: true, margin: "-100px" }}
          whileInView="visible"
        >
          <motion.h2
            className="mb-6 text-3xl font-semibold text-[var(--foreground)] md:text-5xl"
            variants={itemVariants}
          >
            Every language is a world.
          </motion.h2>
          <motion.p
            className="mb-8 text-sm leading-relaxed text-[var(--muted-foreground)] md:text-base"
            variants={itemVariants}
          >
            We provide language technology for everyone. Native quality support
            for Yoruba, Igbo, and hundreds of other world languages.
          </motion.p>
          <motion.div className="flex flex-wrap gap-3" variants={itemVariants}>
            {["Yoruba", "Igbo", "Hausa", "Swahili", "Zulu", "Amharic"].map(
              (lang) => (
                <motion.span
                  key={lang}
                  className="rounded-full border border-[var(--border)] bg-[var(--background)] px-5 py-2 text-sm font-medium text-[var(--muted-foreground)] cursor-default"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {lang}
                </motion.span>
              ),
            )}
          </motion.div>
        </motion.div>

        <div className="relative flex justify-center lg:justify-end items-center min-h-[300px]">
          <motion.div
            className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ring)]/12 blur-3xl"
            initial={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, scale: 1 }}
          />

          <div className="relative flex flex-col gap-6 w-full max-w-sm z-10">
            <motion.div
              className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl transform lg:-translate-x-12"
              initial={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg
                  fill="none"
                  height="40"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="40"
                >
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div className="mb-2 text-5xl font-semibold text-[var(--foreground)]">
                500+
              </div>
              <div className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Supported Languages
              </div>
            </motion.div>

            <motion.div
              className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl transform translate-x-4 lg:translate-x-12"
              initial={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <svg
                  fill="none"
                  height="40"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="40"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="mb-2 text-5xl font-semibold text-[var(--foreground)]">
                1M+
              </div>
              <div className="text-sm font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Active Users
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
