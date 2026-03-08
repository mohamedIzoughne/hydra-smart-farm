import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/stores";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_USER, DEMO_TOKEN, DEMO_REFRESH } from "@/lib/demo-data";
import { Leaf, Loader2 } from "lucide-react";
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
      // If backend is down and credentials don't match demo, show specific message
      if (res.error.includes("serveur")) {
        setError("Le serveur est indisponible. Utilisez le compte démo : izourne@gmail.com / 1234568");
      } else {
        setError(res.error);
      }
      return;
    }

    if (res.access_token && res.refresh_token && res.user) {
      login(res.user as AuthUser, res.access_token, res.refresh_token);
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-primary" />
          </div>
          <span className="text-lg font-bold font-heading tracking-tight text-foreground">SmartAgri</span>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h1 className="text-xl font-bold font-heading mb-1">Connexion</h1>
          <p className="text-sm text-muted-foreground mb-5">Accédez à votre exploitation</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="vous@exemple.com"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
              <input
                type="password"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          <div className="mt-4 p-3 bg-muted/50 rounded-md border border-dashed">
            <p className="text-xs text-muted-foreground font-medium mb-1">Compte démo :</p>
            <p className="text-xs text-muted-foreground font-mono">izourne@gmail.com / 1234568</p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
