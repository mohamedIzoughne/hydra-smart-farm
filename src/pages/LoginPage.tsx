import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/stores";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER, DEMO_TOKEN, DEMO_REFRESH } from "@/lib/demo-data";
import { Leaf, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [mail, setMail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!mail || !password) { setError("Tous les champs sont requis"); return; }

    // Demo credentials bypass
    if (mail === DEMO_EMAIL && password === DEMO_PASSWORD) {
      login(DEMO_USER, DEMO_TOKEN, DEMO_REFRESH);
      navigate("/dashboard", { replace: true });
      return;
    }

    setLoading(true);
    const res = await auth.login({ mail, mot_de_passe: password });
    setLoading(false);

    if (res.error) {
      if (res.error.includes("serveur")) {
        setError("Le serveur est indisponible. Utilisez le compte démo : izourne@gmail.com / 1234568");
      } else {
        setError(res.error);
      }
      return;
    }

    if (res.access_token && res.refresh_token && res.user) {
      login(res.user as AuthUser, res.access_token, res.refresh_token);
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/[0.04] via-background to-accent/[0.03] px-4">
      <div className="w-full max-w-sm animate-enter">
        {/* Back to landing */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'accueil
          </Link>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary/[0.12] flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-bold font-heading tracking-tight text-foreground">SmartAgri</span>
        </div>

        {/* Card */}
        <div className="bg-card border border-border/80 rounded-xl p-6 shadow-sm">
          <h1 className="text-xl font-bold font-heading mb-1 text-foreground">Connexion</h1>
          <p className="text-sm text-muted-foreground mb-6">Accédez à votre exploitation</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 px-3 py-2.5 rounded-lg" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5 text-foreground">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                className="field-input"
                placeholder="vous@exemple.com"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1.5 text-foreground">
                Mot de passe
              </label>
              <input
                id="login-password"
                type="password"
                className="field-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 p-3 bg-muted/40 rounded-lg border border-dashed border-border">
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Compte démo</p>
            <p className="text-xs text-muted-foreground font-mono select-all">izourne@gmail.com / 1234568</p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline underline-offset-4 transition-colors duration-150">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
