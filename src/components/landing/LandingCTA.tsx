import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingCTA({ isAuth }: { isAuth: boolean }) {
  return (
    <section className="relative overflow-hidden">
      {/* Bold green background band */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent" />
      <div className="blob top-0 right-0 h-[300px] w-[300px] bg-accent/30" />
      <div className="blob bottom-0 left-0 h-[250px] w-[250px] bg-primary-glow/20" />

      <div className="relative mx-auto max-w-4xl px-5 md:px-10 py-24 text-center md:py-32">
        <h2 className="font-heading text-4xl font-extrabold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
          Prêt à économiser l'eau
          <br />
          et améliorer vos rendements ?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/80 leading-relaxed">
          Créez votre compte en 30 secondes. Aucune carte bancaire requise.
        </p>
        <div className="mt-10">
          {isAuth ? (
            <Button size="lg" variant="secondary" asChild className="text-lg px-10 h-14 rounded-full shadow-xl font-bold">
              <Link to="/dashboard">Aller au tableau de bord</Link>
            </Button>
          ) : (
            <Button size="lg" variant="secondary" asChild className="text-lg px-10 h-14 rounded-full shadow-xl font-bold">
              <Link to="/signup">
                Créer mon compte
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
