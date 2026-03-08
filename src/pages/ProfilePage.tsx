import React, { useState } from "react";
import { useProfile, useUpdateProfile, useChangePassword, useParcelles } from "@/hooks/useApi";
import { useAuthStore, useNotificationStore, type AuthUser } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, X, User, Shield, Map } from "lucide-react";

export default function ProfilePage() {
  const notify = useNotificationStore((s) => s.notify);
  const setUser = useAuthStore((s) => s.setUser);
  const storeUser = useAuthStore((s) => s.user);

  const { data: profileData, isLoading: loading } = useProfile();
  const { data: parcellesData } = useParcelles();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const user = profileData as unknown as AuthUser | undefined;
  const parcelleCount = parcellesData?.data?.length ?? 0;

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ nom: "", mail: "" });
  const [editError, setEditError] = useState("");

  const [pwForm, setPwForm] = useState({ ancien_mot_de_passe: "", nouveau_mot_de_passe: "", confirmation: "" });
  const [pwError, setPwError] = useState("");

  // Sync edit form when profile loads
  const initEditForm = () => {
    const u = user || storeUser;
    if (u) setEditForm({ nom: u.nom, mail: u.mail });
  };

  const handleUpdateProfile = async () => {
    setEditError("");
    try {
      const result = await updateProfileMutation.mutateAsync(editForm);
      const u = result as unknown as AuthUser;
      setUser(u);
      notify("success", "Profil mis à jour");
      setEditing(false);
    } catch (e: any) { setEditError(e.message); }
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
    try {
      await changePasswordMutation.mutateAsync(pwForm);
      notify("success", "Mot de passe modifié");
      setPwForm({ ancien_mot_de_passe: "", nouveau_mot_de_passe: "", confirmation: "" });
    } catch (e: any) { setPwError(e.message); }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-10 w-48 bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-52 bg-muted/50 rounded-2xl animate-pulse" />
        <div className="h-52 bg-muted/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const displayUser = user || storeUser;

  return (
    <div className="space-y-7 max-w-2xl">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="page-title">Mon profil</h1>
          <p className="text-sm text-muted-foreground">Gérez vos informations personnelles</p>
        </div>
      </div>

      {/* Info card */}
      <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Mes informations</p>
          {!editing && (
            <Button variant="ghost" size="sm" className="rounded-xl font-semibold" onClick={() => { initEditForm(); setEditing(true); }}>
              <Pencil className="w-3.5 h-3.5" /> Modifier
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            {editError && (
              <p className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 px-3 py-2.5 rounded-xl" role="alert">
                {editError}
              </p>
            )}
            <div>
              <label htmlFor="edit-nom" className="block text-sm font-medium mb-1.5 text-foreground">Nom</label>
              <input id="edit-nom" className="field-input" value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} />
            </div>
            <div>
              <label htmlFor="edit-mail" className="block text-sm font-medium mb-1.5 text-foreground">Email</label>
              <input id="edit-mail" type="email" className="field-input" value={editForm.mail} onChange={(e) => setEditForm({ ...editForm, mail: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="rounded-xl" onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Enregistrer
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => { setEditing(false); setEditError(""); }}>
                <X className="w-3.5 h-3.5" /> Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <User className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Nom</p>
                <p className="text-sm font-semibold text-foreground">{displayUser?.nom}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
              <Shield className="w-4 h-4 text-accent shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Email</p>
                <p className="text-sm font-semibold text-foreground">{displayUser?.mail}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Password card */}
      <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-5">Changer mon mot de passe</p>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwError && (
            <p className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 px-3 py-2.5 rounded-xl" role="alert">
              {pwError}
            </p>
          )}
          <div>
            <label htmlFor="pw-old" className="block text-sm font-medium mb-1.5 text-foreground">Ancien mot de passe</label>
            <input id="pw-old" type="password" className="field-input" value={pwForm.ancien_mot_de_passe} onChange={(e) => setPwForm({ ...pwForm, ancien_mot_de_passe: e.target.value })} autoComplete="current-password" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pw-new" className="block text-sm font-medium mb-1.5 text-foreground">Nouveau mot de passe</label>
              <input id="pw-new" type="password" className="field-input" value={pwForm.nouveau_mot_de_passe} onChange={(e) => setPwForm({ ...pwForm, nouveau_mot_de_passe: e.target.value })} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="pw-confirm" className="block text-sm font-medium mb-1.5 text-foreground">Confirmation</label>
              <input id="pw-confirm" type="password" className="field-input" value={pwForm.confirmation} onChange={(e) => setPwForm({ ...pwForm, confirmation: e.target.value })} autoComplete="new-password" />
            </div>
          </div>
          <div className="pt-1">
            <Button type="submit" size="sm" className="rounded-xl" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Modifier le mot de passe
            </Button>
          </div>
        </form>
      </section>

      {/* Account info */}
      <section className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-4">Mon compte</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <div className="flex items-center gap-2.5">
              <Map className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Parcelles gérées</span>
            </div>
            <span className="text-lg font-bold font-heading text-foreground">{parcelleCount}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
            <span className="text-sm text-muted-foreground">Membre depuis</span>
            <span className="text-sm font-semibold text-foreground">{displayUser?.date_inscription ? String(displayUser.date_inscription).slice(0, 10) : "—"}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
