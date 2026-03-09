from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_class="config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Explicit CORS setup — required for JWT Bearer token to flow from
    # the Vite dev server (localhost:8080) to the Flask API (localhost:5000).
    CORS(
        app,
        origins=app.config.get("CORS_ORIGINS", "http://localhost:8080"),
        supports_credentials=app.config.get("CORS_SUPPORTS_CREDENTIALS", True),
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        expose_headers=["Authorization"],
    )

    # Import models so Alembic sees them
    from app import models  # noqa: F401

    # Register blueprints
    from app.routes import register_routes
    register_routes(app)

    return app
