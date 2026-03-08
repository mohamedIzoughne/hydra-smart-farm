from app.routes.agriculteurs import agriculteurs_bp
from app.routes.cultures import cultures_bp


def register_routes(app):
    app.register_blueprint(agriculteurs_bp)
    app.register_blueprint(cultures_bp)
