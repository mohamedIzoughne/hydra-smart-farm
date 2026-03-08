from datetime import datetime, date
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app import db
from app.models.mesure_climatique import MesureClimatique
from app.models.parcelle import Parcelle
from app.models.besoin_eau import BesoinEau
from app.services.calcul_service import calcul_volume_besoin

mesures_bp = Blueprint("mesures", __name__, url_prefix="/api/mesures")


@mesures_bp.route("", methods=["GET"])
def list_mesures():
    parcelle_id = request.args.get("parcelle_id")
    if not parcelle_id:
        return jsonify({"error": "parcelle_id est requis"}), 400
    try:
        parcelle_id = int(parcelle_id)
    except ValueError:
        return jsonify({"error": "parcelle_id doit être un entier"}), 400

    try:
        query = MesureClimatique.query.filter_by(id_parcelle=parcelle_id).order_by(MesureClimatique.date_prevision.desc())

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
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@mesures_bp.route("/<int:id>", methods=["GET"])
def get_mesure(id):
    try:
        mesure = db.session.get(MesureClimatique, id)
        if not mesure:
            return jsonify({"error": "Mesure non trouvée"}), 404
        data = mesure.to_dict()
        data["besoin_eau"] = mesure.besoin.to_dict() if mesure.besoin else None
        return jsonify({"data": data})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@mesures_bp.route("", methods=["POST"])
def create_mesure():
    body = request.get_json(silent=True) or {}

    # Validate required fields
    errors = []
    if not body.get("id_parcelle"):
        errors.append("id_parcelle est requis")
    if not body.get("date_prevision"):
        errors.append("date_prevision est requis")
    if "temperature" not in body:
        errors.append("temperature est requis")
    if "pluie" not in body:
        errors.append("pluie est requis")

    if errors:
        return jsonify({"error": "; ".join(errors)}), 400

    # Validate parcelle
    try:
        parcelle = db.session.get(Parcelle, int(body["id_parcelle"]))
    except (ValueError, TypeError):
        return jsonify({"error": "id_parcelle invalide"}), 400

    if not parcelle:
        return jsonify({"error": "Parcelle introuvable"}), 404
    if not parcelle.saison_active:
        return jsonify({"error": "La saison de cette parcelle n'est pas active"}), 400

    # Validate date
    try:
        date_prev = datetime.strptime(body["date_prevision"], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return jsonify({"error": "Format date_prevision invalide (YYYY-MM-DD)"}), 400

    # Validate temperature
    try:
        temp = float(body["temperature"])
        if temp < -50 or temp > 60:
            return jsonify({"error": "temperature doit être entre -50 et 60"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "temperature doit être un nombre"}), 400

    # Validate pluie
    try:
        pluie = float(body["pluie"])
        if pluie < 0:
            return jsonify({"error": "pluie doit être >= 0"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "pluie doit être un nombre"}), 400

    # Validate humidite
    humidite = body.get("humidite")
    if humidite is not None:
        try:
            humidite = float(humidite)
            if humidite < 0 or humidite > 100:
                return jsonify({"error": "humidite doit être entre 0 et 100"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "humidite doit être un nombre"}), 400

    try:
        mesure = MesureClimatique(
            id_parcelle=parcelle.id_parcelle,
            date_prevision=date_prev,
            temperature=temp,
            pluie=pluie,
            humidite=humidite,
            source_api=body.get("source_api", "OpenMeteo"),
        )
        db.session.add(mesure)
        db.session.commit()

        # Query the auto-generated besoin_eau (from trigger)
        besoin = BesoinEau.query.filter_by(id_mesure=mesure.id_mesure).first()

        return jsonify({
            "data": mesure.to_dict(),
            "besoin_genere": besoin.to_dict() if besoin else None,
        }), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Une mesure existe déjà pour cette parcelle à cette date"}), 409
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@mesures_bp.route("/<int:id>", methods=["PUT"])
def update_mesure(id):
    try:
        mesure = db.session.get(MesureClimatique, id)
        if not mesure:
            return jsonify({"error": "Mesure non trouvée"}), 404

        body = request.get_json(silent=True) or {}

        for forbidden in ("id_parcelle", "date_prevision"):
            if forbidden in body:
                return jsonify({"error": f"'{forbidden}' ne peut pas être modifié"}), 400

        if "temperature" in body:
            try:
                temp = float(body["temperature"])
                if temp < -50 or temp > 60:
                    return jsonify({"error": "temperature doit être entre -50 et 60"}), 400
                mesure.temperature = temp
            except (ValueError, TypeError):
                return jsonify({"error": "temperature doit être un nombre"}), 400

        if "pluie" in body:
            try:
                pluie = float(body["pluie"])
                if pluie < 0:
                    return jsonify({"error": "pluie doit être >= 0"}), 400
                mesure.pluie = pluie
            except (ValueError, TypeError):
                return jsonify({"error": "pluie doit être un nombre"}), 400

        if "humidite" in body:
            if body["humidite"] is None:
                mesure.humidite = None
            else:
                try:
                    h = float(body["humidite"])
                    if h < 0 or h > 100:
                        return jsonify({"error": "humidite doit être entre 0 et 100"}), 400
                    mesure.humidite = h
                except (ValueError, TypeError):
                    return jsonify({"error": "humidite doit être un nombre"}), 400

        if "source_api" in body:
            mesure.source_api = body["source_api"]

        db.session.commit()

        # Recalculate besoin_eau (UPDATE doesn't re-fire INSERT trigger)
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
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@mesures_bp.route("/<int:id>", methods=["DELETE"])
def delete_mesure(id):
    try:
        mesure = db.session.get(MesureClimatique, id)
        if not mesure:
            return jsonify({"error": "Mesure non trouvée"}), 404

        db.session.delete(mesure)
        db.session.commit()
        return jsonify({"message": "Mesure supprimée"})
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "Impossible de supprimer : un besoin en eau référence cette mesure"}), 409
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500
