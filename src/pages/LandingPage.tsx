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
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-foreground">
              SmartAgri
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            {isAuth ? (
              <Button asChild>
                <Link to="/dashboard">
                  Tableau de bord
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Se connecter</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Créer un compte</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 -right-32 -z-10 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-40 -left-20 -z-10 h-60 w-60 rounded-full bg-secondary/5 blur-3xl" />

        <div className="mx-auto max-w-6xl px-5 pb-20 pt-24 md:pt-32 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Agriculture de précision — pilotée par vos données
          </div>

          <h1 className="mx-auto max-w-3xl font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Optimisez l'irrigation de{" "}
            <span className="text-primary">vos parcelles</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            SmartAgri prédit les besoins en eau de vos cultures en croisant données climatiques, 
            stades de croissance et caractéristiques de sol — pour irriguer juste ce qu'il faut.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {isAuth ? (
              <Button size="lg" asChild className="text-base px-8">
                <Link to="/dashboard">
                  Accéder au tableau de bord
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="text-base px-8">
                  <Link to="/signup">
                    Commencer gratuitement
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base px-8">
                  <Link to="/login">J'ai déjà un compte</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y bg-card">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-5 py-10 md:gap-16">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-heading text-3xl font-bold text-primary md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="section-label">Fonctionnalités</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Tout ce qu'il faut pour piloter votre exploitation
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Des outils conçus pour les agriculteurs, pas pour les ingénieurs.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group stat-card flex flex-col gap-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/8 transition-colors group-hover:bg-primary/15">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t bg-gradient-to-b from-primary/4 to-transparent">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center md:py-28">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Prêt à économiser l'eau et améliorer vos rendements ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Créez votre compte en 30 secondes. Aucune carte bancaire requise.
          </p>
          <div className="mt-8">
            {isAuth ? (
              <Button size="lg" asChild className="text-base px-8">
                <Link to="/dashboard">Aller au tableau de bord</Link>
              </Button>
            ) : (
              <Button size="lg" asChild className="text-base px-8">
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
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="h-4 w-4 text-primary" />
            <span>© 2026 SmartAgri</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <span>Agriculture intelligente</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
