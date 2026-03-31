# Conception MERISE - Hydra Smart Farm

Ce document détaille la conception de la base de données et les workflows du backend **Hydra Smart Farm**.

---

## 1. Modèle Conceptuel des Données (MCD)

Le MCD représente les entités et leurs relations sans contraintes techniques.

### Entités et Attributs
- **Agriculteur** : `id_agriculteur`, `nom`, `mail`, `mot_de_passe`, `date_inscription`, `actif`.
- **Culture** : `id_culture`, `nom_culture`, `besoin_eau_base`, `seuil_stress_hyd`, `coeff_sol_sable`, `coeff_sol_limon`, `coeff_sol_argile`.
- **Parcelle** : `id_parcelle`, `surface`, `type_de_sol` (Sable, Limon, Argile), `capacite_eau`, `latitude`, `longitude`, `saison_active`, `date_debut_saison`.
- **Mesure Climatique** : `id_mesure`, `date_prevision`, `temperature`, `pluie`, `humidite`, `source_api`.
- **Besoin en Eau** : `id_besoin`, `date_besoin`, `volume_recommande`, `volume_applique`, `genere_par` (Système, Manuel).
- **Stress Hydrique** : `id_stress`, `date_calcul`, `niveau_stress`, `besoin_total_saison`, `capacite_source`, `deficit_calcule`, `alerte_active`, `recommandation`, `cultures_suggere`.

### Relations
- **Posséder** : Un `Agriculteur` possède plusieurs `Parcelles` (1,N). Une `Parcelle` appartient à un seul `Agriculteur` (1,1).
- **Cultiver** : Une `Parcelle` peut avoir une `Culture` (0,1). Une `Culture` peut être associée à plusieurs `Parcelles` (0,N).
- **Enregistrer** : Une `Parcelle` possède plusieurs `Mesures Climatiques` (1,N).
- **Nécessiter** : Une `Parcelle` possède plusieurs records de `Besoin en Eau` (1,N).
- **Lier** : Une `Mesure Climatique` génère un unique `Besoin en Eau` (1,1).
- **Auditer** : Une `Parcelle` possède plusieurs rapports de `Stress Hydrique` (1,N), généralement générés en fin de saison.

---

## 2. Modèle Logique des Données (MLD)

Le MLD traduit le MCD en structures tabulaires.

- **AGRICULTEUR** (<u>id_agriculteur</u>, nom, mail, mot_de_passe, date_inscription, actif)
- **CULTURE** (<u>id_culture</u>, nom_culture, besoin_eau_base, seuil_stress_hyd, coeff_sol_sable, coeff_sol_limon, coeff_sol_argile)
- **PARCELLE** (<u>id_parcelle</u>, #id_agriculteur, #id_culture, surface, type_de_sol, capacite_eau, latitude, longitude, saison_active, date_debut_saison)
- **MESURE_CLIMATIQUE** (<u>id_mesure</u>, #id_parcelle, date_prevision, temperature, pluie, humidite, source_api)
- **BESOIN_EAU** (<u>id_besoin</u>, #id_parcelle, #id_mesure, date_besoin, volume_recommande, volume_applique, genere_par)
- **STRESS_HYDRIQUE** (<u>id_stress</u>, #id_parcelle, date_calcul, niveau_stress, besoin_total_saison, capacite_source, deficit_calcule, alerte_active, recommandation, cultures_suggere)

---

## 3. Modèle Physique des Données (MPD)

Implémentation SQL (MySQL / InnoDB).

```sql
CREATE TABLE agriculteur (
    id_agriculteur INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    mail VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
    actif BOOLEAN DEFAULT TRUE
);

CREATE TABLE culture (
    id_culture INT AUTO_INCREMENT PRIMARY KEY,
    nom_culture VARCHAR(80) UNIQUE NOT NULL,
    besoin_eau_base DECIMAL(8,2) NOT NULL,
    seuil_stress_hyd DECIMAL(5,2) NOT NULL,
    coeff_sol_sable DECIMAL(4,2) DEFAULT 1.30,
    coeff_sol_limon DECIMAL(4,2) DEFAULT 1.00,
    coeff_sol_argile DECIMAL(4,2) DEFAULT 0.75
);

CREATE TABLE parcelle (
    id_parcelle INT AUTO_INCREMENT PRIMARY KEY,
    id_agriculteur INT NOT NULL,
    id_culture INT,
    surface DECIMAL(10,2) NOT NULL,
    type_de_sol ENUM('Sable', 'Limon', 'Argile') NOT NULL,
    capacite_eau DECIMAL(10,2) NOT NULL,
    latitude DECIMAL(11,8),
    longitude DECIMAL(11,8),
    saison_active BOOLEAN DEFAULT FALSE,
    date_debut_saison DATE,
    FOREIGN KEY (id_agriculteur) REFERENCES agriculteur(id_agriculteur),
    FOREIGN KEY (id_culture) REFERENCES culture(id_culture)
);

-- (Autres tables : mesure_climatique, besoin_eau, stress_hydrique avec FK vers parcelle)
```

---

## 4. Services et Logique Métier

### Services Principaux
- **`WeatherService`** : Interface avec l'API Open-Meteo pour récupérer les prévisions et historiques climatiques basés sur les coordonnées GPS.
- **`CalculService`** :
    - **Calcul du volume d'eau** : Utilise la formule `(BesoinBase + AjustementThermique) * CoeffSol - Pluie`.
    - **Ajustement Thermique** : Augmente le besoin de 8% si T > 28°C et de 15% si T > 35°C.
    - **Simulation de Stress** : Calcule le cumul des besoins recommandés vs la capacité réelle de la parcelle.
- **`ParcelleService`** : Gère le cycle de vie des parcelles, les validations et l'agrégation de données contextuelles.

### Triggers et Procédures (SQL & Python)
- **`trg_calcul_besoin_eau`** : Se déclenche après chaque insertion dans `mesure_climatique` pour générer automatiquement le `besoin_eau` du lendemain.
- **`trg_ouverture_saison`** : Vérifie qu'une culture est bien assignée avant d'activer une saison.
- **`sp_audit_fin_saison`** : Procédure stockée qui calcule le bilan hydrique total lors de la clôture de la saison.
- **`trg_alerte_stress`** : Détermine le niveau de stress (Faible, Moyen, Élevé, Critique) en fonction du déficit calculé.

---

## 5. Workflow du Projet

1. **Initialisation** : L'agriculteur crée son compte et définit ses parcelles (surface, type de sol, coordonnées).
2. **Lancement de Saison** : L'agriculteur sélectionne une culture et active la saison sur une parcelle.
3. **Synchronisation Quotidienne (04h00)** :
    - Le scheduler (`APScheduler`) parcourt toutes les parcelles actives.
    - Il récupère la météo du jour via `WeatherService`.
    - Il enregistre la `Mesure Climatique`.
    - Le système calcule automatiquement le `Besoin en Eau` recommandé pour le lendemain.
4. **Suivi** : L'agriculteur consulte son tableau de bord, voit les recommandations d'irrigation et peut déclarer le volume réellement appliqué.
5. **Clôture et Audit** : En fin de récolte, la saison est désactivée. Un rapport de `Stress Hydrique` est généré, incluant des recommandations de cultures alternatives si un déficit important a été constaté.
