export default function StepsSection() {
  const steps = [
    {
      num: "1",
      title: "Enable Keyboard",
      desc: "Go to your settings and enable the Hypa Keyboard on your OS.",
    },
    {
      num: "2",
      title: "Pick Your Language",
      desc: "Select the native or minority language you wish to use.",
    },
    {
      num: "3",
      title: "Start Typing",
      desc: "Communicate naturally and culturally in your local language.",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-[var(--background)]" id="guides">
      <div className="container px-4 md:px-6 mx-auto text-center max-w-5xl">
        <h2 className="mb-16 text-3xl font-semibold text-[var(--foreground)] md:mb-24 md:text-4xl">
          Get started in seconds
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="absolute left-[16%] right-[16%] top-6 -z-10 hidden h-px bg-[var(--border)] md:block" />

          {steps.map((step, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)] text-xl font-semibold text-[var(--foreground)] ring-[12px] ring-[var(--background)]">
                {step.num}
              </div>
              <h3 className="mb-3 text-xl font-semibold text-[var(--foreground)]">
                {step.title}
              </h3>
              <p className="max-w-[250px] text-xs md:text-sm leading-relaxed text-[var(--muted-foreground)]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
