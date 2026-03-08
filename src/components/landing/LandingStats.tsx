const stats = [
  { value: "30%", label: "d'eau économisée", accent: "text-primary" },
  { value: "24/7", label: "surveillance active", accent: "text-accent" },
  { value: "100+", label: "cultures référencées", accent: "text-secondary" },
];

export default function LandingStats() {
  return (
    <section className="relative border-y border-border/40 bg-foreground/[0.02]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-12 px-5 py-16 md:gap-24 lg:gap-32">
        {stats.map((s) => (
          <div key={s.label} className="text-center group">
            <p className={`font-heading text-5xl font-black tracking-tight md:text-6xl ${s.accent} transition-transform duration-300 group-hover:scale-110`}>
              {s.value}
            </p>
            <p className="mt-2 text-sm font-medium text-muted-foreground tracking-wide uppercase">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
