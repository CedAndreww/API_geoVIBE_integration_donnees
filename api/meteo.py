import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry

cache_session = requests_cache.CachedSession('.cache', expire_after=600)
retry_session = retry(cache_session, retries=3, backoff_factor=0.5)
openmeteo     = openmeteo_requests.Client(session=retry_session)

JOURS_FR = {
    "Monday": "Lundi", "Tuesday": "Mardi", "Wednesday": "Mercredi",
    "Thursday": "Jeudi", "Friday": "Vendredi", "Saturday": "Samedi", "Sunday": "Dimanche"
}
WMO_LABELS = {
    0: "Ciel dégagé", 1: "Peu nuageux", 2: "Partiellement nuageux", 3: "Couvert",
    45: "Brouillard", 48: "Givre", 51: "Bruine légère", 53: "Bruine", 55: "Bruine forte",
    61: "Pluie légère", 63: "Pluie", 65: "Pluie forte",
    71: "Neige légère", 73: "Neige", 75: "Neige forte",
    80: "Averses légères", 81: "Averses", 82: "Averses fortes",
    95: "Orage", 96: "Orage avec grêle", 99: "Orage violent",
}
WMO_ICONS = {
    0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️",
    51: "🌦️", 53: "🌦️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️",
    71: "🌨️", 73: "🌨️", 75: "❄️", 80: "🌦️", 81: "🌧️", 82: "⛈️",
    95: "⛈️", 96: "⛈️", 99: "⛈️",
}

def jour_fr(dt):
    return f"{JOURS_FR.get(dt.strftime('%A'), dt.strftime('%A'))} {dt.strftime('%d/%m')}"

def _parse_response(r):
    """Parse une réponse Open-Meteo en dict météo."""
    hourly = r.Hourly()
    dates  = pd.date_range(
        start=pd.to_datetime(hourly.Time(),    unit="s", utc=True).tz_convert("Europe/Paris"),
        end  =pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True).tz_convert("Europe/Paris"),
        freq =pd.Timedelta(seconds=hourly.Interval()), inclusive="left"
    )
    df_h = pd.DataFrame({
        "date":     dates,
        "temp":     hourly.Variables(0).ValuesAsNumpy(),
        "humidite": hourly.Variables(1).ValuesAsNumpy(),
        "vent":     hourly.Variables(2).ValuesAsNumpy(),
        "pluie":    hourly.Variables(3).ValuesAsNumpy(),
        "wmo":      hourly.Variables(4).ValuesAsNumpy().astype(int),
        "ressenti": hourly.Variables(5).ValuesAsNumpy(),
        "neige":    hourly.Variables(6).ValuesAsNumpy(),
    })
    now     = pd.Timestamp.now(tz="Europe/Paris").floor("h")
    current = df_h[df_h["date"] <= now].iloc[-1]
    wmo_now = int(current["wmo"])

    daily   = r.Daily()
    dates_d = pd.date_range(
        start=pd.to_datetime(daily.Time(),    unit="s", utc=True).tz_convert("Europe/Paris"),
        end  =pd.to_datetime(daily.TimeEnd(), unit="s", utc=True).tz_convert("Europe/Paris"),
        freq =pd.Timedelta(seconds=daily.Interval()), inclusive="left"
    )
    df_d = pd.DataFrame({
        "date":     dates_d,
        "max":      daily.Variables(0).ValuesAsNumpy(),
        "min":      daily.Variables(1).ValuesAsNumpy(),
        "pluie":    daily.Variables(2).ValuesAsNumpy(),
        "wmo":      daily.Variables(3).ValuesAsNumpy().astype(int),
        "vent_max": daily.Variables(4).ValuesAsNumpy(),
        "neige":    daily.Variables(5).ValuesAsNumpy(),
    })

    previsions = []
    for _, row in df_d.iterrows():
        wmo = int(row["wmo"])
        previsions.append({
            "date": jour_fr(row["date"]), "max": round(float(row["max"]), 1),
            "min": round(float(row["min"]), 1), "pluie": round(float(row["pluie"]), 1),
            "neige": round(float(row["neige"]), 1), "vent_max": round(float(row["vent_max"]), 1),
            "label": WMO_LABELS.get(wmo, "?"), "icone": WMO_ICONS.get(wmo, "🌡️"),
        })

    return {
        "maintenant": {
            "temp":     round(float(current["temp"]), 1),
            "ressenti": round(float(current["ressenti"]), 1),
            "humidite": round(float(current["humidite"])),
            "vent":     round(float(current["vent"]), 1),
            "pluie":    round(float(current["pluie"]), 1),
            "neige":    round(float(current["neige"]), 1),
            "label":    WMO_LABELS.get(wmo_now, "?"),
            "icone":    WMO_ICONS.get(wmo_now, "🌡️"),
        },
        "previsions": previsions,
    }


PARAMS_BASE = {
    "hourly": ["temperature_2m", "relative_humidity_2m", "wind_speed_10m",
               "precipitation", "weather_code", "apparent_temperature", "snowfall"],
    "daily":  ["temperature_2m_max", "temperature_2m_min", "precipitation_sum",
               "weather_code", "wind_speed_10m_max", "snowfall_sum"],
    "timezone":      "Europe/Paris",
    "forecast_days": 7,
}


def get_meteo(lat, lon):
    """Météo pour un seul point (endpoint individuel)."""
    try:
        responses = openmeteo.weather_api(
            "https://api.open-meteo.com/v1/forecast",
            params={"latitude": lat, "longitude": lon, **PARAMS_BASE}
        )
        return _parse_response(responses[0])
    except Exception as e:
        print(f"[meteo] Erreur: {e}")
        return None


def get_meteo_batch(locations):
    """
    Météo pour plusieurs points en UNE SEULE requête.
    locations: liste de dicts {"lat": ..., "lon": ...}
    Retourne une liste de résultats dans le même ordre.
    """
    if not locations:
        return []
    lats = [loc["lat"] for loc in locations]
    lons = [loc["lon"] for loc in locations]
    try:
        responses = openmeteo.weather_api(
            "https://api.open-meteo.com/v1/forecast",
            params={"latitude": lats, "longitude": lons, **PARAMS_BASE}
        )
        return [_parse_response(r) for r in responses]
    except Exception as e:
        print(f"[meteo batch] Erreur: {e}")
        return [None] * len(locations)
