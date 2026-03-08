from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.models.culture import Culture
from app.models.parcelle import Parcelle
from app.utils.auth_helpers import require_auth

cultures_bp = Blueprint("cultures", __name__, url_prefix="/api/cultures")


@cultures_bp.route("", methods=["GET"])
@require_auth
def list_cultures(current_user):
    try:
        query = Culture.query.order_by(Culture.nom_culture.asc())
        besoin_max = request.args.get("besoin_max")
        if besoin_max is not None:
            try:
                besoin_max = float(besoin_max)
            except ValueError:
                return jsonify({"error": "besoin_max doit être un nombre"}), 400
            query = query.filter(Culture.besoin_eau_base <= besoin_max)
        cultures = query.all()
        return jsonify({"data": [c.to_dict() for c in cultures], "total": len(cultures)})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@cultures_bp.route("/<int:id>", methods=["GET"])
@require_auth
def get_culture(id, current_user):
    try:
        culture = db.session.get(Culture, id)
        if not culture:
            return jsonify({"error": "Culture non trouvée"}), 404
        return jsonify({"data": culture.to_dict()})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


def _validate_culture_fields(body, is_create=False):
    errors = []
    data = {}
    if is_create:
        for field in ("nom_culture", "besoin_eau_base", "seuil_stress_hyd"):
            if field not in body or body[field] is None:
                errors.append(f"{field} est requis")
    if "nom_culture" in body:
        nom = (body["nom_culture"] or "").strip()
        if not nom or len(nom) > 80:
            errors.append("nom_culture invalide (1-80 caractères)")
        data["nom_culture"] = nom
    if "besoin_eau_base" in body:
        try:
            val = float(body["besoin_eau_base"])
            if val <= 0:
                errors.append("besoin_eau_base doit être > 0")
            data["besoin_eau_base"] = val
        except (ValueError, TypeError):
            errors.append("besoin_eau_base doit être un nombre")
    if "seuil_stress_hyd" in body:
        try:
            val = float(body["seuil_stress_hyd"])
            if val < 0 or val > 100:
                errors.append("seuil_stress_hyd doit être entre 0 et 100")
            data["seuil_stress_hyd"] = val
        except (ValueError, TypeError):
            errors.append("seuil_stress_hyd doit être un nombre")
    for coeff in ("coeff_sol_sable", "coeff_sol_limon", "coeff_sol_argile"):
        if coeff in body:
            try:
                data[coeff] = float(body[coeff])
            except (ValueError, TypeError):
                errors.append(f"{coeff} doit être un nombre")
    return errors, data


@cultures_bp.route("", methods=["POST"])
@require_auth
def create_culture(current_user):
    body = request.get_json(silent=True) or {}
    errors, data = _validate_culture_fields(body, is_create=True)
    if errors:
        return jsonify({"error": "; ".join(errors)}), 400
    try:
        if Culture.query.filter_by(nom_culture=data["nom_culture"]).first():
            return jsonify({"error": "Cette culture existe déjà"}), 409
        culture = Culture(**data)
        db.session.add(culture)
        db.session.commit()
        return jsonify({"data": culture.to_dict(), "message": "Culture créée"}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@cultures_bp.route("/<int:id>", methods=["PUT"])
@require_auth
def update_culture(id, current_user):
    try:
        culture = db.session.get(Culture, id)
        if not culture:
            return jsonify({"error": "Culture non trouvée"}), 404
        body = request.get_json(silent=True) or {}
        errors, data = _validate_culture_fields(body, is_create=False)
        if errors:
            return jsonify({"error": "; ".join(errors)}), 400
        if "nom_culture" in data:
            existing = Culture.query.filter(Culture.nom_culture == data["nom_culture"], Culture.id_culture != id).first()
            if existing:
                return jsonify({"error": "Cette culture existe déjà"}), 409
        for key, val in data.items():
            setattr(culture, key, val)
        db.session.commit()
        return jsonify({"data": culture.to_dict(), "message": "Mis à jour"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@cultures_bp.route("/<int:id>", methods=["DELETE"])
@require_auth
def delete_culture(id, current_user):
    try:
        culture = db.session.get(Culture, id)
        if not culture:
            return jsonify({"error": "Culture non trouvée"}), 404
        active = Parcelle.query.filter_by(id_culture=id, saison_active=True).first()
        if active:
            return jsonify({"error": "Impossible de supprimer : des parcelles en saison active utilisent cette culture"}), 409
        db.session.delete(culture)
        db.session.commit()
        return jsonify({"message": "Culture supprimée"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500
