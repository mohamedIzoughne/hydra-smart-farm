from datetime import datetime, timedelta
from app import db
from app.models.parcelle import Parcelle
from app.models.culture import Culture
from app.models.mesure_climatique import MesureClimatique
from app.models.besoin_eau import BesoinEau
from app.services.weather_service import fetch_forecast
from app.services.calcul_service import calcul_volume_besoin

def sync_all_active_parcelles(app):
    """
    Background task to sync weather data for all active parcelles.
    Triggered daily at 04:00 AM.
    """
    with app.app_context():
        print(f"[{datetime.now()}] Starting daily weather sync for all active parcelles...")
        
        try:
            # 1. Get all parcelles with an active season
            active_parcelles = Parcelle.query.filter_by(saison_active=True).all()
            print(f"Found {len(active_parcelles)} active parcelles to sync.")

            for parcelle in active_parcelles:
                if not parcelle.latitude or not parcelle.longitude:
                    print(f"Skipping Parcelle {parcelle.id_parcelle}: Missing GPS coordinates.")
                    continue

                try:
                    # 2. Fetch forecast (usually includes today)
                    # We fetch 1 day (today) to update current needs
                    forecasts = fetch_forecast(
                        float(parcelle.latitude),
                        float(parcelle.longitude),
                        days=1
                    )

                    culture = db.session.get(Culture, parcelle.id_culture) if parcelle.id_culture else None
                    
                    for day in forecasts:
                        date_prev = datetime.strptime(day["date"], "%Y-%m-%d").date()

                        # 3. Check if mesure already exists
                        existing = MesureClimatique.query.filter_by(
                            id_parcelle=parcelle.id_parcelle,
                            date_prevision=date_prev,
                        ).first()

                        temp = day.get("temperature_mean") or day.get("temperature_max") or 0
                        pluie = day.get("precipitation_sum") or 0
                        humidity = day.get("relative_humidity_mean")

                        if existing:
                            # Update existing mesure with fresh forecast/actuals
                            existing.temperature = temp
                            existing.pluie = pluie
                            existing.humidite = humidity
                            existing.source_api = "OpenMeteo (Auto)"
                        else:
                            # Create new mesure
                            mesure = MesureClimatique(
                                id_parcelle=parcelle.id_parcelle,
                                date_prevision=date_prev,
                                temperature=temp,
                                pluie=pluie,
                                humidite=humidity,
                                source_api="OpenMeteo (Auto)",
                            )
                            db.session.add(mesure)
                            db.session.flush()

                            # 4. Calculate Need (Trigger trg_calcul_besoin_eau in DB handles this, 
                            # but we can also do it via code for safety if trigger fails)
                            if culture:
                                volume = calcul_volume_besoin(parcelle, culture, mesure)
                                # Check if besoin already exists
                                existing_besoin = BesoinEau.query.filter_by(
                                    id_parcelle=parcelle.id_parcelle,
                                    date_besoin=date_prev
                                ).first()
                                
                                if not existing_besoin:
                                    besoin = BesoinEau(
                                        id_parcelle=parcelle.id_parcelle,
                                        id_mesure=mesure.id_mesure,
                                        date_besoin=date_prev,
                                        volume_recommande=volume,
                                        genere_par="Système",
                                    )
                                    db.session.add(besoin)

                    db.session.commit()
                    print(f"Successfully synced Parcelle {parcelle.id_parcelle}.")

                except Exception as e:
                    db.session.rollback()
                    print(f"Error syncing Parcelle {parcelle.id_parcelle}: {str(e)}")

        except Exception as e:
            print(f"Critical error in daily sync task: {str(e)}")
        
        print(f"[{datetime.now()}] Finished daily weather sync.")
