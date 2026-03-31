from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.models.stress_hydrique import StressHydrique, NiveauStress
from app.models.parcelle import Parcelle
from app.services.calcul_service import calcul_stress_hydrique
from app.utils.auth_helpers import require_auth, check_parcelle_ownership, check_stress_ownership

stress_bp = Blueprint("stress", __name__, url_prefix="/api/stress")

VALID_NIVEAUX = {e.value for e in NiveauStress}


@stress_bp.route("", methods=["GET"])
@require_auth
def list_stress(current_user):
    try:
        user_parcelle_ids = [p.id_parcelle for p in Parcelle.query.filter_by(id_agriculteur=current_user.id_agriculteur).all()]
        query = StressHydrique.query.filter(StressHydrique.id_parcelle.in_(user_parcelle_ids)).order_by(StressHydrique.date_calcul.desc())

        parcelle_id = request.args.get("parcelle_id")
        if parcelle_id:
            try:
                pid = int(parcelle_id)
            except ValueError:
                return jsonify({"error": "parcelle_id doit être un entier"}), 400
            if pid not in user_parcelle_ids:
                return jsonify({"error": "Accès refusé"}), 403
            query = query.filter_by(id_parcelle=pid)

        if request.args.get("alerte_active", "").lower() == "true":
            query = query.filter_by(alerte_active=True)

        niveau = request.args.get("niveau")
        if niveau:
            if niveau not in VALID_NIVEAUX:
                return jsonify({"error": f"niveau doit être parmi {VALID_NIVEAUX}"}), 400
            query = query.filter(StressHydrique.niveau_stress == niveau)

        records = query.all()
        return jsonify({"data": [s.to_dict() for s in records], "total": len(records)})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans list_stress: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@stress_bp.route("/<int:id>", methods=["GET"])
@require_auth
def get_stress(id, current_user):
    try:
        stress = check_stress_ownership(id, current_user)
        return jsonify({"data": stress.to_dict()})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans get_stress: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@stress_bp.route("/calculer/<int:parcelle_id>", methods=["POST"])
@require_auth
def simuler_stress(parcelle_id, current_user):
    try:
        check_parcelle_ownership(parcelle_id, current_user)
        result = calcul_stress_hydrique(parcelle_id)
        return jsonify({"simulation": result})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans simuler_stress: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@stress_bp.route("/<int:id>", methods=["DELETE"])
@require_auth
def delete_stress(id, current_user):
    try:
        stress = check_stress_ownership(id, current_user)
        db.session.delete(stress)
        db.session.commit()
        return jsonify({"message": "Enregistrement supprimé"})
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans delete_stress: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500
