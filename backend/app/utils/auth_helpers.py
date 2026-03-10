from functools import wraps
from flask import jsonify, abort, current_app, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.agriculteur import Agriculteur
from app.models.parcelle import Parcelle
from app.models.mesure_climatique import MesureClimatique
from app.models.besoin_eau import BesoinEau
from app.models.stress_hydrique import StressHydrique


def require_auth(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()
        try:
            # Identity is stored as a string ID in the JWT
            user_id = int(identity)
            user = db.session.get(Agriculteur, user_id)
        except (ValueError, TypeError) as e:
            current_app.logger.error(f"Invalid identity format in JWT: {identity}. Error: {e}")
            return jsonify({"error": "Jeton malformé (identité invalide)"}), 422

        if not user or not user.actif:
            current_app.logger.warning(f"Auth failed for user ID {identity}: Not found or inactive")
            return jsonify({"error": "Utilisateur non trouvé ou désactivé"}), 401
        
        current_app.logger.info(f"User {user.mail} accessed {request.path}")
        kwargs["current_user"] = user
        return fn(*args, **kwargs)
    return wrapper


def check_parcelle_ownership(parcelle_id, current_user):
    parcelle = db.session.get(Parcelle, parcelle_id)
    if not parcelle:
        abort(404, description="Parcelle non trouvée")
    if parcelle.id_agriculteur != current_user.id_agriculteur:
        abort(403, description="Accès refusé — cette parcelle ne vous appartient pas")
    return parcelle


def check_mesure_ownership(mesure_id, current_user):
    mesure = db.session.get(MesureClimatique, mesure_id)
    if not mesure:
        abort(404, description="Mesure non trouvée")
    check_parcelle_ownership(mesure.id_parcelle, current_user)
    return mesure


def check_besoin_ownership(besoin_id, current_user):
    besoin = db.session.get(BesoinEau, besoin_id)
    if not besoin:
        abort(404, description="Besoin non trouvé")
    check_parcelle_ownership(besoin.id_parcelle, current_user)
    return besoin


def check_stress_ownership(stress_id, current_user):
    stress = db.session.get(StressHydrique, stress_id)
    if not stress:
        abort(404, description="Enregistrement non trouvé")
    check_parcelle_ownership(stress.id_parcelle, current_user)
    return stress
