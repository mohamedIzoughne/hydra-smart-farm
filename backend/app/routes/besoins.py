from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.models.besoin_eau import BesoinEau, GenerePar
from app.models.parcelle import Parcelle
from app.utils.auth_helpers import require_auth, check_besoin_ownership

besoins_bp = Blueprint("besoins", __name__, url_prefix="/api/besoins")


@besoins_bp.route("", methods=["GET"])
@require_auth
def list_besoins(current_user):
    try:
        user_parcelle_ids = [p.id_parcelle for p in Parcelle.query.filter_by(id_agriculteur=current_user.id_agriculteur).all()]
        query = BesoinEau.query.filter(BesoinEau.id_parcelle.in_(user_parcelle_ids)).order_by(BesoinEau.date_besoin.desc())

        parcelle_id = request.args.get("parcelle_id")
        if parcelle_id:
            try:
                pid = int(parcelle_id)
            except ValueError:
                return jsonify({"error": "parcelle_id doit être un entier"}), 400
            if pid not in user_parcelle_ids:
                return jsonify({"error": "Accès refusé"}), 403
            query = query.filter_by(id_parcelle=pid)

        date_filter = request.args.get("date")
        if date_filter:
            try:
                d = datetime.strptime(date_filter, "%Y-%m-%d").date()
                query = query.filter_by(date_besoin=d)
            except ValueError:
                return jsonify({"error": "Format date invalide (YYYY-MM-DD)"}), 400

        if request.args.get("alerte", "").lower() == "true":
            query = query.filter(
                db.or_(BesoinEau.volume_applique.is_(None), BesoinEau.volume_applique < BesoinEau.volume_recommande)
            )

        besoins = query.all()
        return jsonify({"data": [b.to_dict() for b in besoins], "total": len(besoins)})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans list_besoins: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@besoins_bp.route("/<int:id>", methods=["GET"])
@require_auth
def get_besoin(id, current_user):
    try:
        besoin = check_besoin_ownership(id, current_user)
        return jsonify({"data": besoin.to_dict()})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans get_besoin: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@besoins_bp.route("/<int:id>/appliquer", methods=["PUT"])
@require_auth
def appliquer_volume(id, current_user):
    try:
        besoin = check_besoin_ownership(id, current_user)

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
        if besoin.volume_recommande and vol != float(besoin.volume_recommande):
            besoin.genere_par = GenerePar.Manuel

        db.session.commit()
        return jsonify({"data": besoin.to_dict(), "message": "Volume appliqué enregistré"})
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans appliquer_volume: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@besoins_bp.route("/<int:id>", methods=["DELETE"])
@require_auth
def delete_besoin(id, current_user):
    try:
        besoin = check_besoin_ownership(id, current_user)
        db.session.delete(besoin)
        db.session.commit()
        return jsonify({"message": "Besoin supprimé"})
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans delete_besoin: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500
