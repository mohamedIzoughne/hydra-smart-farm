from datetime import datetime, timezone
from app import db


class Agriculteur(db.Model):
    __tablename__ = "agriculteur"

    id_agriculteur = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nom = db.Column(db.String(100), nullable=False)
    mail = db.Column(db.String(150), nullable=False, unique=True)
    mot_de_passe = db.Column(db.String(255), nullable=False)
    date_inscription = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    actif = db.Column(db.Boolean, default=True)

    parcelles = db.relationship("Parcelle", back_populates="agriculteur", lazy="dynamic")

    def to_dict(self):
        return {
            "id_agriculteur": self.id_agriculteur,
            "nom": self.nom,
            "mail": self.mail,
            "date_inscription": self.date_inscription.isoformat() if self.date_inscription else None,
            "actif": self.actif,
        }
