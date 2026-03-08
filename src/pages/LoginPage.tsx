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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Bold background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.04]" />
      <div className="blob top-10 -right-20 h-[400px] w-[400px] bg-primary/[0.05]" />
      <div className="blob -bottom-20 -left-20 h-[300px] w-[300px] bg-accent/[0.04]" />

      <div className="relative w-full max-w-sm animate-enter">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'accueil
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-extrabold font-heading tracking-tight text-foreground">SmartAgri</span>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-7 shadow-xl shadow-foreground/[0.03]">
          <h1 className="text-2xl font-extrabold font-heading mb-1 text-foreground">Connexion</h1>
          <p className="text-sm text-muted-foreground mb-7">Accédez à votre exploitation</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 px-3.5 py-3 rounded-xl" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5 text-foreground">Email</label>
              <input
                id="login-email"
                type="email"
                className="field-input rounded-lg"
                placeholder="vous@exemple.com"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1.5 text-foreground">Mot de passe</label>
              <input
                id="login-password"
                type="password"
                className="field-input rounded-lg"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl text-base shadow-md shadow-primary/15" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          <div className="mt-6 p-3.5 bg-muted/50 rounded-xl border border-dashed border-border">
            <p className="text-xs text-muted-foreground font-semibold mb-0.5">Compte démo</p>
            <p className="text-xs text-muted-foreground font-mono select-all">izourne@gmail.com / 1234568</p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="text-primary font-semibold hover:underline underline-offset-4 transition-colors duration-200">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
