import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

import { GetAppButtons } from "@hypa/ui/web";

export default function CtaSection() {
  const sectionRef = useRef<HTMLElement>(null);

  // Other pages link here as /#get-app; the browser can't jump there before React renders it.
  useEffect(() => {
    if (window.location.hash === "#get-app") sectionRef.current?.scrollIntoView();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 md:py-32 bg-[var(--background)] overflow-hidden"
      id="get-app"
    >
      <motion.div
        className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, margin: "-100px" }}
        whileInView={{ opacity: 1, scale: 1 }}
      >
        <h2 className="mb-10 max-w-2xl text-4xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl lg:text-6xl">
          Type in your language.
        </h2>
        <GetAppButtons />
      </motion.div>
    </section>
  );
}
