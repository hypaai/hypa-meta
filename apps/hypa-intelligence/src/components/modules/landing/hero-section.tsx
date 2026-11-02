import { motion } from "framer-motion";

import { GetAppButtons } from "@hypa/ui/web";

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24 flex flex-col items-center text-center"
      id="about"
    >
      <div className="container px-4 md:px-6 flex flex-col items-center gap-6">
        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-[var(--foreground)] md:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          One app. Every language.
        </motion.h1>
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] md:text-lg"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Hypa Keyboard translates as you type, with a built-in dictionary and
          speech.
        </motion.p>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GetAppButtons />
        </motion.div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-12 w-full max-w-[280px] overflow-hidden rounded-[2.5rem] border-[10px] border-[#1C1C1E] bg-[#0a0a0a] pt-7 pb-4 shadow-2xl md:mt-16 md:max-w-[320px] md:border-[12px] dark:border-[#2C2C2E]"
          initial={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <img
            alt="Hypa Chat on Android with conversation starters"
            className="block h-auto w-full"
            src="/screenshots/app-chat.jpg"
          />
        </motion.div>
      </div>
    </section>
  );
}
