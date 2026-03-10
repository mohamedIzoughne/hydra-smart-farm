-- ============================================================
-- SmartAgri-Predict — Database Initialization Script
-- ============================================================

CREATE DATABASE IF NOT EXISTS smartagri CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartagri;

-- ============================================================
-- 1. TABLES (dependency order)
-- ============================================================

CREATE TABLE IF NOT EXISTS agriculteur (
    id_agriculteur  INT             AUTO_INCREMENT PRIMARY KEY,
    nom             VARCHAR(100)    NOT NULL,
    mail            VARCHAR(150)    NOT NULL,
    mot_de_passe    VARCHAR(255)    NOT NULL,
    date_inscription DATETIME       DEFAULT CURRENT_TIMESTAMP,
    actif           BOOLEAN         DEFAULT TRUE,
    CONSTRAINT uq_agriculteur_mail UNIQUE (mail)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS culture (
    id_culture      INT             AUTO_INCREMENT PRIMARY KEY,
    nom_culture     VARCHAR(80)     NOT NULL,
    besoin_eau_base DECIMAL(8,2)    NOT NULL,
    seuil_stress_hyd DECIMAL(5,2)   NOT NULL,
    coeff_sol_sable DECIMAL(4,2)    DEFAULT 1.30,
    coeff_sol_limon DECIMAL(4,2)    DEFAULT 1.00,
    coeff_sol_argile DECIMAL(4,2)   DEFAULT 0.75,
    CONSTRAINT uq_culture_nom       UNIQUE (nom_culture),
    CONSTRAINT ck_culture_besoin_pos CHECK (besoin_eau_base > 0),
    CONSTRAINT ck_culture_seuil_range CHECK (seuil_stress_hyd >= 0 AND seuil_stress_hyd <= 100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parcelle (
    id_parcelle     INT             AUTO_INCREMENT PRIMARY KEY,
    id_agriculteur  INT             NOT NULL,
    id_culture      INT             NULL,
    surface         DECIMAL(10,2)   NOT NULL,
    type_de_sol     ENUM('Sable','Limon','Argile') NOT NULL,
    capacite_eau    DECIMAL(10,2)   NOT NULL,
    latitude        DECIMAL(11,8)    NULL,
    longitude       DECIMAL(11,8)    NULL,
    saison_active   BOOLEAN         DEFAULT FALSE,
    date_debut_saison DATE          NULL,
    CONSTRAINT ck_parcelle_surface_pos  CHECK (surface > 0),
    CONSTRAINT ck_parcelle_capacite_pos CHECK (capacite_eau > 0),
    CONSTRAINT fk_parcelle_agriculteur
        FOREIGN KEY (id_agriculteur) REFERENCES agriculteur(id_agriculteur)
        ON DELETE RESTRICT,
    CONSTRAINT fk_parcelle_culture
        FOREIGN KEY (id_culture) REFERENCES culture(id_culture)
        ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mesure_climatique (
    id_mesure       INT             AUTO_INCREMENT PRIMARY KEY,
    id_parcelle     INT             NOT NULL,
    date_prevision  DATE            NOT NULL,
    temperature     DECIMAL(5,2)    NOT NULL,
    pluie           DECIMAL(7,2)    NOT NULL,
    humidite        DECIMAL(5,2)    NULL,
    source_api      VARCHAR(50)     DEFAULT 'OpenMeteo',
    CONSTRAINT ck_mesure_temp_range CHECK (temperature BETWEEN -50 AND 60),
    CONSTRAINT ck_mesure_pluie_pos  CHECK (pluie >= 0),
    CONSTRAINT ck_mesure_humidite   CHECK (humidite IS NULL OR (humidite >= 0 AND humidite <= 100)),
    CONSTRAINT uq_mesure_parcelle_date UNIQUE (id_parcelle, date_prevision),
    CONSTRAINT fk_mesure_parcelle
        FOREIGN KEY (id_parcelle) REFERENCES parcelle(id_parcelle)
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS besoin_eau (
    id_besoin           INT             AUTO_INCREMENT PRIMARY KEY,
    id_parcelle         INT             NOT NULL,
    id_mesure           INT             NOT NULL,
    date_besoin         DATE            NOT NULL,
    volume_recommande   DECIMAL(10,2)   NOT NULL,
    volume_applique     DECIMAL(10,2)   NULL,
    genere_par          ENUM('Système','Manuel') DEFAULT 'Système',
    CONSTRAINT uq_besoin_parcelle_date UNIQUE (id_parcelle, date_besoin),
    CONSTRAINT fk_besoin_parcelle
        FOREIGN KEY (id_parcelle) REFERENCES parcelle(id_parcelle)
        ON DELETE CASCADE,
    CONSTRAINT fk_besoin_mesure
        FOREIGN KEY (id_mesure) REFERENCES mesure_climatique(id_mesure)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stress_hydrique (
    id_stress           INT             AUTO_INCREMENT PRIMARY KEY,
    id_parcelle         INT             NOT NULL,
    date_calcul         DATE            NOT NULL DEFAULT (CURDATE()),
    niveau_stress       ENUM('Faible','Moyen','Élevé','Critique') NOT NULL,
    besoin_total_saison DECIMAL(12,2)   NOT NULL,
    capacite_source     DECIMAL(10,2)   NOT NULL,
    deficit_calcule     DECIMAL(12,2)   NOT NULL,
    alerte_active       BOOLEAN         DEFAULT FALSE,
    recommandation      TEXT            NULL,
    cultures_suggere    TEXT            NULL,
    CONSTRAINT fk_stress_parcelle
        FOREIGN KEY (id_parcelle) REFERENCES parcelle(id_parcelle)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_parcelle_agri      ON parcelle(id_agriculteur);
CREATE INDEX idx_parcelle_saison    ON parcelle(saison_active);
CREATE INDEX idx_mesure_parc_date   ON mesure_climatique(id_parcelle, date_prevision DESC);
CREATE INDEX idx_besoin_parc_date   ON besoin_eau(id_parcelle, date_besoin DESC);
CREATE INDEX idx_culture_besoin     ON culture(besoin_eau_base ASC);

-- ============================================================
-- 3. STORED PROCEDURES
-- ============================================================

DELIMITER //

-- sp_suggerer_cultures: find lower-water cultures that fit within capacity
CREATE PROCEDURE sp_suggerer_cultures(IN p_id_parcelle INT)
BEGIN
    DECLARE v_capacite_eau  DECIMAL(10,2);
    DECLARE v_duree_saison  INT;
    DECLARE v_id_culture    INT;

    SELECT capacite_eau,
           DATEDIFF(CURDATE(), date_debut_saison),
           id_culture
       INTO v_capacite_eau, v_duree_saison, v_id_culture
       FROM parcelle
     WHERE id_parcelle = p_id_parcelle;

    IF v_duree_saison IS NULL OR v_duree_saison <= 0 THEN
        SET v_duree_saison = 1;
    END IF;

    SELECT GROUP_CONCAT(nom_culture ORDER BY besoin_eau_base ASC SEPARATOR ', ')
       FROM culture
     WHERE besoin_eau_base * v_duree_saison < v_capacite_eau
       AND id_culture != COALESCE(v_id_culture, 0);
END //

-- sp_audit_fin_saison: aggregate season data and create stress record
CREATE PROCEDURE sp_audit_fin_saison(IN p_id_parcelle INT)
BEGIN
    DECLARE v_besoin_total  DECIMAL(12,2) DEFAULT 0;
    DECLARE v_capacite      DECIMAL(10,2);
    DECLARE v_deficit       DECIMAL(12,2);
    DECLARE v_seuil_pct     DECIMAL(5,2);
    DECLARE v_seuil_abs     DECIMAL(12,2);
    DECLARE v_date_debut    DATE;
    DECLARE v_id_culture    INT;
    DECLARE v_recommandation TEXT DEFAULT NULL;
    DECLARE v_suggestions   TEXT DEFAULT NULL;

    -- Read parcelle info
    SELECT capacite_eau, date_debut_saison, id_culture
       INTO v_capacite, v_date_debut, v_id_culture
       FROM parcelle
     WHERE id_parcelle = p_id_parcelle;

    -- Aggregate recommended volume for the season
    SELECT COALESCE(SUM(volume_recommande), 0)
       INTO v_besoin_total
       FROM besoin_eau
     WHERE id_parcelle = p_id_parcelle
        AND date_besoin >= v_date_debut;

    -- Compute deficit
    SET v_deficit = GREATEST(v_besoin_total - v_capacite, 0);

    -- Read stress threshold from culture
    SELECT COALESCE(seuil_stress_hyd, 50)
       INTO v_seuil_pct
       FROM culture
     WHERE id_culture = v_id_culture;

    SET v_seuil_abs = v_capacite * (v_seuil_pct / 100);

    -- If deficit exceeds threshold, build recommendations
    IF v_deficit > v_seuil_abs THEN
        -- Get suggested cultures
        SELECT GROUP_CONCAT(nom_culture ORDER BY besoin_eau_base ASC SEPARATOR ', ')
           INTO v_suggestions
           FROM culture
         WHERE besoin_eau_base * GREATEST(DATEDIFF(CURDATE(), v_date_debut), 1) < v_capacite
           AND id_culture != COALESCE(v_id_culture, 0);

        SET v_recommandation = CONCAT(
            'Déficit hydrique détecté: ', ROUND(v_deficit, 2), ' L. ',
            'Capacité source: ', ROUND(v_capacite, 2), ' L. ',
            'Envisagez des cultures moins gourmandes en eau.'
        );
    END IF;

    -- Insert stress record (trg_alerte_stress will set niveau_stress and alerte_active)
    INSERT INTO stress_hydrique (
        id_parcelle, date_calcul, niveau_stress,
        besoin_total_saison, capacite_source, deficit_calcule,
        alerte_active, recommandation, cultures_suggere
    ) VALUES (
        p_id_parcelle, CURDATE(), 'Faible',
        v_besoin_total, v_capacite, v_deficit,
        FALSE, v_recommandation, v_suggestions
    );
END //

DELIMITER ;

-- ============================================================
-- 4. TRIGGERS
-- ============================================================

DELIMITER //

-- trg_ouverture_saison: validate culture before activating season
CREATE TRIGGER trg_ouverture_saison
BEFORE UPDATE ON parcelle
FOR EACH ROW
BEGIN
    IF OLD.saison_active = FALSE AND NEW.saison_active = TRUE THEN
        IF NEW.id_culture IS NULL THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Impossible d''activer la saison sans culture assignée.';
        END IF;
        IF NEW.date_debut_saison IS NULL THEN
            SET NEW.date_debut_saison = CURDATE();
        END IF;
    END IF;
END //

-- trg_calcul_besoin_eau: auto-calculate water needs on new weather data
CREATE TRIGGER trg_calcul_besoin_eau
AFTER INSERT ON mesure_climatique
FOR EACH ROW
BEGIN
    DECLARE v_surface       DECIMAL(10,2);
    DECLARE v_type_sol      VARCHAR(10);
    DECLARE v_saison_active BOOLEAN;
    DECLARE v_id_culture    INT;
    DECLARE v_besoin_base   DECIMAL(8,2);
    DECLARE v_coeff_sable   DECIMAL(4,2);
    DECLARE v_coeff_limon   DECIMAL(4,2);
    DECLARE v_coeff_argile  DECIMAL(4,2);
    DECLARE v_coeff         DECIMAL(4,2);
    DECLARE v_thermal       DECIMAL(8,2) DEFAULT 0;
    DECLARE v_besoin_brut   DECIMAL(12,2);
    DECLARE v_volume        DECIMAL(12,2);

    -- Read parcelle + culture info
    SELECT p.surface, p.type_de_sol, p.saison_active, p.id_culture,
           c.besoin_eau_base, c.coeff_sol_sable, c.coeff_sol_limon, c.coeff_sol_argile
       INTO v_surface, v_type_sol, v_saison_active, v_id_culture,
           v_besoin_base, v_coeff_sable, v_coeff_limon, v_coeff_argile
       FROM parcelle p
      LEFT JOIN culture c ON p.id_culture = c.id_culture
     WHERE p.id_parcelle = NEW.id_parcelle;

    -- Only compute if season is active and culture exists
    IF v_saison_active = TRUE AND v_id_culture IS NOT NULL THEN

        -- Soil coefficient
        CASE v_type_sol
            WHEN 'Sable'  THEN SET v_coeff = v_coeff_sable;
            WHEN 'Limon'  THEN SET v_coeff = v_coeff_limon;
            WHEN 'Argile' THEN SET v_coeff = v_coeff_argile;
            ELSE SET v_coeff = 1.00;
        END CASE;

        -- Thermal adjustment
        IF NEW.temperature > 35 THEN
            SET v_thermal = v_besoin_base * 0.15;
        ELSEIF NEW.temperature > 28 THEN
            SET v_thermal = v_besoin_base * 0.08;
        END IF;

        -- Besoin brut (mm/day) clamped to >= 0
        SET v_besoin_brut = GREATEST((v_besoin_base + v_thermal) * v_coeff - NEW.pluie, 0);

        -- Convert mm to litres: mm * surface_ha * 10000 m²/ha = litres
        SET v_volume = v_besoin_brut * v_surface * 10000;

        -- Insert (ignore duplicate parcelle+date)
        INSERT IGNORE INTO besoin_eau (
            id_parcelle, id_mesure, date_besoin,
            volume_recommande, genere_par
        ) VALUES (
            NEW.id_parcelle, NEW.id_mesure,
            NEW.date_prevision + INTERVAL 1 DAY,
            v_volume, 'Système'
        );
    END IF;
END //

-- trg_fin_saison: audit when season is deactivated
CREATE TRIGGER trg_fin_saison
AFTER UPDATE ON parcelle
FOR EACH ROW
BEGIN
    IF OLD.saison_active = TRUE AND NEW.saison_active = FALSE THEN
        IF NEW.id_culture IS NOT NULL AND NEW.date_debut_saison IS NOT NULL THEN
            CALL sp_audit_fin_saison(NEW.id_parcelle);
        END IF;
    END IF;
END //

-- trg_alerte_stress: auto-compute stress level before insert
CREATE TRIGGER trg_alerte_stress
BEFORE INSERT ON stress_hydrique
FOR EACH ROW
BEGIN
    DECLARE v_seuil_pct     DECIMAL(5,2);
    DECLARE v_capacite      DECIMAL(10,2);
    DECLARE v_seuil_abs     DECIMAL(12,2);
    DECLARE v_ratio         DECIMAL(12,4);

    -- Get threshold from culture via parcelle
    SELECT COALESCE(c.seuil_stress_hyd, 50), p.capacite_eau
       INTO v_seuil_pct, v_capacite
       FROM parcelle p
      LEFT JOIN culture c ON p.id_culture = c.id_culture
     WHERE p.id_parcelle = NEW.id_parcelle;

    SET v_seuil_abs = NEW.capacite_source * (v_seuil_pct / 100);
    SET v_ratio = NEW.deficit_calcule / NULLIF(v_seuil_abs, 0);

    -- Determine stress level
    IF v_ratio >= 2.0 THEN
        SET NEW.niveau_stress = 'Critique';
    ELSEIF v_ratio >= 1.5 THEN
        SET NEW.niveau_stress = 'Élevé';
    ELSEIF v_ratio >= 1.0 THEN
        SET NEW.niveau_stress = 'Moyen';
    ELSE
        SET NEW.niveau_stress = 'Faible';
    END IF;

    -- Set alert flag
    SET NEW.alerte_active = (NEW.deficit_calcule > v_seuil_abs);
END //

DELIMITER ;
