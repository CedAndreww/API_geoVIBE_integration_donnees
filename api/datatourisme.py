import requests
import os

DT_BASE    = "https://api.datatourisme.fr/v1"
DT_API_KEY = os.getenv("DATATOURISME_KEY", "82a69518-beaa-46b4-bff4-12cbcb1a057a")
DT_HEADERS = {"X-API-Key": DT_API_KEY, "Accept": "application/json"}

from .classifier import classer_activites


def extraire_ville(poi):
    locs = poi.get("isLocatedAt", [])
    if not locs:
        return "?"
    addresses = locs[0].get("address", [])
    addr = addresses[0] if isinstance(addresses, list) and addresses else addresses
    if isinstance(addr, dict):
        return addr.get("addressLocality") or addr.get("postalCode", "?")
    return "?"


def extraire_description(p):
    descs = p.get("hasDescription", [])
    if not descs:
        return ""
    first = descs[0] if isinstance(descs, list) else descs
    if not isinstance(first, dict):
        return ""
    raw = first.get("shortDescription", {})
    if isinstance(raw, list):
        raw = raw[0] if raw and isinstance(raw[0], dict) else {}
    if isinstance(raw, dict):
        return raw.get("@fr") or raw.get("@en", "")
    if isinstance(raw, str):
        return raw
    return ""


def simplificar_poi(p):
    geo      = p.get("isLocatedAt", [{}])[0].get("geo", {}) if p.get("isLocatedAt") else {}
    imgs     = p.get("hasMainRepresentation", [{}])
    res      = imgs[0].get("ebucore:hasRelatedResource", [{}]) if imgs else [{}]
    photo    = res[0].get("ebucore:locator") if res else None
    contacts = p.get("hasContact", [{}])
    c        = contacts[0] if contacts else {}

    return {
        "uuid":        p.get("uuid"),
        "nom":         p.get("label", {}).get("@fr") or p.get("label", {}).get("@en", "?"),
        "type":        p.get("type", []),
        "lat":         float(geo.get("latitude",  0) or 0),
        "lon":         float(geo.get("longitude", 0) or 0),
        "ville":       extraire_ville(p),
        "description": extraire_description(p),
        "photo":       photo,
        "web":         (c.get("homepage")  or [None])[0],
        "tel":         (c.get("telephone") or [None])[0],
    }


def get_pois_near(lat, lon, radius_km=20, page_size=20):
    resp = requests.get(
        f"{DT_BASE}/catalog",
        headers=DT_HEADERS,
        params={
            "lang":         "fr",
            "geo_distance": f"{lat},{lon},{radius_km}km",
            "fields":       "uuid,label,type,isLocatedAt,hasMainRepresentation,hasDescription,hasContact",
            "page_size":    page_size,
        }
    )
    if resp.status_code != 200:
        return []
    pois = [simplificar_poi(p) for p in resp.json().get("objects", [])]
    return classer_activites(pois)


def search_pois(query, page_size=20):
    resp = requests.get(
        f"{DT_BASE}/catalog",
        headers=DT_HEADERS,
        params={
            "lang":      "fr",
            "search":    query,
            "fields":    "uuid,label,type,isLocatedAt,hasMainRepresentation,hasDescription,hasContact",
            "page_size": page_size,
        }
    )
    if resp.status_code != 200:
        return []
    pois = [simplificar_poi(p) for p in resp.json().get("objects", [])]
    return classer_activites(pois)
