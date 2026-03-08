from functools import wraps
from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.agriculteur import Agriculteur


def require_auth(fn):
    """Decorator that enforces JWT auth and injects current_user into the route."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        identity = get_jwt_identity()
        user = db.session.get(Agriculteur, identity["id"])
        if not user or not user.actif:
            return jsonify({"error": "Utilisateur non trouvé ou désactivé"}), 401
        kwargs["current_user"] = user
        return fn(*args, **kwargs)
    return wrapper
