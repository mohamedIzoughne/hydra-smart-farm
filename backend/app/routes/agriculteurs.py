from flask import Blueprint, jsonify
from sqlalchemy.exc import SQLAlchemyError
from app.utils.auth_helpers import require_auth

agriculteurs_bp = Blueprint("agriculteurs", __name__, url_prefix="/api/agriculteurs")


@agriculteurs_bp.route("/<int:id>", methods=["GET"])
@require_auth
def get_agriculteur(id, current_user):
    if id != current_user.id_agriculteur:
        return jsonify({"error": "Accès refusé"}), 403
    return jsonify({"data": current_user.to_dict()})
