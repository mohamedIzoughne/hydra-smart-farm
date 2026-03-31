from datetime import date, datetime
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from app import db
from app.models.parcelle import Parcelle, TypeSol
from app.models.besoin_eau import BesoinEau
from app.models.stress_hydrique import StressHydrique
from app.services.parcelle_service import validate_parcelle_data, get_parcelle_with_context
from app.utils.auth_helpers import require_auth, check_parcelle_ownership
from app.utils.security import validate_schema
from app.schemas import ParcelleCreateSchema, ParcelleUpdateSchema

parcelles_bp = Blueprint("parcelles", __name__, url_prefix="/api/parcelles")


@parcelles_bp.route("", methods=["GET"])
@require_auth
def list_parcelles(current_user):
    try:
        query = Parcelle.query.filter_by(id_agriculteur=current_user.id_agriculteur)

        saison = request.args.get("saison_active")
        if saison is not None:
            query = query.filter_by(saison_active=(saison.lower() == "true"))

        parcelles = query.all()
        include_culture = request.args.get("include_culture", "false").lower() == "true"

        results = []
        for p in parcelles:
            d = p.to_dict()
            if include_culture and p.culture:
                d["culture"] = p.culture.to_dict()
            results.append(d)

        return jsonify({"data": results, "total": len(results)})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans list_parcelles: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>", methods=["GET"])
@require_auth
def get_parcelle(id, current_user):
    try:
        check_parcelle_ownership(id, current_user)
        data = get_parcelle_with_context(id)
        if not data:
            return jsonify({"error": "Parcelle non trouvée"}), 404
        return jsonify({"data": data})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans get_parcelle: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("", methods=["POST"])
@require_auth
@validate_schema(ParcelleCreateSchema)
def create_parcelle(current_user, validated_data):
    # data is already validated by Pydantic
    try:
        parcelle = Parcelle(
            id_agriculteur=current_user.id_agriculteur,
            surface=validated_data.surface,
            type_de_sol=TypeSol(validated_data.type_de_sol.value),
            capacite_eau=validated_data.capacite_eau,
            latitude=validated_data.latitude,
            longitude=validated_data.longitude,
            id_culture=validated_data.id_culture,
            saison_active=False,
        )
        db.session.add(parcelle)
        db.session.commit()
        return jsonify({"data": parcelle.to_dict()}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans create_parcelle: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>", methods=["PUT"])
@require_auth
@validate_schema(ParcelleUpdateSchema)
def update_parcelle(id, current_user, validated_data):
    try:
        parcelle = check_parcelle_ownership(id, current_user)

        if validated_data.surface is not None:
            parcelle.surface = validated_data.surface
        if validated_data.capacite_eau is not None:
            parcelle.capacite_eau = validated_data.capacite_eau
        if validated_data.type_de_sol is not None:
            parcelle.type_de_sol = TypeSol(validated_data.type_de_sol.value)
        if validated_data.latitude is not None:
            parcelle.latitude = validated_data.latitude
        if validated_data.longitude is not None:
            parcelle.longitude = validated_data.longitude
        if validated_data.id_culture is not None:
            parcelle.id_culture = validated_data.id_culture

        db.session.commit()
        return jsonify({"data": parcelle.to_dict(), "message": "Mis à jour"})
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans update_parcelle: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>", methods=["DELETE"])
@require_auth
def delete_parcelle(id, current_user):
    try:
        parcelle = check_parcelle_ownership(id, current_user)
        if parcelle.saison_active:
            return jsonify({"error": "Fermer la saison avant de supprimer"}), 409
        db.session.delete(parcelle)
        db.session.commit()
        return jsonify({"message": "Parcelle supprimée"})
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans delete_parcelle: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>/ouvrir-saison", methods=["POST"])
@require_auth
def ouvrir_saison(id, current_user):
    try:
        parcelle = check_parcelle_ownership(id, current_user)
        if parcelle.saison_active:
            return jsonify({"error": "La saison est déjà active"}), 400

        body = request.get_json(silent=True) or {}
        if "id_culture" in body and body["id_culture"] is not None:
            from app.models.culture import Culture
            if not db.session.get(Culture, body["id_culture"]):
                return jsonify({"error": "Culture introuvable"}), 400
            parcelle.id_culture = body["id_culture"]

        if parcelle.id_culture is None:
            return jsonify({"error": "Impossible d'ouvrir la saison sans culture assignée"}), 400

        parcelle.saison_active = True
        parcelle.date_debut_saison = date.today()

        try:
            db.session.commit()
        except OperationalError as oe:
            db.session.rollback()
            current_app.logger.exception(f"OperationalError dans ouvrir_saison: {oe}")
            err_msg = str(oe.orig) if hasattr(oe, "orig") else str(oe)
            return jsonify({"error": err_msg}), 400

        return jsonify({"data": parcelle.to_dict(), "message": "Saison ouverte"})
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans ouvrir_saison: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>/fermer-saison", methods=["POST"])
@require_auth
def fermer_saison(id, current_user):
    try:
        parcelle = check_parcelle_ownership(id, current_user)
        if not parcelle.saison_active:
            return jsonify({"error": "La saison n'est pas active"}), 400

        parcelle.saison_active = False
        try:
            # Drop the trigger in DB and use Python logic instead
            from app.services.calcul_service import calcul_stress_hydrique
            import json

            # Calculate stress before committing is safe if we use the current database state
            stress_data = calcul_stress_hydrique(parcelle.id_parcelle)

            from app.models.stress_hydrique import StressHydrique, NiveauStress
            new_stress = StressHydrique(
                id_parcelle=parcelle.id_parcelle,
                date_calcul=date.today(),
                niveau_stress=NiveauStress(stress_data["niveau_stress"]),
                besoin_total_saison=stress_data["besoin_total"],
                capacite_source=stress_data["capacite_source"],
                deficit_calcule=stress_data["deficit"],
                alerte_active=stress_data["alerte_active"],
                recommandation=f"Deficit hydrique: {stress_data['deficit']} L. Capacite source: {stress_data['capacite_source']} L. Envisagez des cultures moins gourmandes.",
                cultures_suggere=json.dumps(stress_data["cultures_suggere"])
            )
            db.session.add(new_stress)

            db.session.commit()
        except OperationalError as oe:
            db.session.rollback()
            current_app.logger.exception(f"OperationalError dans fermer_saison: {oe}")
            err_msg = str(oe.orig) if hasattr(oe, "orig") else str(oe)
            return jsonify({"error": "Erreur lors de la clôture", "detail": err_msg}), 500
        except Exception as e:
            db.session.rollback()
            current_app.logger.exception(f"Erreur lors de la création du stress: {e}")
            # Even if stress fails, we want to at least finish the season
            parcelle.saison_active = False
            db.session.commit()

        db.session.refresh(parcelle)
        return jsonify({"data": parcelle.to_dict(), "message": "Saison clôturée. Audit de stress généré."})
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur DB dans fermer_saison: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>/historique-besoins", methods=["GET"])
@require_auth
def historique_besoins(id, current_user):
    try:
        check_parcelle_ownership(id, current_user)

        page = request.args.get("page", 1, type=int)
        per_page = min(request.args.get("per_page", 20, type=int), 100)

        query = BesoinEau.query.filter_by(id_parcelle=id).order_by(BesoinEau.date_besoin.desc())

        depuis = request.args.get("depuis")
        if depuis:
            try:
                depuis_date = datetime.strptime(depuis, "%Y-%m-%d").date()
                query = query.filter(BesoinEau.date_besoin >= depuis_date)
            except ValueError:
                return jsonify({"error": "Format de date invalide (YYYY-MM-DD)"}), 400

        total = query.count()
        pages = max((total + per_page - 1) // per_page, 1)
        besoins = query.offset((page - 1) * per_page).limit(per_page).all()

        return jsonify({"data": [b.to_dict() for b in besoins], "page": page, "total": total, "pages": pages})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans historique_besoins: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>/historique-stress", methods=["GET"])
@require_auth
def historique_stress(id, current_user):
    try:
        check_parcelle_ownership(id, current_user)
        records = StressHydrique.query.filter_by(id_parcelle=id).order_by(StressHydrique.date_calcul.desc()).all()
        return jsonify({"data": [s.to_dict() for s in records]})
    except SQLAlchemyError as e:
        current_app.logger.exception(f"Erreur DB dans historique_stress: {e}")
        return jsonify({"error": "Database error", "detail": str(e)}), 500
