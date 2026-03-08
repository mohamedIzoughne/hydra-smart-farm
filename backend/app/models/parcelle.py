import enum
from app import db


class TypeSol(enum.Enum):
    Sable = "Sable"
    Limon = "Limon"
    Argile = "Argile"


class Parcelle(db.Model):
    __tablename__ = "parcelle"

    id_parcelle = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_agriculteur = db.Column(
        db.Integer,
        db.ForeignKey("agriculteur.id_agriculteur", ondelete="RESTRICT"),
        nullable=False,
    )
    id_culture = db.Column(
        db.Integer,
        db.ForeignKey("culture.id_culture", ondelete="SET NULL"),
        nullable=True,
    )
    surface = db.Column(db.Numeric(10, 2), nullable=False)
    type_de_sol = db.Column(db.Enum(TypeSol), nullable=False)
    capacite_eau = db.Column(db.Numeric(10, 2), nullable=False)
    latitude = db.Column(db.Numeric(9, 6), nullable=True)
    longitude = db.Column(db.Numeric(9, 6), nullable=True)
    saison_active = db.Column(db.Boolean, default=False)
    date_debut_saison = db.Column(db.Date, nullable=True)

    agriculteur = db.relationship("Agriculteur", back_populates="parcelles")
    culture = db.relationship("Culture", back_populates="parcelles")
    mesures = db.relationship("MesureClimatique", back_populates="parcelle", lazy="dynamic", cascade="all, delete-orphan")
    besoins = db.relationship("BesoinEau", back_populates="parcelle", lazy="dynamic", cascade="all, delete-orphan")
    stress = db.relationship("StressHydrique", back_populates="parcelle", lazy="dynamic", cascade="all, delete-orphan")

    __table_args__ = (
        db.CheckConstraint("surface > 0", name="ck_parcelle_surface_pos"),
        db.CheckConstraint("capacite_eau > 0", name="ck_parcelle_capacite_pos"),
    )

    def to_dict(self):
        return {
            "id_parcelle": self.id_parcelle,
            "id_agriculteur": self.id_agriculteur,
            "id_culture": self.id_culture,
            "surface": float(self.surface) if self.surface else None,
            "type_de_sol": self.type_de_sol.value if self.type_de_sol else None,
            "capacite_eau": float(self.capacite_eau) if self.capacite_eau else None,
            "latitude": float(self.latitude) if self.latitude else None,
            "longitude": float(self.longitude) if self.longitude else None,
            "saison_active": self.saison_active,
            "date_debut_saison": self.date_debut_saison.isoformat() if self.date_debut_saison else None,
        }
