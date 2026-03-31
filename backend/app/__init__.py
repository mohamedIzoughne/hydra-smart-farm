import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_apscheduler import APScheduler
from app.utils.security import owasp_input_validation, limiter

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
scheduler = APScheduler()


def create_app(config_class="config.Config"):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Scheduler setup
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        scheduler.init_app(app)
        scheduler.start()
        
        # Register the daily weather sync task
        from app.tasks.weather_tasks import sync_all_active_parcelles
        
        # We uniquely identify the job with 'id'
        if not scheduler.get_job('daily_weather_sync'):
            scheduler.add_job(
                id='hourly_weather_sync',
                func=sync_all_active_parcelles,
                args=[app],
                trigger='cron',
                minute=0
            )

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

    # Enable Rate Limiting (DoS Mitigation) globally
    limiter.init_app(app)
    
    # Enable Global OWASP Input/Output sanitization
    owasp_input_validation(app)

    # Register blueprints
    from app.routes import register_routes
    register_routes(app)

    _setup_logging(app)
    _setup_error_handlers(app)

    return app


def _setup_logging(app):
    """Configure logging for the application."""
    if not os.path.exists('logs'):
        os.mkdir('logs')

    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)

    app.logger.setLevel(logging.INFO)
    app.logger.info('Hydra Smart Farm backend startup')


def _setup_error_handlers(app):
    """Global error handlers for the Flask app."""
    
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({"error": "Ressource non trouvée"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        app.logger.error(f"Server Error: {error}")
        return jsonify({"error": "Erreur interne du serveur"}), 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle all other exceptions."""
        # Log the full exception
        app.logger.exception(f"Unhandled Exception: {e}")
        return jsonify({
            "error": "Une erreur inattendue est survenue",
            "detail": str(e) if app.debug else None
        }), 500

    # Specific JWT error handlers
    from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError, WrongTokenError

    @app.errorhandler(NoAuthorizationError)
    def handle_auth_error(e):
        app.logger.warning(f"Auth Missing: {e}")
        return jsonify({"error": "Authentification requise"}), 401

    @app.errorhandler(InvalidHeaderError)
    def handle_invalid_header_error(e):
        app.logger.warning(f"Invalid JWT Header: {e}")
        return jsonify({"error": "En-tête d'authentification invalide (JWT malformé)"}), 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Le jeton a expiré", "code": "token_expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        app.logger.warning(f"Invalid Token: {error}")
        return jsonify({"error": "Jeton invalide", "detail": error}), 422
