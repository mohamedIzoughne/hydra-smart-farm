import re
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash
from app import db
from app.models.agriculteur import Agriculteur
from app.models.parcelle import Parcelle

agriculteurs_bp = Blueprint("agriculteurs", __name__, url_prefix="/api/agriculteurs")

EMAIL_RE = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


@agriculteurs_bp.route("", methods=["GET"])
def list_agriculteurs():
    try:
        include_inactive = request.args.get("include_inactive", "false").lower() == "true"
        query = Agriculteur.query
        if not include_inactive:
            query = query.filter_by(actif=True)
        agriculteurs = query.all()
        return jsonify({"data": [a.to_dict() for a in agriculteurs], "total": len(agriculteurs)})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@agriculteurs_bp.route("/<int:id>", methods=["GET"])
def get_agriculteur(id):
    try:
        agri = db.session.get(Agriculteur, id)
        if not agri:
            return jsonify({"error": "Agriculteur non trouvé"}), 404
        data = agri.to_dict()
        data["parcelles"] = [p.to_dict() for p in agri.parcelles.all()]
        return jsonify({"data": data})
    except SQLAlchemyError as e:
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@agriculteurs_bp.route("", methods=["POST"])
def create_agriculteur():
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
    if len(mot_de_passe) < 6:
        return jsonify({"error": "Le mot de passe doit contenir au moins 6 caractères"}), 400

    try:
        if Agriculteur.query.filter_by(mail=mail).first():
            return jsonify({"error": "Cette adresse mail est déjà utilisée"}), 409

        agri = Agriculteur(
            nom=nom,
            mail=mail,
            mot_de_passe=generate_password_hash(mot_de_passe),
        )
        db.session.add(agri)
        db.session.commit()
        return jsonify({"data": agri.to_dict(), "message": "Agriculteur créé"}), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@agriculteurs_bp.route("/<int:id>", methods=["PUT"])
def update_agriculteur(id):
    try:
        agri = db.session.get(Agriculteur, id)
        if not agri:
            return jsonify({"error": "Agriculteur non trouvé"}), 404

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
            existing = Agriculteur.query.filter(Agriculteur.mail == mail, Agriculteur.id_agriculteur != id).first()
            if existing:
                return jsonify({"error": "Cette adresse mail est déjà utilisée"}), 409
            agri.mail = mail

        if "actif" in body:
            agri.actif = bool(body["actif"])

        db.session.commit()
        return jsonify({"data": agri.to_dict(), "message": "Mis à jour"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500


@agriculteurs_bp.route("/<int:id>", methods=["DELETE"])
def delete_agriculteur(id):
    try:
        agri = db.session.get(Agriculteur, id)
        if not agri:
            return jsonify({"error": "Agriculteur non trouvé"}), 404

        active_parcelles = Parcelle.query.filter_by(id_agriculteur=id, saison_active=True).first()
        if active_parcelles:
            return jsonify({"error": "Impossible de désactiver : des parcelles ont une saison active"}), 409

        agri.actif = False
        db.session.commit()
        return jsonify({"message": "Agriculteur désactivé"})
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": "Database error", "detail": str(e)}), 500
