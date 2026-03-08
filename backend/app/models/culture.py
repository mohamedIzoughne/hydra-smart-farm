from app import db


class Culture(db.Model):
    __tablename__ = "culture"

    id_culture = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nom_culture = db.Column(db.String(80), nullable=False, unique=True)
    besoin_eau_base = db.Column(db.Numeric(8, 2), nullable=False)
    seuil_stress_hyd = db.Column(db.Numeric(5, 2), nullable=False)
    coeff_sol_sable = db.Column(db.Numeric(4, 2), default=1.30)
    coeff_sol_limon = db.Column(db.Numeric(4, 2), default=1.00)
    coeff_sol_argile = db.Column(db.Numeric(4, 2), default=0.75)

    parcelles = db.relationship("Parcelle", back_populates="culture", lazy="dynamic")

    __table_args__ = (
        db.CheckConstraint("besoin_eau_base > 0", name="ck_culture_besoin_eau_pos"),
        db.CheckConstraint("seuil_stress_hyd >= 0 AND seuil_stress_hyd <= 100", name="ck_culture_seuil_range"),
    )

    def to_dict(self):
        return {
            "id_culture": self.id_culture,
            "nom_culture": self.nom_culture,
            "besoin_eau_base": float(self.besoin_eau_base) if self.besoin_eau_base else None,
            "seuil_stress_hyd": float(self.seuil_stress_hyd) if self.seuil_stress_hyd else None,
            "coeff_sol_sable": float(self.coeff_sol_sable) if self.coeff_sol_sable else None,
            "coeff_sol_limon": float(self.coeff_sol_limon) if self.coeff_sol_limon else None,
            "coeff_sol_argile": float(self.coeff_sol_argile) if self.coeff_sol_argile else None,
        }
