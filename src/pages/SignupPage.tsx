import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/lib/stores";
import { Leaf, Loader2, ArrowLeft } from "lucide-react";
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
      navigate("/dashboard", { replace: true });
    }
  };

  const update = (key: keyof typeof form, value: string) => {
    setForm({ ...form, [key]: value });
    if (errors[key]) setErrors({ ...errors, [key]: "" });
  };

  const field = (key: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label htmlFor={`signup-${key}`} className="block text-sm font-medium mb-1.5 text-foreground">
        {label}
      </label>
      <input
        id={`signup-${key}`}
        type={type}
        className={`field-input ${errors[key] ? "field-error" : ""}`}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => update(key, e.target.value)}
        autoComplete={type === "password" ? "new-password" : key === "mail" ? "email" : "name"}
      />
      {errors[key] && (
        <p className="text-xs text-destructive mt-1.5" role="alert">{errors[key]}</p>
      )}
    </div>
  );

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
          <h1 className="text-xl font-bold font-heading mb-1 text-foreground">Créer un compte</h1>
          <p className="text-sm text-muted-foreground mb-6">Commencez à gérer votre exploitation</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {globalError && (
              <div className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 px-3 py-2.5 rounded-lg" role="alert">
                {globalError}
              </div>
            )}

            {field("nom", "Nom complet", "text", "Jean Dupont")}
            {field("mail", "Email", "email", "vous@exemple.com")}
            {field("mot_de_passe", "Mot de passe", "password", "••••••••")}
            {field("confirmation", "Confirmer le mot de passe", "password", "••••••••")}

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer mon compte
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline underline-offset-4 transition-colors duration-150">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
