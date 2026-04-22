from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from api.datatourisme import get_pois_near, search_pois
from api.meteo import get_meteo, get_meteo_batch
from api.air import get_air_quality, get_air_batch

load_dotenv()
app = Flask(__name__)
CORS(app)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/pois")
def pois():
    lat    = float(request.args.get("lat", 43.6119))
    lon    = float(request.args.get("lon", 3.8772))
    radius = int(request.args.get("radius", 20))
    size   = int(request.args.get("size", 30))
    return jsonify(get_pois_near(lat, lon, radius_km=radius, page_size=size))


@app.route("/api/search")
def search():
    q = request.args.get("q", "")
    return jsonify(search_pois(q))


@app.route("/api/meteo")
def meteo():
    lat = float(request.args.get("lat", 43.6119))
    lon = float(request.args.get("lon", 3.8772))
    return jsonify(get_meteo(lat, lon))


@app.route("/api/air")
def air():
    lat = float(request.args.get("lat", 43.6119))
    lon = float(request.args.get("lon", 3.8772))
    return jsonify(get_air_quality(lat, lon))


@app.route("/api/meteo/batch", methods=["POST"])
def meteo_batch():
    """
    Reçoit une liste de {lat, lon} et retourne la météo pour tous
    en une seule requête Open-Meteo.
    Body JSON: {"locations": [{"lat": ..., "lon": ...}, ...]}
    """
    data      = request.get_json()
    locations = data.get("locations", [])
    return jsonify(get_meteo_batch(locations))


@app.route("/api/air/batch", methods=["POST"])
def air_batch():
    """
    Reçoit une liste de {lat, lon} et retourne la qualité de l'air pour tous
    en une seule requête Open-Meteo.
    Body JSON: {"locations": [{"lat": ..., "lon": ...}, ...]}
    """
    data      = request.get_json()
    locations = data.get("locations", [])
    return jsonify(get_air_batch(locations))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
