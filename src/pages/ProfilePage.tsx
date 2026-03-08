import React, { useEffect, useState } from "react";
import { auth, parcelles as parcellesApi } from "@/lib/api";
import { useAuthStore, useNotificationStore, type AuthUser } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, X } from "lucide-react";

export default function ProfilePage() {
  const notify = useNotificationStore((s) => s.notify);
  const setUser = useAuthStore((s) => s.setUser);
  const storeUser = useAuthStore((s) => s.user);

  const [user, setLocalUser] = useState<AuthUser | null>(null);
  const [parcelleCount, setParcelleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit profile
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nom: "", mail: "" });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Change password
  const [pwForm, setPwForm] = useState({ ancien_mot_de_passe: "", nouveau_mot_de_passe: "", confirmation: "" });
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    const [meRes, pRes] = await Promise.all([auth.me(), parcellesApi.getAll()]);
    if (meRes.data) {
      const u = meRes.data as AuthUser;
      setLocalUser(u);
      setEditForm({ nom: u.nom, mail: u.mail });
    }
    if (pRes.data) setParcelleCount((pRes.data as unknown[]).length);
    setLoading(false);
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdateProfile = async () => {
    setEditError("");
    setEditLoading(true);
    const res = await auth.updateProfile(editForm);
    setEditLoading(false);
    if (res.error) { setEditError(res.error); return; }
    if (res.data) {
      const u = res.data as AuthUser;
      setLocalUser(u);
      setUser(u);
    }
    notify("success", "Profil mis à jour");
    setEditing(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (!pwForm.ancien_mot_de_passe || !pwForm.nouveau_mot_de_passe || !pwForm.confirmation) {
      setPwError("Tous les champs sont requis");
      return;
    }
    if (pwForm.nouveau_mot_de_passe.length < 8) {
      setPwError("Le nouveau mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (pwForm.nouveau_mot_de_passe !== pwForm.confirmation) {
      setPwError("Les mots de passe ne correspondent pas");
      return;
    }
    setPwLoading(true);
    const res = await auth.changePassword(pwForm);
    setPwLoading(false);
    if (res.error) { setPwError(res.error); return; }
    notify("success", "Mot de passe modifié");
    setPwForm({ ancien_mot_de_passe: "", nouveau_mot_de_passe: "", confirmation: "" });
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="h-8 w-40 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  const displayUser = user || storeUser;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Mon profil</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérez vos informations personnelles</p>
      </div>

      {/* Info card */}
      <section className="bg-card border border-border/80 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="section-label !mb-0">Mes informations</p>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" /> Modifier
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            {editError && (
              <p className="text-sm text-destructive bg-destructive/[0.08] px-3 py-2 rounded-lg" role="alert">
                {editError}
              </p>
            )}
            <div>
              <label htmlFor="edit-nom" className="block text-sm font-medium mb-1.5 text-foreground">Nom</label>
              <input
                id="edit-nom"
                className="field-input"
                value={editForm.nom}
                onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="edit-mail" className="block text-sm font-medium mb-1.5 text-foreground">Email</label>
              <input
                id="edit-mail"
                type="email"
                className="field-input"
                value={editForm.mail}
                onChange={(e) => setEditForm({ ...editForm, mail: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleUpdateProfile} disabled={editLoading}>
                {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Enregistrer
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditError(""); }}>
                <X className="w-3.5 h-3.5" /> Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
            <span className="text-muted-foreground">Nom</span>
            <span className="font-medium text-foreground">{displayUser?.nom}</span>
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium text-foreground">{displayUser?.mail}</span>
            <span className="text-muted-foreground">Inscrit le</span>
            <span className="text-foreground">{displayUser?.date_inscription ? String(displayUser.date_inscription).slice(0, 10) : "—"}</span>
          </div>
        )}
      </section>

      {/* Password card */}
      <section className="bg-card border border-border/80 rounded-xl p-5">
        <p className="section-label">Changer mon mot de passe</p>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {pwError && (
            <p className="text-sm text-destructive bg-destructive/[0.08] px-3 py-2 rounded-lg" role="alert">
              {pwError}
            </p>
          )}
          <div>
            <label htmlFor="pw-old" className="block text-sm font-medium mb-1.5 text-foreground">Ancien mot de passe</label>
            <input
              id="pw-old"
              type="password"
              className="field-input"
              value={pwForm.ancien_mot_de_passe}
              onChange={(e) => setPwForm({ ...pwForm, ancien_mot_de_passe: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="pw-new" className="block text-sm font-medium mb-1.5 text-foreground">Nouveau mot de passe</label>
              <input
                id="pw-new"
                type="password"
                className="field-input"
                value={pwForm.nouveau_mot_de_passe}
                onChange={(e) => setPwForm({ ...pwForm, nouveau_mot_de_passe: e.target.value })}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="pw-confirm" className="block text-sm font-medium mb-1.5 text-foreground">Confirmation</label>
              <input
                id="pw-confirm"
                type="password"
                className="field-input"
                value={pwForm.confirmation}
                onChange={(e) => setPwForm({ ...pwForm, confirmation: e.target.value })}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="pt-1">
            <Button type="submit" size="sm" disabled={pwLoading}>
              {pwLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Modifier le mot de passe
            </Button>
          </div>
        </form>
      </section>

      {/* Account info */}
      <section className="bg-card border border-border/80 rounded-xl p-5">
        <p className="section-label">Mon compte</p>
        <div className="text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Parcelles gérées</span>
            <span className="font-medium text-foreground">{parcelleCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Membre depuis</span>
            <span className="text-foreground">{displayUser?.date_inscription ? String(displayUser.date_inscription).slice(0, 10) : "—"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
