import { Map, Droplets, CloudRain, BarChart3, Sprout, Zap } from "lucide-react";

const features = [
  {
    icon: Map,
    title: "Gestion des parcelles",
    desc: "Cartographiez et suivez chaque parcelle avec ses cultures, surfaces et historiques de rendement.",
  },
  {
    icon: Droplets,
    title: "Besoins en eau",
    desc: "Calcul automatique des besoins hydriques selon le stade de croissance et les conditions météo.",
  },
  {
    icon: CloudRain,
    title: "Données climatiques",
    desc: "Intégration des mesures de température, humidité et précipitations en temps réel.",
  },
  {
    icon: BarChart3,
    title: "Alertes intelligentes",
    desc: "Recevez des alertes de stress hydrique avant que vos cultures ne soient impactées.",
  },
  {
    icon: Sprout,
    title: "Suivi des cultures",
    desc: "Bibliothèque complète de cultures avec coefficients Kc et phases de croissance.",
  },
  {
    icon: Zap,
    title: "Décisions éclairées",
    desc: "Tableaux de bord et indicateurs pour optimiser l'irrigation et réduire le gaspillage.",
  },
];

export default function LandingFeatures() {
  return (
    <section className="mx-auto max-w-7xl px-5 md:px-10 py-24 md:py-32">
      <div className="text-center mb-16">
        <p className="section-label text-primary !tracking-[0.15em]">Fonctionnalités</p>
        <h2 className="font-heading text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl">
          Tout ce qu'il faut pour
          <br className="hidden sm:block" />
          <span className="text-primary"> piloter votre exploitation</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground leading-relaxed">
          Des outils conçus pour les agriculteurs, pas pour les ingénieurs.
        </p>
      </div>

      <div className="stagger-in grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="group feature-card">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.08] transition-all duration-300 group-hover:bg-primary/[0.15] group-hover:scale-110">
              <f.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="mt-5">
              <h3 className="font-heading text-xl font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
