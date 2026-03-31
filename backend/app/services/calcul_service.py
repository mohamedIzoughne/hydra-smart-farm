from decimal import Decimal
from app import db
from app.models.parcelle import Parcelle
from app.models.culture import Culture
from app.models.besoin_eau import BesoinEau
from app.models.stress_hydrique import StressHydrique


def get_coefficient_sol(type_de_sol, culture):
    """Return the soil coefficient for the given soil type and culture."""
    if not culture:
        return 1.0
    mapping = {
        "Sable": float(culture.coeff_sol_sable or 1.30),
        "Limon": float(culture.coeff_sol_limon or 1.00),
        "Argile": float(culture.coeff_sol_argile or 0.75),
    }
    return mapping.get(type_de_sol, 1.0)


def calcul_ajustement_thermique(temperature, besoin_base):
    """Return thermal adjustment in mm/day."""
    temp = float(temperature)
    base = float(besoin_base)
    if temp > 35:
        return base * 0.15
    elif temp > 28:
        return base * 0.08
    return 0.0


def calcul_volume_besoin(parcelle, culture, mesure):
    """Calculate recommended water volume in litres for a single mesure."""
    if not culture:
        return 0.0

    base = float(culture.besoin_eau_base)
    coeff = get_coefficient_sol(
        parcelle.type_de_sol.value if hasattr(parcelle.type_de_sol, "value") else parcelle.type_de_sol,
        culture,
    )
    thermal = calcul_ajustement_thermique(mesure.temperature, base)
    pluie = float(mesure.pluie)
    surface = float(parcelle.surface)

    besoin_brut = max((base + thermal) * coeff - pluie, 0.0)
    volume = besoin_brut * surface * 10000
    return round(volume, 2)


def calcul_stress_hydrique(parcelle_id):
    """
    Python-side mirror of sp_audit_fin_saison.
    Returns a simulation dict without inserting into DB.
    """
    parcelle = db.session.get(Parcelle, parcelle_id)
    if not parcelle:
        raise ValueError("Parcelle introuvable")

    culture = db.session.get(Culture, parcelle.id_culture) if parcelle.id_culture else None

    # Aggregate recommended volume for the season
    query = BesoinEau.query.filter_by(id_parcelle=parcelle_id)
    if parcelle.date_debut_saison:
        query = query.filter(BesoinEau.date_besoin >= parcelle.date_debut_saison)

    besoins = query.all()
    besoin_total = sum(float(b.volume_recommande or 0) for b in besoins)
    capacite = float(parcelle.capacite_eau)
    deficit = max(besoin_total - capacite, 0.0)

    # Stress threshold
    seuil_pct = float(culture.seuil_stress_hyd) if culture and culture.seuil_stress_hyd else 50.0
    seuil_abs = capacite * (seuil_pct / 100.0)

    # Ratio and level
    if seuil_abs == 0:
        ratio = 0.0
    else:
        ratio = deficit / seuil_abs

    if ratio >= 2.0:
        niveau = "Critique"
    elif ratio >= 1.5:
        niveau = "Eleve"
    elif ratio >= 1.0:
        niveau = "Moyen"
    else:
        niveau = "Faible"

    alerte = deficit > seuil_abs

    # Suggest lower-water cultures
    suggestions_data = []
    if parcelle.date_debut_saison:
        from datetime import date
        duree = max((date.today() - parcelle.date_debut_saison).days, 1)

        # 1. Try to find cultures that fit within the capacity
        matching_suggestions = (
            Culture.query
            .filter(Culture.besoin_eau_base * duree < capacite)
            .filter(Culture.id_culture != (parcelle.id_culture or 0))
            .order_by(Culture.besoin_eau_base.asc())
            .all()
        )

        if matching_suggestions:
            for c in matching_suggestions:
                est_need = float(c.besoin_eau_base) * duree
                suggestions_data.append({
                    "id": c.id_culture,
                    "nom": c.nom_culture,
                    "besoin_estime": round(est_need, 2),
                    "deficit_estime": round(max(est_need - capacite, 0.0), 2),
                    "match": True
                })
        else:
            # 2. No perfect match? Find 3 closest ones (lowest needs)
            closest = (
                Culture.query
                .filter(Culture.id_culture != (parcelle.id_culture or 0))
                .order_by(Culture.besoin_eau_base.asc())
                .limit(3)
                .all()
            )
            for c in closest:
                est_need = float(c.besoin_eau_base) * duree
                suggestions_data.append({
                    "id": c.id_culture,
                    "nom": c.nom_culture,
                    "besoin_estime": round(est_need, 2),
                    "deficit_estime": round(max(est_need - capacite, 0.0), 2),
                    "match": False
                })

    return {
        "besoin_total": round(besoin_total, 2),
        "capacite_source": round(capacite, 2),
        "deficit": round(deficit, 2),
        "niveau_stress": niveau,
        "alerte_active": alerte,
        "cultures_suggere": suggestions_data,
    }
