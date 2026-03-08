import { Link } from "react-router-dom";
import { Leaf, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingHeader({ isAuth }: { isAuth: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-10">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-extrabold tracking-tight text-foreground">
            SmartAgri
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {isAuth ? (
            <Button asChild size="sm" className="rounded-full px-5">
              <Link to="/dashboard">
                Tableau de bord
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
                <Link to="/login">Se connecter</Link>
              </Button>
              <Button size="sm" asChild className="rounded-full px-5 shadow-md shadow-primary/20">
                <Link to="/signup">Créer un compte</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
