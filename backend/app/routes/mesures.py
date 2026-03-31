from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app import db
from app.models.mesure_climatique import MesureClimatique
from app.models.parcelle import Parcelle
from app.models.besoin_eau import BesoinEau
from app.services.calcul_service import calcul_volume_besoin
from app.utils.auth_helpers import require_auth, check_parcelle_ownership, check_mesure_ownership
from app.utils.security import validate_schema
from app.schemas import MesureCreateSchema, MesureUpdateSchema

mesures_bp = Blueprint("mesures", __name__, url_prefix="/api/mesures")


@mesures_bp.route("", methods=["GET"])
@require_auth
def list_mesures(current_user):
    parcelle_id = request.args.get("parcelle_id")

    try:
        # Always scope to current user's parcelles
        user_parcelle_ids = [p.id_parcelle for p in Parcelle.query.filter_by(id_agriculteur=current_user.id_agriculteur).all()]

        query = MesureClimatique.query.filter(MesureClimatique.id_parcelle.in_(user_parcelle_ids))

        if parcelle_id:
            try:
                pid = int(parcelle_id)
            except ValueError:
                return jsonify({"error": "parcelle_id doit être un entier"}), 400
            if pid not in user_parcelle_ids:
                return jsonify({"error": "Accès refusé"}), 403
            query = query.filter_by(id_parcelle=pid)

        query = query.order_by(MesureClimatique.date_prevision.desc())

        depuis = request.args.get("depuis")
        if depuis:
            try:
                query = query.filter(MesureClimatique.date_prevision >= datetime.strptime(depuis, "%Y-%m-%d").date())
            except ValueError:
                return jsonify({"error": "Format depuis invalide (YYYY-MM-DD)"}), 400

        jusqu = request.args.get("jusqu")
        if jusqu:
            try:
                query = query.filter(MesureClimatique.date_prevision <= datetime.strptime(jusqu, "%Y-%m-%d").date())
            except ValueError:
                return jsonify({"error": "Format jusqu invalide (YYYY-MM-DD)"}), 400

        mesures = query.all()
        return jsonify({"data": [m.to_dict() for m in mesures], "total": len(mesures)})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans list_mesures: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@mesures_bp.route("/<int:id>", methods=["GET"])
@require_auth
def get_mesure(id, current_user):
    try:
        mesure = check_mesure_ownership(id, current_user)
        data = mesure.to_dict()
        data["besoin_eau"] = mesure.besoin.to_dict() if mesure.besoin else None
        return jsonify({"data": data})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans get_mesure: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@mesures_bp.route("", methods=["POST"])
@require_auth
@validate_schema(MesureCreateSchema)
def create_mesure(current_user, validated_data):
    try:
        parcelle = check_parcelle_ownership(validated_data.id_parcelle, current_user)
    except (ValueError, TypeError):
        return jsonify({"error": "id_parcelle invalide"}), 400

    if not parcelle.saison_active:
        return jsonify({"error": "La saison de cette parcelle n'est pas active"}), 400

    try:
        mesure = MesureClimatique(
            id_parcelle=parcelle.id_parcelle,
            date_prevision=validated_data.date_prevision,
            temperature=validated_data.temperature,
            pluie=validated_data.pluie,
            humidite=validated_data.humidite,
            source_api=validated_data.source_api,
        )
        db.session.add(mesure)
        db.session.commit()

        besoin = BesoinEau.query.filter_by(id_mesure=mesure.id_mesure).first()
        return jsonify({
            "data": mesure.to_dict(),
            "besoin_genere": besoin.to_dict() if besoin else None,
        }), 201
    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur d'intégrité DB dans create_mesure: {e}")
        return jsonify({"error": "Une mesure existe déjà pour cette parcelle à cette date"}), 409
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans create_mesure: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@mesures_bp.route("/<int:id>", methods=["PUT"])
@require_auth
@validate_schema(MesureUpdateSchema)
def update_mesure(id, current_user, validated_data):
    try:
        mesure = check_mesure_ownership(id, current_user)

        if validated_data.temperature is not None:
            mesure.temperature = validated_data.temperature

        if validated_data.pluie is not None:
            mesure.pluie = validated_data.pluie

        if validated_data.humidite is not None:
            mesure.humidite = validated_data.humidite

        if validated_data.source_api is not None:
            mesure.source_api = validated_data.source_api

        db.session.commit()

        parcelle = db.session.get(Parcelle, mesure.id_parcelle)
        if parcelle and parcelle.id_culture and parcelle.saison_active:
            from app.models.culture import Culture
            culture = db.session.get(Culture, parcelle.id_culture)
            volume = calcul_volume_besoin(parcelle, culture, mesure)
            besoin = BesoinEau.query.filter_by(id_mesure=mesure.id_mesure).first()
            if besoin:
                besoin.volume_recommande = volume
                db.session.commit()

        return jsonify({"data": mesure.to_dict(), "message": "Mis à jour"})
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans update_mesure: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@mesures_bp.route("/<int:id>", methods=["DELETE"])
@require_auth
def delete_mesure(id, current_user):
    try:
        mesure = check_mesure_ownership(id, current_user)
        db.session.delete(mesure)
        db.session.commit()
        return jsonify({"message": "Mesure supprimée"})
    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur d'intégrité DB dans delete_mesure: {e}")
        return jsonify({"error": "Impossible de supprimer : un besoin en eau référence cette mesure"}), 409
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans delete_mesure: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500
