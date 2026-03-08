from app import db


class MesureClimatique(db.Model):
    __tablename__ = "mesure_climatique"

    id_mesure = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_parcelle = db.Column(
        db.Integer,
        db.ForeignKey("parcelle.id_parcelle", ondelete="CASCADE"),
        nullable=False,
    )
    date_prevision = db.Column(db.Date, nullable=False)
    temperature = db.Column(db.Numeric(5, 2), nullable=False)
    pluie = db.Column(db.Numeric(7, 2), nullable=False)
    humidite = db.Column(db.Numeric(5, 2), nullable=True)
    source_api = db.Column(db.String(50), default="OpenMeteo")

    parcelle = db.relationship("Parcelle", back_populates="mesures")
    besoin = db.relationship("BesoinEau", back_populates="mesure", uselist=False)

    __table_args__ = (
        db.UniqueConstraint("id_parcelle", "date_prevision", name="uq_mesure_parcelle_date"),
    )

    def to_dict(self):
        return {
            "id_mesure": self.id_mesure,
            "id_parcelle": self.id_parcelle,
            "date_prevision": self.date_prevision.isoformat() if self.date_prevision else None,
            "temperature": float(self.temperature) if self.temperature else None,
            "pluie": float(self.pluie) if self.pluie else None,
            "humidite": float(self.humidite) if self.humidite else None,
            "source_api": self.source_api,
        }
