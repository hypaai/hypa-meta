import { motion } from "framer-motion";
import { MISSION_FEATURES } from "@/constants/dictionary";
import { Globe, BookOpen, Users, ArrowRight } from "@/lucide-compat";

const iconMap: Record<string, React.ReactNode> = {
  globe: <Globe className="size-5" />,
  book: <BookOpen className="size-5" />,
  community: <Users className="size-5" />,
};

const MissionSection = () => (
  <section className="border-t border-[var(--border)] bg-black text-white py-16 md:py-20">
    <div className="mx-auto max-w-6xl px-4">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.45 }}
          viewport={{ once: true, margin: "-50px" }}
          whileInView={{ opacity: 1, x: 0 }}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400">
            Our Mission
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl leading-tight text-white">
            Language is humanity&apos;s greatest inheritance
          </h2>
          <p className="mt-4 text-gray-400 leading-relaxed">
            Every language encodes unique ways of understanding the world. When
            a language disappears, we lose irreplaceable knowledge, culture, and
            identity.
          </p>
          <a
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-white hover:underline"
            href="https://hypaintelligence.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Learn about Hypa <ArrowRight className="size-4" />
          </a>
        </motion.div>

        {/* Right — mission feature cards */}
        <div className="space-y-5">
          {MISSION_FEATURES.map(({ icon, title, description }, i) => (
            <motion.div
              key={title}
              className="flex gap-4"
              initial={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.35, delay: i * 0.1 }}
              viewport={{ once: true, margin: "-30px" }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <div className="mt-0.5 shrink-0 flex size-10 items-center justify-center rounded-full border border-gray-700 bg-gray-900 text-white">
                {iconMap[icon]}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm text-gray-400 leading-relaxed">
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default MissionSection;
