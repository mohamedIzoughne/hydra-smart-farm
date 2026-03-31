"""
Weather routes — fetch Open-Meteo forecast/history for a parcelle
and optionally auto-create mesures + besoins from forecast data.
"""

from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app import db
from app.models.parcelle import Parcelle
from app.models.culture import Culture
from app.models.mesure_climatique import MesureClimatique
from app.models.besoin_eau import BesoinEau, GenerePar
from app.services.weather_service import fetch_forecast, fetch_historical
from app.services.calcul_service import calcul_volume_besoin
from app.utils.auth_helpers import require_auth, check_parcelle_ownership

weather_bp = Blueprint("weather", __name__, url_prefix="/api/weather")


@weather_bp.route("/forecast/<int:parcelle_id>", methods=["GET"])
@require_auth
def get_forecast(parcelle_id, current_user):
    """
    GET /api/weather/forecast/<parcelle_id>?days=7
    Returns raw Open-Meteo forecast for the parcelle's coordinates.
    """
    try:
        parcelle = check_parcelle_ownership(parcelle_id, current_user)
    except Exception as e:
        current_app.logger.exception(f"Exception lors de la vérification de la parcelle: {e}")
        return jsonify({"error": "Parcelle introuvable ou accès refusé"}), 404

    if not parcelle.latitude or not parcelle.longitude:
        return jsonify({"error": "Cette parcelle n'a pas de coordonnées GPS (latitude/longitude)"}), 400

    days = request.args.get("days", 7, type=int)
    days = max(1, min(days, 16))

    try:
        forecasts = fetch_forecast(
            float(parcelle.latitude),
            float(parcelle.longitude),
            days=days,
        )
        print('---The forecasts--', forecasts)
        return jsonify({
            "parcelle_id": parcelle_id,
            "latitude": float(parcelle.latitude),
            "longitude": float(parcelle.longitude),
            "source": "OpenMeteo",
            "forecast_days": len(forecasts),
            "data": forecasts,
        })
    except Exception as e:
        current_app.logger.exception(f"Erreur API OpenMeteo forecast: {e}")
        return jsonify({"error": "Erreur lors de la récupération météo", "detail": str(e)}), 502


@weather_bp.route("/history/<int:parcelle_id>", methods=["GET"])
@require_auth
def get_history(parcelle_id, current_user):
    """
    GET /api/weather/history/<parcelle_id>?start=2026-01-01&end=2026-03-01
    Returns historical weather data from Open-Meteo Archive.
    """
    try:
        parcelle = check_parcelle_ownership(parcelle_id, current_user)
    except Exception as e:
        current_app.logger.exception(f"Exception lors de la vérification de la parcelle: {e}")
        return jsonify({"error": "Parcelle introuvable ou accès refusé"}), 404

    if not parcelle.latitude or not parcelle.longitude:
        return jsonify({"error": "Cette parcelle n'a pas de coordonnées GPS"}), 400

    start = request.args.get("start")
    end = request.args.get("end")
    if not start or not end:
        return jsonify({"error": "Paramètres 'start' et 'end' requis (YYYY-MM-DD)"}), 400

    try:
        datetime.strptime(start, "%Y-%m-%d")
        datetime.strptime(end, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Format de date invalide (YYYY-MM-DD)"}), 400

    try:
        history = fetch_historical(
            float(parcelle.latitude),
            float(parcelle.longitude),
            start_date=start,
            end_date=end,
        )
        return jsonify({
            "parcelle_id": parcelle_id,
            "source": "OpenMeteo Archive",
            "data": history,
        })
    except Exception as e:
        current_app.logger.exception(f"Erreur API OpenMeteo Archives: {e}")
        return jsonify({"error": "Erreur lors de la récupération historique", "detail": str(e)}), 502


@weather_bp.route("/sync/<int:parcelle_id>", methods=["POST"])
@require_auth
def sync_forecast(parcelle_id, current_user):
    """
    POST /api/weather/sync/<parcelle_id>?days=7
    Fetches forecast from Open-Meteo and auto-creates mesures + besoins
    for days that don't already have a mesure.
    Requires the parcelle to have an active season.
    """
    try:
        parcelle = check_parcelle_ownership(parcelle_id, current_user)
    except Exception as e:
        current_app.logger.exception(f"Exception lors de la vérification de la parcelle: {e}")
        return jsonify({"error": "Parcelle introuvable ou accès refusé"}), 404

    if not parcelle.latitude or not parcelle.longitude:
        return jsonify({"error": "Cette parcelle n'a pas de coordonnées GPS"}), 400

    if not parcelle.saison_active:
        return jsonify({"error": "La saison de cette parcelle n'est pas active"}), 400

    days = request.args.get("days", 7, type=int)
    days = max(1, min(days, 16))

    try:
        forecasts = fetch_forecast(
            float(parcelle.latitude),
            float(parcelle.longitude),
            days=days,
        )
        print('forecasts---', forecasts)
    except Exception as e:
        current_app.logger.exception(f"Erreur d'API OpenMeteo: {e}")
        return jsonify({"error": "Erreur API météo", "detail": str(e)}), 502

    culture = db.session.get(Culture, parcelle.id_culture) if parcelle.id_culture else None

    created_mesures = []
    skipped_dates = []

    try:
        for day in forecasts:
            date_prev = datetime.strptime(day["date"], "%Y-%m-%d").date()

            # Skip if mesure already exists for this parcelle+date
            existing = MesureClimatique.query.filter_by(
                id_parcelle=parcelle_id,
                date_prevision=date_prev,
            ).first()

            temp = day.get("temperature_mean") or day.get("temperature_max") or 0
            pluie = day.get("precipitation_sum") or 0
            humidity = day.get("relative_humidity_mean")

            if existing:
                existing.temperature = temp
                existing.pluie = pluie
                existing.humidite = humidity
                
                # Update besoin if needed
                if culture:
                    volume = calcul_volume_besoin(parcelle, culture, existing)
                    existing_besoin = BesoinEau.query.filter_by(
                        id_parcelle=parcelle_id,
                        date_besoin=date_prev
                    ).first()
                    
                    if not existing_besoin:
                        besoin = BesoinEau(
                            id_parcelle=parcelle_id,
                            id_mesure=existing.id_mesure,
                            date_besoin=date_prev,
                            volume_recommande=volume,
                            genere_par=GenerePar.Systeme,
                        )
                        db.session.add(besoin)
                    elif existing_besoin.volume_applique is None:
                        existing_besoin.volume_recommande = volume

                skipped_dates.append(day["date"])
                continue

            mesure = MesureClimatique(
                id_parcelle=parcelle_id,
                date_prevision=date_prev,
                temperature=temp,
                pluie=pluie,
                humidite=humidity,
                source_api="OpenMeteo",
            )
            db.session.add(mesure)
            db.session.flush()  # get mesure ID

            # Auto-create besoin
            if culture:
                volume = calcul_volume_besoin(parcelle, culture, mesure)
                besoin = BesoinEau(
                    id_parcelle=parcelle_id,
                    id_mesure=mesure.id_mesure,
                    date_besoin=date_prev,
                    volume_recommande=volume,
                    genere_par=GenerePar.Systeme,
                )
                db.session.add(besoin)

            created_mesures.append({
                "date": day["date"],
                "temperature": temp,
                "pluie": pluie,
                "humidite": humidity,
            })

        db.session.commit()

        return jsonify({
            "message": f"{len(created_mesures)} mesure(s) créée(s), {len(skipped_dates)} date(s) ignorée(s)",
            "created": created_mesures,
            "skipped_dates": skipped_dates,
            "parcelle_id": parcelle_id,
        }), 201

    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur d'intégrité (mesure déjà existante): {e}")
        return jsonify({"error": "Conflit de données (mesure déjà existante)"}), 409
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.exception(f"Erreur de base de données dans météo sync: {e}")
        return jsonify({"error": "Erreur base de données", "detail": str(e)}), 500
