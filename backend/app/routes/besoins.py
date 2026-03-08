from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.models.besoin_eau import BesoinEau

besoins_bp = Blueprint("besoins", __name__, url_prefix="/api/besoins")


@besoins_bp.route("", methods=["GET"])
def list_besoins():
    try:
        query = BesoinEau.query.order_by(BesoinEau.date_besoin.desc())

        parcelle_id = request.args.get("parcelle_id")
        if parcelle_id:
            try:
                query = query.filter_by(id_parcelle=int(parcelle_id))
            except ValueError:
                return jsonify({"error": "parcelle_id doit être un entier"}), 400

        date_filter = request.args.get("date")
        if date_filter:
            try:
                d = datetime.strptime(date_filter, "%Y-%m-%d").date()
                query = query.filter_by(date_besoin=d)
            except ValueError:
                return jsonify({"error": "Format date invalide (YYYY-MM-DD)"}), 400

        # alerte: filter where volume_applique is NULL or < volume_recommande
        if request.args.get("alerte", "").lower() == "true":
            query = query.filter(
                db.or_(
                    BesoinEau.volume_applique.is_(None),
                    BesoinEau.volume_applique < BesoinEau.volume_recommande,
                )
            )

        besoins = query.all()
        return jsonify({"data": [b.to_dict() for b in besoins], "total": len(besoins)})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@besoins_bp.route("/<int:id>", methods=["GET"])
def get_besoin(id):
    try:
        besoin = db.session.get(BesoinEau, id)
        if not besoin:
            return jsonify({"error": "Besoin non trouvé"}), 404
        return jsonify({"data": besoin.to_dict()})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@besoins_bp.route("/<int:id>/appliquer", methods=["PUT"])
def appliquer_volume(id):
    try:
        besoin = db.session.get(BesoinEau, id)
        if not besoin:
            return jsonify({"error": "Besoin non trouvé"}), 404

        body = request.get_json(silent=True) or {}

        if "volume_applique" not in body:
            return jsonify({"error": "volume_applique est requis"}), 400

        try:
            vol = float(body["volume_applique"])
            if vol < 0:
                return jsonify({"error": "volume_applique doit être >= 0"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "volume_applique doit être un nombre"}), 400

        besoin.volume_applique = vol

        # If applied volume differs from recommended, mark as manual
        if besoin.volume_recommande and vol != float(besoin.volume_recommande):
            from app.models.besoin_eau import GenerePar
            besoin.genere_par = GenerePar.Manuel

        db.session.commit()
        return jsonify({"data": besoin.to_dict(), "message": "Volume appliqué enregistré"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@besoins_bp.route("/<int:id>", methods=["DELETE"])
def delete_besoin(id):
    try:
        besoin = db.session.get(BesoinEau, id)
        if not besoin:
            return jsonify({"error": "Besoin non trouvé"}), 404

        db.session.delete(besoin)
        db.session.commit()
        return jsonify({"message": "Besoin supprimé"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500
