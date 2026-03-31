import enum
from datetime import date
from app import db


class NiveauStress(enum.Enum):
    Faible = "Faible"
    Moyen = "Moyen"
    Eleve = "Eleve"
    Critique = "Critique"


class StressHydrique(db.Model):
    __tablename__ = "stress_hydrique"

    id_stress = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_parcelle = db.Column(
        db.Integer,
        db.ForeignKey("parcelle.id_parcelle", ondelete="CASCADE"),
        nullable=False,
    )
    date_calcul = db.Column(db.Date, nullable=False, default=date.today)
    niveau_stress = db.Column(db.Enum(NiveauStress), nullable=False)
    besoin_total_saison = db.Column(db.Numeric(12, 2), nullable=False)
    capacite_source = db.Column(db.Numeric(10, 2), nullable=False)
    deficit_calcule = db.Column(db.Numeric(12, 2), nullable=False)
    alerte_active = db.Column(db.Boolean, default=False)
    recommandation = db.Column(db.Text, nullable=True)
    cultures_suggere = db.Column(db.Text, nullable=True)

    parcelle = db.relationship("Parcelle", back_populates="stress")

    def to_dict(self):
        return {
            "id_stress": self.id_stress,
            "id_parcelle": self.id_parcelle,
            "date_calcul": self.date_calcul.isoformat() if self.date_calcul else None,
            "niveau_stress": self.niveau_stress.value if self.niveau_stress else None,
            "besoin_total_saison": float(self.besoin_total_saison) if self.besoin_total_saison else None,
            "capacite_source": float(self.capacite_source) if self.capacite_source else None,
            "deficit_calcule": float(self.deficit_calcule) if self.deficit_calcule else None,
            "alerte_active": self.alerte_active,
            "recommandation": self.recommandation,
            "cultures_suggere": self.cultures_suggere,
        }
