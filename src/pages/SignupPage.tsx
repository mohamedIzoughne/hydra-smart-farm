import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/stores";
import { Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ nom: "", mail: "", mot_de_passe: "", confirmation: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.nom.trim()) e.nom = "Requis";
    if (!form.mail.trim()) e.mail = "Requis";
    if (!form.mot_de_passe) e.mot_de_passe = "Requis";
    else if (form.mot_de_passe.length < 8) e.mot_de_passe = "8 caractères minimum";
    if (!form.confirmation) e.confirmation = "Requis";
    else if (form.mot_de_passe !== form.confirmation) e.confirmation = "Les mots de passe ne correspondent pas";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    if (!validate()) return;

    setLoading(true);
    const res = await auth.signup({ nom: form.nom, mail: form.mail, mot_de_passe: form.mot_de_passe });
    setLoading(false);

    if (res.error) {
      if (res.error.includes("déjà utilisé") || res.error.includes("409")) {
        setErrors({ mail: "Cet email est déjà utilisé" });
      } else {
        setGlobalError(res.error);
      }
      return;
    }

    if (res.access_token && res.refresh_token && res.user) {
      login(res.user as AuthUser, res.access_token, res.refresh_token);
      navigate("/", { replace: true });
    }
  };

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        type={type}
        className={`w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring ${errors[key] ? "border-destructive" : ""}`}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setErrors({ ...errors, [key]: "" }); }}
        autoComplete={type === "password" ? "new-password" : key === "mail" ? "email" : "name"}
      />
      {errors[key] && <p className="text-xs text-destructive mt-1">{errors[key]}</p>}
    </div>
  );

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
          <h1 className="text-xl font-bold font-heading mb-1">Créer un compte</h1>
          <p className="text-sm text-muted-foreground mb-5">Commencez à gérer votre exploitation</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {globalError && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded">
                {globalError}
              </div>
            )}

            {field("nom", "Nom complet", "text", "Jean Dupont")}
            {field("mail", "Email", "email", "vous@exemple.com")}
            {field("mot_de_passe", "Mot de passe", "password", "••••••••")}
            {field("confirmation", "Confirmer le mot de passe", "password", "••••••••")}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer mon compte
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
