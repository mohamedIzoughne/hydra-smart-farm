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

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


# ── SIGNUP ───────────────────────────────────────────────────
@auth_bp.route("/signup", methods=["POST"])
def signup():
    body = request.get_json(silent=True) or {}
    nom = (body.get("nom") or "").strip()
    mail = (body.get("mail") or "").strip()
    mot_de_passe = body.get("mot_de_passe") or ""

    if not nom or not mail or not mot_de_passe:
        return jsonify({"error": "Les champs nom, mail et mot_de_passe sont requis"}), 400
    if len(nom) > 100:
        return jsonify({"error": "Le nom ne doit pas dépasser 100 caractères"}), 400
    if len(mail) > 150 or not EMAIL_RE.match(mail):
        return jsonify({"error": "Adresse mail invalide"}), 400
    if len(mot_de_passe) < 8:
        return jsonify({"error": "Le mot de passe doit contenir au moins 8 caractères"}), 400

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

        identity = {"id": agri.id_agriculteur}
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
def login():
    body = request.get_json(silent=True) or {}
    mail = (body.get("mail") or "").strip()
    mot_de_passe = body.get("mot_de_passe") or ""

    if not mail or not mot_de_passe:
        return jsonify({"error": "Les champs mail et mot_de_passe sont requis"}), 400

    try:
        agri = Agriculteur.query.filter_by(mail=mail).first()
        if not agri or not agri.actif or not agri.check_password(mot_de_passe):
            return jsonify({"error": "Identifiants invalides"}), 401

        identity = {"id": agri.id_agriculteur}
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
        agri = db.session.get(Agriculteur, identity["id"])
        if not agri or not agri.actif:
            return jsonify({"error": "Utilisateur non trouvé"}), 401
        return jsonify({"data": agri.to_dict()})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


# ── UPDATE ME ────────────────────────────────────────────────
@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    identity = get_jwt_identity()
    try:
        agri = db.session.get(Agriculteur, identity["id"])
        if not agri or not agri.actif:
            return jsonify({"error": "Utilisateur non trouvé"}), 401

        body = request.get_json(silent=True) or {}

        if "nom" in body:
            nom = (body["nom"] or "").strip()
            if not nom or len(nom) > 100:
                return jsonify({"error": "Nom invalide"}), 400
            agri.nom = nom

        if "mail" in body:
            mail = (body["mail"] or "").strip()
            if len(mail) > 150 or not EMAIL_RE.match(mail):
                return jsonify({"error": "Adresse mail invalide"}), 400
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
def change_password():
    identity = get_jwt_identity()
    try:
        agri = db.session.get(Agriculteur, identity["id"])
        if not agri or not agri.actif:
            return jsonify({"error": "Utilisateur non trouvé"}), 401

        body = request.get_json(silent=True) or {}
        ancien = body.get("ancien_mot_de_passe") or ""
        nouveau = body.get("nouveau_mot_de_passe") or ""
        confirmation = body.get("confirmation") or ""

        if not ancien or not nouveau or not confirmation:
            return jsonify({"error": "Tous les champs sont requis"}), 400
        if not agri.check_password(ancien):
            return jsonify({"error": "Ancien mot de passe incorrect"}), 400
        if len(nouveau) < 8:
            return jsonify({"error": "Le nouveau mot de passe doit contenir au moins 8 caractères"}), 400
        if nouveau != confirmation:
            return jsonify({"error": "Le nouveau mot de passe et la confirmation ne correspondent pas"}), 400

        agri.mot_de_passe = generate_password_hash(nouveau)
        db.session.commit()
        return jsonify({"message": "Mot de passe modifié"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500
