import { Link } from "react-router-dom";
import { useAuthStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import {
  Leaf, Droplets, BarChart3, Map, CloudRain, ShieldCheck, ArrowRight, Sprout, Zap,
} from "lucide-react";

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

const stats = [
  { value: "30%", label: "d'eau économisée" },
  { value: "24/7", label: "surveillance active" },
  { value: "100+", label: "cultures référencées" },
];

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const isAuth = !!user;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 transition-colors duration-200 group-hover:bg-primary/15">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">
              SmartAgri
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            {isAuth ? (
              <Button asChild size="sm">
                <Link to="/dashboard">
                  Tableau de bord
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Se connecter</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Créer un compte</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
        <div className="absolute top-16 -right-40 -z-10 h-[420px] w-[420px] rounded-full bg-primary/[0.035] blur-3xl" />
        <div className="absolute top-48 -left-24 -z-10 h-72 w-72 rounded-full bg-secondary/[0.04] blur-3xl" />

        <div className="mx-auto max-w-6xl px-5 md:px-8 pb-20 pt-20 md:pt-28 lg:pt-32 text-center">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Agriculture de précision — pilotée par vos données</span>
          </div>

          <h1 className="mx-auto max-w-3xl font-heading text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Optimisez l'irrigation de{" "}
            <span className="text-primary">vos parcelles</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
            SmartAgri prédit les besoins en eau de vos cultures en croisant données climatiques,
            stades de croissance et caractéristiques de sol — pour irriguer juste ce qu'il faut.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            {isAuth ? (
              <Button size="lg" asChild className="text-base px-8 h-12">
                <Link to="/dashboard">
                  Accéder au tableau de bord
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="text-base px-8 h-12">
                  <Link to="/signup">
                    Commencer gratuitement
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base px-8 h-12">
                  <Link to="/login">J'ai déjà un compte</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-border/60 bg-card/60">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-10 px-5 py-12 md:gap-20">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-3xl font-bold text-primary md:text-4xl">{s.value}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="section-label">Fonctionnalités</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Tout ce qu'il faut pour piloter votre exploitation
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Des outils conçus pour les agriculteurs, pas pour les ingénieurs.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="group stat-card flex flex-col gap-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/[0.08] transition-colors duration-200 group-hover:bg-primary/[0.14]">
                <f.icon className="h-5 w-5 text-primary transition-transform duration-200 group-hover:scale-110" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-border/60 bg-gradient-to-b from-primary/[0.03] to-transparent">
        <div className="mx-auto max-w-3xl px-5 md:px-8 py-20 text-center md:py-28">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Prêt à économiser l'eau et améliorer vos rendements&nbsp;?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Créez votre compte en 30 secondes. Aucune carte bancaire requise.
          </p>
          <div className="mt-10">
            {isAuth ? (
              <Button size="lg" asChild className="text-base px-8 h-12">
                <Link to="/dashboard">Aller au tableau de bord</Link>
              </Button>
            ) : (
              <Button size="lg" asChild className="text-base px-8 h-12">
                <Link to="/signup">
                  Créer mon compte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3 px-5 md:px-8 py-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="h-4 w-4 text-primary" />
            <span>© 2026 SmartAgri — Agriculture intelligente</span>
          </div>
          <div className="flex gap-5 text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors duration-150">Connexion</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors duration-150">Inscription</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
