import { Link } from "react-router-dom";
import { ArrowRight, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingHero({ isAuth }: { isAuth: boolean }) {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="blob -top-20 -right-32 h-[500px] w-[500px] bg-primary/[0.06] animate-float" />
      <div className="blob top-40 -left-20 h-[350px] w-[350px] bg-accent/[0.05]" style={{ animationDelay: '2s', animation: 'float 8s ease-in-out infinite' }} />
      <div className="blob bottom-10 right-1/4 h-[200px] w-[200px] bg-secondary/[0.04]" style={{ animationDelay: '4s', animation: 'float 7s ease-in-out infinite' }} />

      {/* Gradient backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-5 md:px-10 pb-24 pt-24 md:pt-32 lg:pt-40">
        <div className="stagger-in flex flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/[0.06] px-5 py-2 text-sm font-medium text-primary">
            <Droplets className="h-4 w-4" />
            <span>Agriculture de précision — pilotée par vos données</span>
          </div>

          {/* Headline - dramatic scale */}
          <h1 className="mx-auto max-w-5xl font-heading text-5xl font-black leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            Optimisez{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                l'irrigation
              </span>
              <span className="absolute -bottom-2 left-0 right-0 h-3 bg-primary/10 rounded-full -skew-x-3" />
            </span>
            <br className="hidden sm:block" />
            {" "}de vos parcelles
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl lg:text-2xl lg:leading-relaxed">
            SmartAgri prédit les besoins en eau de vos cultures en croisant données climatiques,
            stades de croissance et caractéristiques de sol.
          </p>

          {/* CTAs */}
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
            {isAuth ? (
              <Button size="lg" asChild className="text-base px-10 h-14 rounded-full shadow-lg shadow-primary/25 text-lg">
                <Link to="/dashboard">
                  Accéder au tableau de bord
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="text-base px-10 h-14 rounded-full shadow-lg shadow-primary/25 text-lg">
                  <Link to="/signup">
                    Commencer gratuitement
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base px-10 h-14 rounded-full text-lg border-2">
                  <Link to="/login">J'ai déjà un compte</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
