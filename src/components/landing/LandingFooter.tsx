import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="border-t border-border/40 bg-foreground/[0.02]">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-5 md:px-10 py-10">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Leaf className="h-4 w-4 text-primary" />
          <span className="font-medium">© 2026 SmartAgri — Agriculture intelligente</span>
        </div>
        <div className="flex gap-6 text-sm font-medium text-muted-foreground">
          <Link to="/login" className="hover:text-foreground transition-colors duration-200">
            Connexion
          </Link>
          <Link to="/signup" className="hover:text-foreground transition-colors duration-200">
            Inscription
          </Link>
        </div>
      </div>
    </footer>
  );
}
