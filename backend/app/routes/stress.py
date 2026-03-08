from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.models.stress_hydrique import StressHydrique, NiveauStress
from app.models.parcelle import Parcelle
from app.services.calcul_service import calcul_stress_hydrique

stress_bp = Blueprint("stress", __name__, url_prefix="/api/stress")

VALID_NIVEAUX = {e.value for e in NiveauStress}


@stress_bp.route("", methods=["GET"])
def list_stress():
    try:
        query = StressHydrique.query.order_by(StressHydrique.date_calcul.desc())

        parcelle_id = request.args.get("parcelle_id")
        if parcelle_id:
            try:
                query = query.filter_by(id_parcelle=int(parcelle_id))
            except ValueError:
                return jsonify({"error": "parcelle_id doit être un entier"}), 400

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
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@stress_bp.route("/<int:id>", methods=["GET"])
def get_stress(id):
    try:
        stress = db.session.get(StressHydrique, id)
        if not stress:
            return jsonify({"error": "Enregistrement non trouvé"}), 404
        return jsonify({"data": stress.to_dict()})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@stress_bp.route("/calculer/<int:parcelle_id>", methods=["POST"])
def simuler_stress(parcelle_id):
    """Simulation only — does NOT insert into DB."""
    try:
        parcelle = db.session.get(Parcelle, parcelle_id)
        if not parcelle:
            return jsonify({"error": "Parcelle introuvable"}), 404

        result = calcul_stress_hydrique(parcelle_id)
        return jsonify({"simulation": result})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@stress_bp.route("/<int:id>", methods=["DELETE"])
def delete_stress(id):
    try:
        stress = db.session.get(StressHydrique, id)
        if not stress:
            return jsonify({"error": "Enregistrement non trouvé"}), 404

        db.session.delete(stress)
        db.session.commit()
        return jsonify({"message": "Enregistrement supprimé"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500
