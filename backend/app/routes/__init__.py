from app.routes.agriculteurs import agriculteurs_bp
from app.routes.cultures import cultures_bp
from app.routes.parcelles import parcelles_bp
from app.routes.mesures import mesures_bp
from app.routes.besoins import besoins_bp
from app.routes.stress import stress_bp
from app.routes.auth import auth_bp


def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(agriculteurs_bp)
    app.register_blueprint(cultures_bp)
    app.register_blueprint(parcelles_bp)
    app.register_blueprint(mesures_bp)
    app.register_blueprint(besoins_bp)
    app.register_blueprint(stress_bp)
