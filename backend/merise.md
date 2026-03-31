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
- **Stress Hydrique** : `id_stress`, `date_calcul`, `niveau_stress` (Faible, Moyen, Élevé, Critique), `besoin_total_saison`, `capacite_source`, `deficit_calcule`, `alerte_active`, `recommandation`, `cultures_suggere`.

### Relations
- **Posséder (1,N)** : Un `Agriculteur` possède plusieurs `Parcelles`. Une `Parcelle` appartient à un seul `Agriculteur`.
- **Cultiver (0,N)** : Une `Parcelle` peut avoir une `Culture`. Une `Culture` peut être associée à plusieurs `Parcelles`.
- **Enregistrer (1,N)** : Une `Parcelle` enregistre plusieurs `Mesures Climatiques`.
- **Nécessiter (1,N)** : Une `Parcelle` génère plusieurs records de `Besoin en Eau`.
- **Lier (1,1)** : Une `Mesure Climatique` est liée à un unique `Besoin en Eau` qu'elle a permis de calculer.
- **Auditer (1,N)** : Une `Parcelle` possède plusieurs rapports de `Stress Hydrique` (audits de fin de saison).

---

## 2. Modèle Logique des Données (MLD)

Le MLD traduit le MCD en structures tabulaires prêtes pour le relationnel.

- **AGRICULTEUR** (<u>id_agriculteur</u>, nom, mail, mot_de_passe, date_inscription, actif)
- **CULTURE** (<u>id_culture</u>, nom_culture, besoin_eau_base, seuil_stress_hyd, coeff_sol_sable, coeff_sol_limon, coeff_sol_argile)
- **PARCELLE** (<u>id_parcelle</u>, #id_agriculteur, #id_culture, surface, type_de_sol, capacite_eau, latitude, longitude, saison_active, date_debut_saison)
- **MESURE_CLIMATIQUE** (<u>id_mesure</u>, #id_parcelle, date_prevision, temperature, pluie, humidite, source_api)
- **BESOIN_EAU** (<u>id_besoin</u>, #id_parcelle, #id_mesure, date_besoin, volume_recommande, volume_applique, genere_par)
- **STRESS_HYDRIQUE** (<u>id_stress</u>, #id_parcelle, date_calcul, niveau_stress, besoin_total_saison, capacite_source, deficit_calcule, alerte_active, recommandation, cultures_suggere)

---

## 3. Modèle Physique des Données (MPD)

Implémentation complète SQL (MySQL / InnoDB).

```sql
-- Table des utilisateurs
CREATE TABLE agriculteur (
    id_agriculteur  INT AUTO_INCREMENT PRIMARY KEY,
    nom             VARCHAR(100) NOT NULL,
    mail            VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe    VARCHAR(255) NOT NULL,
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
    actif           BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- Table des types de cultures
CREATE TABLE culture (
    id_culture      INT AUTO_INCREMENT PRIMARY KEY,
    nom_culture     VARCHAR(80) UNIQUE NOT NULL,
    besoin_eau_base DECIMAL(8,2) NOT NULL,
    seuil_stress_hyd DECIMAL(5,2) NOT NULL,
    coeff_sol_sable DECIMAL(4,2) DEFAULT 1.30,
    coeff_sol_limon DECIMAL(4,2) DEFAULT 1.00,
    coeff_sol_argile DECIMAL(4,2) DEFAULT 0.75
) ENGINE=InnoDB;

-- Table des parcelles
CREATE TABLE parcelle (
    id_parcelle     INT AUTO_INCREMENT PRIMARY KEY,
    id_agriculteur  INT NOT NULL,
    id_culture      INT NULL,
    surface         DECIMAL(10,2) NOT NULL,
    type_de_sol     ENUM('Sable', 'Limon', 'Argile') NOT NULL,
    capacite_eau    DECIMAL(10,2) NOT NULL,
    latitude        DECIMAL(11,8),
    longitude       DECIMAL(11,8),
    saison_active   BOOLEAN DEFAULT FALSE,
    date_debut_saison DATE NULL,
    CONSTRAINT fk_parcelle_agriculteur FOREIGN KEY (id_agriculteur) REFERENCES agriculteur(id_agriculteur) ON DELETE RESTRICT,
    CONSTRAINT fk_parcelle_culture FOREIGN KEY (id_culture) REFERENCES culture(id_culture) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Table des données météo par parcelle
CREATE TABLE mesure_climatique (
    id_mesure       INT AUTO_INCREMENT PRIMARY KEY,
    id_parcelle     INT NOT NULL,
    date_prevision  DATE NOT NULL,
    temperature     DECIMAL(5,2) NOT NULL,
    pluie           DECIMAL(7,2) NOT NULL,
    humidite        DECIMAL(5,2) NULL,
    source_api      VARCHAR(50) DEFAULT 'OpenMeteo',
    CONSTRAINT uq_mesure_parcelle_date UNIQUE (id_parcelle, date_prevision),
    CONSTRAINT fk_mesure_parcelle FOREIGN KEY (id_parcelle) REFERENCES parcelle(id_parcelle) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Table des calculs d'irrigation recommandés
CREATE TABLE besoin_eau (
    id_besoin           INT AUTO_INCREMENT PRIMARY KEY,
    id_parcelle         INT NOT NULL,
    id_mesure           INT NOT NULL,
    date_besoin         DATE NOT NULL,
    volume_recommande   DECIMAL(10,2) NOT NULL,
    volume_applique     DECIMAL(10,2) NULL,
    genere_par          ENUM('Système', 'Manuel') DEFAULT 'Système',
    CONSTRAINT uq_besoin_parcelle_date UNIQUE (id_parcelle, date_besoin),
    CONSTRAINT fk_besoin_parcelle FOREIGN KEY (id_parcelle) REFERENCES parcelle(id_parcelle) ON DELETE CASCADE,
    CONSTRAINT fk_besoin_mesure FOREIGN KEY (id_mesure) REFERENCES mesure_climatique(id_mesure) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Table des bilans de stress hydrique
CREATE TABLE stress_hydrique (
    id_stress           INT AUTO_INCREMENT PRIMARY KEY,
    id_parcelle         INT NOT NULL,
    date_calcul         DATE NOT NULL DEFAULT (CURDATE()),
    niveau_stress       ENUM('Faible', 'Moyen', 'Élevé', 'Critique') NOT NULL,
    besoin_total_saison DECIMAL(12,2) NOT NULL,
    capacite_source     DECIMAL(10,2) NOT NULL,
    deficit_calcule     DECIMAL(12,2) NOT NULL,
    alerte_active       BOOLEAN DEFAULT FALSE,
    recommandation      TEXT NULL,
    cultures_suggere    TEXT NULL,
    CONSTRAINT fk_stress_parcelle FOREIGN KEY (id_parcelle) REFERENCES parcelle(id_parcelle) ON DELETE CASCADE
) ENGINE=InnoDB;
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

### Triggers et Procédures
- **`trg_calcul_besoin_eau`** : Automatise la création d'un record `besoin_eau` dès qu'une `mesure_climatique` est insérée pour une parcelle active.
- **`trg_ouverture_saison`** : Bloque l'activation d'une saison si aucune culture n'est sélectionnée.
- **`sp_audit_fin_saison`** (SQL) / **`calcul_stress_hydrique`** (Python) : Réalise le bilan complet de la saison lors de sa clôture.
- **`trg_alerte_stress`** : Calcule le ratio déficit/seuil pour catégoriser le niveau de stress.

---

## 5. Workflow du Projet

1. **Configuration** : L'agriculteur crée son profil et ses parcelles avec leurs caractéristiques physiques (sol, surface, localisation).
2. **Cycle Cultural** : Sélection d'une culture et ouverture de la saison (`date_debut_saison`).
3. **Automatisation Quotidienne** :
    - À **04h00**, le backend récupère les prévisions météo du jour pour chaque parcelle active.
    - Les mesures sont stockées et déclenchent le calcul du volume d'eau à apporter.
4. **Gestion de l'Irrigation** : L'agriculteur reçoit ses recommandations et peut consigner l'eau réellement apportée via l'interface.
5. **Analyse de Fin de Saison** : À la clôture, un audit de stress hydrique est généré. Si le déficit était trop élevé, le système suggère des cultures plus adaptées aux ressources en eau de la parcelle.
