from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.models.culture import Culture
from app.models.parcelle import Parcelle
from app.utils.auth_helpers import require_auth
from app.utils.security import validate_schema
from app.schemas import CultureBaseSchema, CultureUpdateSchema

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
        current_app.logger.exception(f"Erreur DB dans list_cultures: {e}")
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
        current_app.logger.exception(f"Erreur DB dans get_culture: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500





@cultures_bp.route("", methods=["POST"])
@require_auth
@validate_schema(CultureBaseSchema)
def create_culture(current_user, validated_data):
    data = validated_data.model_dump()
    try:
        if Culture.query.filter_by(nom_culture=data["nom_culture"]).first():
            return jsonify({"error": "Cette culture existe déjà"}), 409
        culture = Culture(**data)
        db.session.add(culture)
        db.session.commit()
        return jsonify({"data": culture.to_dict(), "message": "Culture créée"}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans create_culture: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@cultures_bp.route("/<int:id>", methods=["PUT"])
@require_auth
@validate_schema(CultureUpdateSchema)
def update_culture(id, current_user, validated_data):
    try:
        culture = db.session.get(Culture, id)
        if not culture:
            return jsonify({"error": "Culture non trouvée"}), 404
        data = validated_data.model_dump(exclude_unset=True)
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
        current_app.logger.exception(f"Erreur DB dans update_culture: {e}")
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
        current_app.logger.exception(f"Erreur DB dans delete_culture: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500
