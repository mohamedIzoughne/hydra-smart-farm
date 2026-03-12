import re
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
)
from app import db
from app.models.agriculteur import Agriculteur
from app.utils.security import limiter, validate_schema
from app.schemas import SignupSchema, LoginSchema, PasswordChangeSchema, AgriculteurUpdateSchema

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# ── SIGNUP ───────────────────────────────────────────────────
@auth_bp.route("/signup", methods=["POST"])
@limiter.limit("5 per minute")
@validate_schema(SignupSchema)
def signup(validated_data):
    mail = validated_data.mail
    nom = validated_data.nom
    mot_de_passe = validated_data.mot_de_passe

    try:
        if Agriculteur.query.filter_by(mail=mail).first():
            return jsonify({"error": "Cet email est déjà utilisé"}), 409

        agri = Agriculteur(
            nom=nom,
            mail=mail,
            mot_de_passe=generate_password_hash(mot_de_passe),
        )
        db.session.add(agri)
        db.session.commit()

        identity = str(agri.id_agriculteur)
        return jsonify({
            "access_token": create_access_token(identity=identity),
            "refresh_token": create_refresh_token(identity=identity),
            "user": agri.to_dict(),
        }), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── LOGIN ────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
@validate_schema(LoginSchema)
def login(validated_data):
    mail = validated_data.mail
    mot_de_passe = validated_data.mot_de_passe

    try:
        agri = Agriculteur.query.filter_by(mail=mail).first()
        if not agri or not agri.actif or not agri.check_password(mot_de_passe):
            return jsonify({"error": "Identifiants invalides"}), 401

        identity = str(agri.id_agriculteur)
        return jsonify({
            "access_token": create_access_token(identity=identity),
            "refresh_token": create_refresh_token(identity=identity),
            "user": agri.to_dict(),
        })
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── REFRESH ──────────────────────────────────────────────────
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    return jsonify({"access_token": create_access_token(identity=identity)})


# ── LOGOUT ───────────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    return jsonify({"message": "Déconnecté"})


# ── GET ME ───────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    identity = get_jwt_identity()
    try:
        agri = db.session.get(Agriculteur, int(identity))
        if not agri or not agri.actif:
            return jsonify({"error": "Utilisateur non trouvé"}), 401
        return jsonify({"data": agri.to_dict()})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── UPDATE ME ────────────────────────────────────────────────
@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
@validate_schema(AgriculteurUpdateSchema)
def update_me(validated_data):
    identity = get_jwt_identity()
    try:
        agri = db.session.get(Agriculteur, int(identity))
        if not agri or not agri.actif:
            return jsonify({"error": "Utilisateur non trouvé"}), 401

        if validated_data.nom is not None:
            agri.nom = validated_data.nom

        if validated_data.mail is not None:
            mail = validated_data.mail
            existing = Agriculteur.query.filter(
                Agriculteur.mail == mail,
                Agriculteur.id_agriculteur != agri.id_agriculteur,
            ).first()
            if existing:
                return jsonify({"error": "Cet email est déjà utilisé"}), 409
            agri.mail = mail

        db.session.commit()
        return jsonify({"data": agri.to_dict(), "message": "Profil mis à jour"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── CHANGE PASSWORD ──────────────────────────────────────────
@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
@validate_schema(PasswordChangeSchema)
def change_password(validated_data):
    identity = get_jwt_identity()
    try:
        agri = db.session.get(Agriculteur, int(identity))
        if not agri or not agri.actif:
            return jsonify({"error": "Utilisateur non trouvé"}), 401

        if not agri.check_password(validated_data.ancien_mot_de_passe):
            return jsonify({"error": "Ancien mot de passe incorrect"}), 400

        agri.mot_de_passe = generate_password_hash(validated_data.nouveau_mot_de_passe)
        db.session.commit()
        return jsonify({"message": "Mot de passe modifié"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500
