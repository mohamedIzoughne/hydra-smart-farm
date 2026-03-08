"""
Open-Meteo weather service.
Fetches 7-day forecast for a given latitude/longitude.
No API key required.
Docs: https://open-meteo.com/en/docs
"""

import requests
from datetime import date

OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"


def fetch_forecast(latitude: float, longitude: float, days: int = 7) -> list[dict]:
    """
    Fetch daily weather forecast from Open-Meteo.

    Returns a list of dicts:
        [{
            "date": "2026-03-08",
            "temperature_max": 32.5,
            "temperature_min": 18.2,
            "temperature_mean": 25.4,
            "precipitation_sum": 2.3,
            "relative_humidity_mean": 65.0,
        }, ...]
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "precipitation_sum",
            "relative_humidity_2m_mean",
        ]),
        "forecast_days": min(days, 16),  # Open-Meteo supports up to 16 days
        "timezone": "auto",
    }

    resp = requests.get(OPEN_METEO_BASE, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    temp_max = daily.get("temperature_2m_max", [])
    temp_min = daily.get("temperature_2m_min", [])
    temp_mean = daily.get("temperature_2m_mean", [])
    precip = daily.get("precipitation_sum", [])
    humidity = daily.get("relative_humidity_2m_mean", [])

    forecasts = []
    for i, d in enumerate(dates):
        forecasts.append({
            "date": d,
            "temperature_max": temp_max[i] if i < len(temp_max) else None,
            "temperature_min": temp_min[i] if i < len(temp_min) else None,
            "temperature_mean": temp_mean[i] if i < len(temp_mean) else None,
            "precipitation_sum": precip[i] if i < len(precip) else None,
            "relative_humidity_mean": humidity[i] if i < len(humidity) else None,
        })

    return forecasts


def fetch_historical(latitude: float, longitude: float, start_date: str, end_date: str) -> list[dict]:
    """
    Fetch historical weather data from Open-Meteo Archive API.
    Dates in YYYY-MM-DD format.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "precipitation_sum",
            "relative_humidity_2m_mean",
        ]),
        "start_date": start_date,
        "end_date": end_date,
        "timezone": "auto",
    }

    resp = requests.get("https://archive-api.open-meteo.com/v1/archive", params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    temp_max = daily.get("temperature_2m_max", [])
    temp_min = daily.get("temperature_2m_min", [])
    temp_mean = daily.get("temperature_2m_mean", [])
    precip = daily.get("precipitation_sum", [])
    humidity = daily.get("relative_humidity_2m_mean", [])

    results = []
    for i, d in enumerate(dates):
        results.append({
            "date": d,
            "temperature_max": temp_max[i] if i < len(temp_max) else None,
            "temperature_min": temp_min[i] if i < len(temp_min) else None,
            "temperature_mean": temp_mean[i] if i < len(temp_mean) else None,
            "precipitation_sum": precip[i] if i < len(precip) else None,
            "relative_humidity_mean": humidity[i] if i < len(humidity) else None,
        })

    return results
