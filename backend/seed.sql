-- ============================================================
-- SmartAgri-Predict — Seed Data
-- ============================================================

USE smartagri;

-- ============================================================
-- 1. AGRICULTEURS (2 regular users)
-- Passwords hashed with werkzeug (placeholder hashes for seeding)
-- karim: "karim12345"  |  fatima: "fatima12345"
-- ============================================================

INSERT INTO AGRICULTEUR (nom, mail, mot_de_passe, actif) VALUES
('Karim Benali',  'karim.benali@mail.com',  'pbkdf2:sha256:600000$placeholder1$abc123hash', TRUE),
('Fatima Zahra',  'fatima.zahra@mail.com',   'pbkdf2:sha256:600000$placeholder2$def456hash', TRUE);

-- ============================================================
-- 2. CULTURES (realistic besoin_eau_base in mm/day)
-- ============================================================

INSERT INTO CULTURE (nom_culture, besoin_eau_base, seuil_stress_hyd, coeff_sol_sable, coeff_sol_limon, coeff_sol_argile) VALUES
('Blé',      4.50, 40.00, 1.25, 1.00, 0.80),
('Tomate',   6.80, 55.00, 1.35, 1.00, 0.70),
('Maïs',     7.20, 50.00, 1.30, 1.00, 0.75),
('Orge',     3.80, 35.00, 1.20, 1.00, 0.80),
('Lentille', 3.00, 30.00, 1.15, 1.00, 0.85);

-- ============================================================
-- 3. PARCELLES
-- ============================================================

-- Parcelle 1: Karim, Blé, Sable, saison active
INSERT INTO PARCELLE (id_agriculteur, id_culture, surface, type_de_sol, capacite_eau, latitude, longitude, saison_active, date_debut_saison) VALUES
(1, 1, 2.50, 'Sable', 150000.00, 33.573110, -7.589843, TRUE, '2026-02-01');

-- Parcelle 2: Karim, Tomate, Limon, saison active
INSERT INTO PARCELLE (id_agriculteur, id_culture, surface, type_de_sol, capacite_eau, latitude, longitude, saison_active, date_debut_saison) VALUES
(1, 2, 1.20, 'Limon', 95000.00, 33.589500, -7.603200, TRUE, '2026-02-15');

-- Parcelle 3: Fatima, Maïs, Argile, saison active
INSERT INTO PARCELLE (id_agriculteur, id_culture, surface, type_de_sol, capacite_eau, latitude, longitude, saison_active, date_debut_saison) VALUES
(2, 3, 3.00, 'Argile', 200000.00, 34.020882, -6.841650, TRUE, '2026-01-20');

-- Parcelle 4: Fatima, no culture, inactive
INSERT INTO PARCELLE (id_agriculteur, id_culture, surface, type_de_sol, capacite_eau, latitude, longitude, saison_active, date_debut_saison) VALUES
(2, NULL, 1.80, 'Limon', 120000.00, 31.629472, -7.981084, FALSE, NULL);

-- ============================================================
-- 4. MESURES CLIMATIQUES (triggers auto-create BESOIN_EAU)
-- ============================================================

INSERT INTO MESURE_CLIMATIQUE (id_parcelle, date_prevision, temperature, pluie, humidite, source_api) VALUES
(1, '2026-03-05', 36.50, 0.00, 25.00, 'OpenMeteo');

INSERT INTO MESURE_CLIMATIQUE (id_parcelle, date_prevision, temperature, pluie, humidite, source_api) VALUES
(1, '2026-03-06', 27.00, 3.20, 45.00, 'OpenMeteo');

INSERT INTO MESURE_CLIMATIQUE (id_parcelle, date_prevision, temperature, pluie, humidite, source_api) VALUES
(2, '2026-03-05', 30.00, 1.50, 40.00, 'OpenMeteo');

INSERT INTO MESURE_CLIMATIQUE (id_parcelle, date_prevision, temperature, pluie, humidite, source_api) VALUES
(3, '2026-03-05', 38.00, 0.00, 20.00, 'OpenMeteo');

INSERT INTO MESURE_CLIMATIQUE (id_parcelle, date_prevision, temperature, pluie, humidite, source_api) VALUES
(3, '2026-03-06', 22.00, 12.50, 70.00, 'OpenMeteo');

-- ============================================================
-- 5. STRESS HYDRIQUE (manual record)
-- ============================================================

INSERT INTO STRESS_HYDRIQUE (
    id_parcelle, date_calcul, niveau_stress,
    besoin_total_saison, capacite_source, deficit_calcule,
    recommandation, cultures_suggere
) VALUES (
    3, '2026-03-07', 'Faible',
    185000.00, 200000.00, 42000.00,
    'Déficit modéré détecté. Surveillez l''irrigation lors des pics de chaleur.',
    'Orge, Lentille, Blé'
);
