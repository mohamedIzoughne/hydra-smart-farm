from datetime import date, datetime
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from app import db
from app.models.parcelle import Parcelle, TypeSol
from app.models.besoin_eau import BesoinEau
from app.models.stress_hydrique import StressHydrique
from app.services.parcelle_service import validate_parcelle_data, get_parcelle_with_context
from app.utils.auth_helpers import require_auth, check_parcelle_ownership

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
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("", methods=["POST"])
@require_auth
def create_parcelle(current_user):
    body = request.get_json(silent=True) or {}
    # Force ownership
    body["id_agriculteur"] = current_user.id_agriculteur

    try:
        validate_parcelle_data(body, is_create=True)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        parcelle = Parcelle(
            id_agriculteur=current_user.id_agriculteur,
            surface=body["surface"],
            type_de_sol=TypeSol(body["type_de_sol"]),
            capacite_eau=body["capacite_eau"],
            latitude=body.get("latitude"),
            longitude=body.get("longitude"),
            id_culture=body.get("id_culture"),
            saison_active=False,
        )
        db.session.add(parcelle)
        db.session.commit()
        return jsonify({"data": parcelle.to_dict()}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>", methods=["PUT"])
@require_auth
def update_parcelle(id, current_user):
    try:
        parcelle = check_parcelle_ownership(id, current_user)

        body = request.get_json(silent=True) or {}
        for forbidden in ("saison_active", "date_debut_saison", "id_agriculteur"):
            if forbidden in body:
                return jsonify({"error": f"'{forbidden}' ne peut pas être modifié ici."}), 400

        try:
            validate_parcelle_data(body, is_create=False)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        if "surface" in body:
            parcelle.surface = body["surface"]
        if "capacite_eau" in body:
            parcelle.capacite_eau = body["capacite_eau"]
        if "type_de_sol" in body:
            parcelle.type_de_sol = TypeSol(body["type_de_sol"])
        if "latitude" in body:
            parcelle.latitude = body["latitude"]
        if "longitude" in body:
            parcelle.longitude = body["longitude"]
        if "id_culture" in body:
            parcelle.id_culture = body["id_culture"]

        db.session.commit()
        return jsonify({"data": parcelle.to_dict(), "message": "Mis à jour"})
    except SQLAlchemyError as e:
        db.session.rollback()
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
            err_msg = str(oe.orig) if hasattr(oe, "orig") else str(oe)
            return jsonify({"error": err_msg}), 400

        return jsonify({"data": parcelle.to_dict(), "message": "Saison ouverte"})
    except SQLAlchemyError as e:
        db.session.rollback()
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
            db.session.commit()
        except OperationalError as oe:
            db.session.rollback()
            err_msg = str(oe.orig) if hasattr(oe, "orig") else str(oe)
            return jsonify({"error": "Erreur lors de la clôture", "detail": err_msg}), 500

        db.session.refresh(parcelle)
        return jsonify({"data": parcelle.to_dict(), "message": "Saison clôturée. Audit de stress généré."})
    except SQLAlchemyError as e:
        db.session.rollback()
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
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@parcelles_bp.route("/<int:id>/historique-stress", methods=["GET"])
@require_auth
def historique_stress(id, current_user):
    try:
        check_parcelle_ownership(id, current_user)
        records = StressHydrique.query.filter_by(id_parcelle=id).order_by(StressHydrique.date_calcul.desc()).all()
        return jsonify({"data": [s.to_dict() for s in records]})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500
