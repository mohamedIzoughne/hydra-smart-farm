import enum
from app import db


class GenerePar(enum.Enum):
    Systeme = "Système"
    Manuel = "Manuel"


class BesoinEau(db.Model):
    __tablename__ = "besoin_eau"

    id_besoin = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_parcelle = db.Column(
        db.Integer,
        db.ForeignKey("parcelle.id_parcelle", ondelete="CASCADE"),
        nullable=False,
    )
    id_mesure = db.Column(
        db.Integer,
        db.ForeignKey("mesure_climatique.id_mesure", ondelete="RESTRICT"),
        nullable=False,
    )
    date_besoin = db.Column(db.Date, nullable=False)
    volume_recommande = db.Column(db.Numeric(10, 2), nullable=False)
    volume_applique = db.Column(db.Numeric(10, 2), nullable=True)
    genere_par = db.Column(db.Enum(GenerePar), default=GenerePar.Systeme)

    parcelle = db.relationship("Parcelle", back_populates="besoins")
    mesure = db.relationship("MesureClimatique", back_populates="besoin")

    __table_args__ = (
        db.UniqueConstraint("id_parcelle", "date_besoin", name="uq_besoin_parcelle_date"),
    )

    def to_dict(self):
        return {
            "id_besoin": self.id_besoin,
            "id_parcelle": self.id_parcelle,
            "id_mesure": self.id_mesure,
            "date_besoin": self.date_besoin.isoformat() if self.date_besoin else None,
            "volume_recommande": float(self.volume_recommande) if self.volume_recommande else None,
            "volume_applique": float(self.volume_applique) if self.volume_applique else None,
            "genere_par": self.genere_par.value if self.genere_par else None,
        }
