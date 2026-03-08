from datetime import date, datetime
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from app import db
from app.models.parcelle import Parcelle, TypeSol
from app.models.besoin_eau import BesoinEau
from app.models.stress_hydrique import StressHydrique
from app.services.parcelle_service import validate_parcelle_data, get_parcelle_with_context

parcelles_bp = Blueprint("parcelles", __name__, url_prefix="/api/parcelles")


# ── LIST ─────────────────────────────────────────────────────
@parcelles_bp.route("", methods=["GET"])
def list_parcelles():
    try:
        query = Parcelle.query

        agri_id = request.args.get("agriculteur_id")
        if agri_id is not None:
            try:
                query = query.filter_by(id_agriculteur=int(agri_id))
            except ValueError:
                return jsonify({"error": "agriculteur_id doit être un entier"}), 400

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


# ── GET ONE ──────────────────────────────────────────────────
@parcelles_bp.route("/<int:id>", methods=["GET"])
def get_parcelle(id):
    try:
        data = get_parcelle_with_context(id)
        if not data:
            return jsonify({"error": "Parcelle non trouvée"}), 404
        return jsonify({"data": data})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── CREATE ───────────────────────────────────────────────────
@parcelles_bp.route("", methods=["POST"])
def create_parcelle():
    body = request.get_json(silent=True) or {}

    try:
        validate_parcelle_data(body, is_create=True)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        parcelle = Parcelle(
            id_agriculteur=body["id_agriculteur"],
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


# ── UPDATE ───────────────────────────────────────────────────
@parcelles_bp.route("/<int:id>", methods=["PUT"])
def update_parcelle(id):
    try:
        parcelle = db.session.get(Parcelle, id)
        if not parcelle:
            return jsonify({"error": "Parcelle non trouvée"}), 404

        body = request.get_json(silent=True) or {}

        # Block season fields
        for forbidden in ("saison_active", "date_debut_saison"):
            if forbidden in body:
                return jsonify({"error": f"'{forbidden}' ne peut pas être modifié ici. Utilisez les endpoints de saison."}), 400

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


# ── DELETE ───────────────────────────────────────────────────
@parcelles_bp.route("/<int:id>", methods=["DELETE"])
def delete_parcelle(id):
    try:
        parcelle = db.session.get(Parcelle, id)
        if not parcelle:
            return jsonify({"error": "Parcelle non trouvée"}), 404
        if parcelle.saison_active:
            return jsonify({"error": "Fermer la saison avant de supprimer"}), 409

        db.session.delete(parcelle)
        db.session.commit()
        return jsonify({"message": "Parcelle supprimée"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── OUVRIR SAISON ────────────────────────────────────────────
@parcelles_bp.route("/<int:id>/ouvrir-saison", methods=["POST"])
def ouvrir_saison(id):
    try:
        parcelle = db.session.get(Parcelle, id)
        if not parcelle:
            return jsonify({"error": "Parcelle non trouvée"}), 404
        if parcelle.saison_active:
            return jsonify({"error": "La saison est déjà active"}), 400

        body = request.get_json(silent=True) or {}

        # Optionally update culture before opening
        if "id_culture" in body and body["id_culture"] is not None:
            from app.models.culture import Culture
            if not db.session.get(Culture, body["id_culture"]):
                return jsonify({"error": "Culture introuvable"}), 400
            parcelle.id_culture = body["id_culture"]

        # Application-level check (DB trigger also enforces)
        if parcelle.id_culture is None:
            return jsonify({"error": "Impossible d'ouvrir la saison sans culture assignée"}), 400

        parcelle.saison_active = True
        parcelle.date_debut_saison = date.today()

        try:
            db.session.commit()
        except OperationalError as oe:
            db.session.rollback()
            # Catch MySQL SIGNAL SQLSTATE '45000' from trg_ouverture_saison
            err_msg = str(oe.orig) if hasattr(oe, "orig") else str(oe)
            return jsonify({"error": err_msg}), 400

        return jsonify({"data": parcelle.to_dict(), "message": "Saison ouverte"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── FERMER SAISON ────────────────────────────────────────────
@parcelles_bp.route("/<int:id>/fermer-saison", methods=["POST"])
def fermer_saison(id):
    try:
        parcelle = db.session.get(Parcelle, id)
        if not parcelle:
            return jsonify({"error": "Parcelle non trouvée"}), 404
        if not parcelle.saison_active:
            return jsonify({"error": "La saison n'est pas active"}), 400

        parcelle.saison_active = False

        try:
            db.session.commit()
        except OperationalError as oe:
            db.session.rollback()
            err_msg = str(oe.orig) if hasattr(oe, "orig") else str(oe)
            return jsonify({"error": "Erreur lors de la clôture", "detail": err_msg}), 500

        # Refresh to pick up any trigger-created data
        db.session.refresh(parcelle)
        return jsonify({"data": parcelle.to_dict(), "message": "Saison clôturée. Audit de stress généré."})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── HISTORIQUE BESOINS (paginated) ───────────────────────────
@parcelles_bp.route("/<int:id>/historique-besoins", methods=["GET"])
def historique_besoins(id):
    try:
        parcelle = db.session.get(Parcelle, id)
        if not parcelle:
            return jsonify({"error": "Parcelle non trouvée"}), 404

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        per_page = min(per_page, 100)  # cap

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

        return jsonify({
            "data": [b.to_dict() for b in besoins],
            "page": page,
            "total": total,
            "pages": pages,
        })
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── HISTORIQUE STRESS ────────────────────────────────────────
@parcelles_bp.route("/<int:id>/historique-stress", methods=["GET"])
def historique_stress(id):
    try:
        parcelle = db.session.get(Parcelle, id)
        if not parcelle:
            return jsonify({"error": "Parcelle non trouvée"}), 404

        stress_records = (
            StressHydrique.query
            .filter_by(id_parcelle=id)
            .order_by(StressHydrique.date_calcul.desc())
            .all()
        )
        return jsonify({"data": [s.to_dict() for s in stress_records]})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500
