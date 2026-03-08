from datetime import date, datetime
from decimal import Decimal
from app import db
from app.models.parcelle import Parcelle, TypeSol
from app.models.agriculteur import Agriculteur
from app.models.culture import Culture
from app.models.besoin_eau import BesoinEau
from app.models.stress_hydrique import StressHydrique

VALID_SOIL_TYPES = {"Sable", "Limon", "Argile"}


def validate_parcelle_data(data, is_create=False):
    """Validate parcelle input data. Raises ValueError on invalid input."""
    errors = []

    if is_create:
        if not data.get("id_agriculteur"):
            errors.append("id_agriculteur est requis")
        if "surface" not in data:
            errors.append("surface est requis")
        if "type_de_sol" not in data:
            errors.append("type_de_sol est requis")
        if "capacite_eau" not in data:
            errors.append("capacite_eau est requis")

    if "id_agriculteur" in data:
        agri = db.session.get(Agriculteur, data["id_agriculteur"])
        if not agri:
            errors.append("Agriculteur introuvable")
        elif not agri.actif:
            errors.append("Agriculteur inactif")

    if "id_culture" in data and data["id_culture"] is not None:
        if not db.session.get(Culture, data["id_culture"]):
            errors.append("Culture introuvable")

    if "surface" in data:
        try:
            val = float(data["surface"])
            if val <= 0:
                errors.append("surface doit être > 0")
        except (ValueError, TypeError):
            errors.append("surface doit être un nombre")

    if "capacite_eau" in data:
        try:
            val = float(data["capacite_eau"])
            if val <= 0:
                errors.append("capacite_eau doit être > 0")
        except (ValueError, TypeError):
            errors.append("capacite_eau doit être un nombre")

    if "type_de_sol" in data:
        if data["type_de_sol"] not in VALID_SOIL_TYPES:
            errors.append(f"type_de_sol doit être parmi {VALID_SOIL_TYPES}")

    for coord in ("latitude", "longitude"):
        if coord in data and data[coord] is not None:
            try:
                float(data[coord])
            except (ValueError, TypeError):
                errors.append(f"{coord} doit être un nombre")

    if errors:
        raise ValueError("; ".join(errors))


def _serialize_decimal(val):
    if isinstance(val, Decimal):
        return float(val)
    return val


def _serialize_date(val):
    if isinstance(val, (date, datetime)):
        return val.isoformat()
    return val


def get_parcelle_with_context(parcelle_id):
    """Return parcelle dict with embedded agriculteur name, culture, last 7 besoins, last stress."""
    parcelle = db.session.get(Parcelle, parcelle_id)
    if not parcelle:
        return None

    data = parcelle.to_dict()

    # Agriculteur name
    if parcelle.agriculteur:
        data["agriculteur_nom"] = parcelle.agriculteur.nom

    # Culture data
    if parcelle.culture:
        data["culture"] = parcelle.culture.to_dict()
    else:
        data["culture"] = None

    # Last 7 besoin_eau records
    besoins = (
        BesoinEau.query
        .filter_by(id_parcelle=parcelle_id)
        .order_by(BesoinEau.date_besoin.desc())
        .limit(7)
        .all()
    )
    data["derniers_besoins"] = [b.to_dict() for b in besoins]

    # Last stress record
    stress = (
        StressHydrique.query
        .filter_by(id_parcelle=parcelle_id)
        .order_by(StressHydrique.date_calcul.desc())
        .first()
    )
    data["dernier_stress"] = stress.to_dict() if stress else None

    return data
