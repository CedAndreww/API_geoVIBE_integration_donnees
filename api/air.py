import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry

cache_session = requests_cache.CachedSession('.cache', expire_after=600)
retry_session = retry(cache_session, retries=3, backoff_factor=0.5)
openmeteo     = openmeteo_requests.Client(session=retry_session)

AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

AIR_PARAMS = {
    "hourly": ["pm2_5", "pm10", "nitrogen_dioxide", "ozone", "european_aqi"],
    "timezone":      "Europe/Paris",
    "forecast_days": 1,
}


def aqi_label(v):
    v = int(v) if v == v else 0
    if v <= 20:  return "Bon",                 "#50f0e6"
    if v <= 40:  return "Acceptable",           "#50ccaa"
    if v <= 60:  return "Modéré",              "#f0e641"
    if v <= 80:  return "Mauvais",             "#ff5050"
    if v <= 100: return "Très mauvais",        "#960032"
    return              "Extrêmement mauvais",  "#7d2181"

def aqi_icon(v):
    v = int(v) if v == v else 0
    if v <= 20:  return "🟢"
    if v <= 40:  return "🟢"
    if v <= 60:  return "🟡"
    if v <= 80:  return "🟠"
    if v <= 100: return "🔴"
    return              "🟣"

def _parse_air(r):
    hourly = r.Hourly()
    dates  = pd.date_range(
        start=pd.to_datetime(hourly.Time(),    unit="s", utc=True).tz_convert("Europe/Paris"),
        end  =pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True).tz_convert("Europe/Paris"),
        freq =pd.Timedelta(seconds=hourly.Interval()), inclusive="left"
    )
    df = pd.DataFrame({
        "date": dates,
        "pm25": hourly.Variables(0).ValuesAsNumpy(),
        "pm10": hourly.Variables(1).ValuesAsNumpy(),
        "no2":  hourly.Variables(2).ValuesAsNumpy(),
        "o3":   hourly.Variables(3).ValuesAsNumpy(),
        "aqi":  hourly.Variables(4).ValuesAsNumpy(),
    })
    now     = pd.Timestamp.now(tz="Europe/Paris").floor("h")
    current = df[df["date"] <= now].iloc[-1]
    aqi     = int(current["aqi"]) if current["aqi"] == current["aqi"] else 0
    label, color = aqi_label(aqi)
    return {
        "aqi": aqi, "label": label, "color": color, "icon": aqi_icon(aqi),
        "pm25": round(float(current["pm25"]), 1),
        "pm10": round(float(current["pm10"]), 1),
        "no2":  round(float(current["no2"]),  1),
        "o3":   round(float(current["o3"]),   1),
    }

def _err():
    return {"aqi": None, "label": "Indisponible", "color": "#aaa", "icon": "⚫",
            "pm25": None, "pm10": None, "no2": None, "o3": None}


def get_air_quality(lat, lon):
    """Qualité de l'air pour un seul point."""
    try:
        responses = openmeteo.weather_api(AIR_URL, params={"latitude": lat, "longitude": lon, **AIR_PARAMS})
        return _parse_air(responses[0])
    except Exception as e:
        print(f"[air] Erreur: {e}")
        return _err()


def get_air_batch(locations):
    """
    Qualité de l'air pour plusieurs points en UNE SEULE requête.
    locations: liste de dicts {"lat": ..., "lon": ...}
    """
    if not locations:
        return []
    lats = [loc["lat"] for loc in locations]
    lons = [loc["lon"] for loc in locations]
    try:
        responses = openmeteo.weather_api(AIR_URL, params={"latitude": lats, "longitude": lons, **AIR_PARAMS})
        return [_parse_air(r) for r in responses]
    except Exception as e:
        print(f"[air batch] Erreur: {e}")
        return [_err()] * len(locations)
