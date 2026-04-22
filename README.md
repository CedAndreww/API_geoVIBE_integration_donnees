# 📋 TOURISME FR - Documentation Complète

**Date**: 21 Avril 2026  
**Version**: 1.0  
**Langue**: Français

---

## 🎯 Objectif du Projet

**TOURISME FR** est une application web interactive qui aide les utilisateurs à découvrir des points d'intérêt (POIs) en France en combinant :
- 🗺️ **Géolocalisation et cartographie**
- 🌡️ **Données météorologiques en temps réel**
- 🌿 **Qualité de l'air**
- 🤖 **Classification intelligente par IA**
- 🎯 **Filtres personnalisés**

---

## 🏗️ Architecture Générale

```
┌─────────────────┐
│   Frontend JS   │  (Leaflet, DOM manipulation)
│   (app.js)      │
└────────┬────────┘
         │ HTTP REST
         ▼
┌─────────────────────────┐
│  Backend Flask          │  (app.py)
│  ├─ /api/pois           │
│  ├─ /api/search         │
│  ├─ /api/meteo/batch    │
│  └─ /api/air/batch      │
└────────┬────────────────┘
         │
    ┌────┴────┬──────┬─────────┐
    ▼         ▼      ▼         ▼
 DataTourisme Open-Meteo Groq geo.api.gouv.fr
   (POIs)    (Météo+Air) (IA)   (Autocomplete)
```

---

## 📦 Stack Technologique

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **Backend** | Python 3.13 + Flask | Serveur, routing, orchestration APIs |
| **Frontend** | JavaScript Vanilla | UI interactive, gestion état |
| **Cartographie** | Leaflet.js | Affichage carte, markers, clustering |
| **Styling** | CSS Custom | Design responsive sans framework |
| **Serveur Local** | MAMP | Environnement local (localhost:5000) |

---

## 🔌 APIs Externes Utilisées

### 1️⃣ **DataTourisme**
- **URL**: `https://api.datatourisme.fr/v1`
- **Authentification**: API Key (env: `DATATOURISME_KEY`)
- **Endpoints utilisés**:
  - `POST /geospatial/interests` → POIs par localisation
  - `GET /interests` → Détails des POIs
- **Données retournées**:
  - Nom, description, coordonnées (lat/lon)
  - Ville, adresse
  - Site web, téléphone
  - Type de POI

### 2️⃣ **Open-Meteo (Météo)**
- **URL**: `https://api.open-meteo.com/v1/forecast`
- **Authentification**: Aucune (API publique)
- **Paramètres**:
  ```
  latitude, longitude, hourly, daily, timezone
  ```
- **Données retournées**:
  - Température actuelle, ressentie
  - Vitesse du vent
  - Humidité
  - Précipitations (pluie, neige)
  - Prévisions 7 jours
  - Codes météo (WMO)

### 3️⃣ **Open-Meteo Air Quality**
- **URL**: `https://api.open-meteo.com/v1/air-quality`
- **Authentification**: Aucune (API publique)
- **Paramètres**:
  ```
  latitude, longitude, hourly
  ```
- **Données retournées**:
  - AQI (Air Quality Index) 0-500
  - PM2.5, PM10 (particulates)
  - NO₂ (dioxide d'azote)
  - O₃ (ozone)
  - Catégorie (Bon, Acceptable, Modéré, Mauvais, etc.)

### 4️⃣ **Groq API - Llama 3.1 70B**
- **URL**: `https://api.groq.com/openai/v1/chat/completions`
- **Authentification**: Bearer token (env: `GROQ_API_KEY`)
- **Modèle**: `llama-3.1-70b-versatile`
- **Fonction**: Classification automatique des POIs
- **Input**: Array de POIs avec nom + description
- **Output**: JSON mapping UUID → thématique

### 5️⃣ **geo.api.gouv.fr**
- **URL**: `https://geo.api.gouv.fr/`
- **Authentification**: Aucune (API publique)
- **Endpoints**:
  - `/communes` → Autocomplete communes
  - `/departements` → Autocomplete départements
  - `/regions` → Autocomplete régions
- **Fonction**: Suggestions géographiques lors de la recherche

---

## 📁 Structure du Projet

```
projet_tourisme/
│
├── app.py                           # Application Flask principale
├── requirements.txt                 # Dépendances Python
├── .env                            # Variables d'environnement (API keys)
│
├── api/
│   ├── __init__.py
│   ├── datatourisme.py             # Intégration API DataTourisme
│   ├── meteo.py                    # Intégration Open-Meteo
│   ├── air.py                      # Intégration Air Quality
│   └── classifier.py               # Intégration Groq/IA
│
├── templates/
│   └── index.html                  # Pagfe principale (Leaflet + HTML)
│
├── static/
│   ├── js/
│   │   └── app.js                  # Logique frontend (2000+ lignes)
│   └── css/
│       └── style.css               # Styling complet
│
└── README.md                        # Cette documentation
```

---

## 🚀 Endpoints API Backend

### 1️⃣ **GET /api/pois**
Charge les POIs dans un rayon donné avec classification IA

**Paramètres**:
```
lat     : float    (latitude, défaut: 43.6119)
lon     : float    (longitude, défaut: 3.8772)
radius  : int      (km, défaut: 20)
size    : int      (nombre de POIs, défaut: 30)
```

**Réponse**:
```json
[
  {
    "uuid": "poi-12345",
    "nom": "Château de Montfort",
    "description": "Château du XIIe siècle...",
    "lat": 45.1842,
    "lon": 5.7155,
    "ville": "Grenoble",
    "theme": "Patrimoine Historique",
    "web": "https://...",
    "tel": "+33..."
  },
  ...
]
```

### 2️⃣ **GET /api/search**
Recherche textuelle de POIs

**Paramètres**:
```
q : string (query, ex: "Gregnoble")
```

**Réponse**: Même structure que `/api/pois`

### 3️⃣ **GET /api/meteo**
Météo pour une seule location

**Paramètres**:
```
lat : float
lon : float
```

**Réponse**:
```json
{
  "maintenant": {
    "temp": 15,
    "ressenti": 12,
    "vent": 12,
    "humidite": 65,
    "pluie": 0,
    "neige": 0,
    "icone": "⛅",
    "label": "Nuageux"
  },
  "previsions": [
    {
      "date": "22 Apr",
      "min": 12,
      "max": 18,
      "pluie": 0,
      "neige": 0,
      "icone": "☀️"
    }
  ]
}
```

### 4️⃣ **POST /api/meteo/batch** ⚡
Météo pour **plusieurs locations en une seule requête**

**Body**:
```json
{
  "locations": [
    {"lat": 45.18, "lon": 5.71},
    {"lat": 43.60, "lon": 3.88},
    ...
  ]
}
```

**Réponse**: Array parallèle au input
```json
[
  { "maintenant": {...}, "previsions": [...] },
  { "maintenant": {...}, "previsions": [...] },
  ...
]
```

### 5️⃣ **GET /api/air**
Qualité de l'air pour une location

**Paramètres**:
```
lat : float
lon : float
```

**Réponse**:
```json
{
  "aqi": 45,
  "label": "Bon",
  "icon": "🟢",
  "color": "#27ae60",
  "pm25": 8.5,
  "pm10": 15.2,
  "no2": 22.1,
  "o3": 45.0
}
```

### 6️⃣ **POST /api/air/batch** ⚡
Qualité de l'air pour **plusieurs locations**

**Body**: Même que `/api/meteo/batch`
**Réponse**: Array d'objets air

---

## 🎨 Interface Utilisateur

### **Layout Principal**

```
┌─────────────────────────────────────────────────┐
│                   HEADER                        │
├──────────────────┬──────────────────────────────┤
│     SIDEBAR      │                              │
│  (340px fixe)    │           MAP                │
│                  │        (Leaflet)             │
│  • Recherche     │                              │
│  • Filtres       │    [Markers + Clustering]    │
│  • Thèmes        │                              │
│  • Liste POIs    │      [Radius Circle]         │
│                  │                              │
│  [Scroll]        │     [Detail Panel]           │
└──────────────────┴──────────────────────────────┘
```

### **Sections de la Sidebar**

#### 1. **En-tête Bleu** (`#sidebar-header`)
- Logo/titre "TOURISME FR"
- Barre de recherche avec autocomplete
- Bouton localisation GPS
- Sélecteur rayon (10-50 km)
- Toggles filtres/thèmes

#### 2. **Panel Filtres** (`#filter-panel`)
- Curseur température min/max (0-35°C)
- Curseur vitesse vent max (0-60 km/h)
- Toggle précipitations: Aucune / Pluie OK / Neige souhaitée
- Toggle qualité air: Peu importe / Bon / Acceptable / Modéré

#### 3. **Panel Thèmes** (`#theme-panel`)
- 16 chips cliquables (themes)
- Bouton "Effacer tout"
- Bouton "Appliquer"

#### 4. **Liste POIs** (`#poi-list`)
- Heure d'actualisation
- **Semaphore Zone**: Évaluation globale des conditions
- **POI Cards**: Chacune avec:
  - Nom + Badge thème + Emoji
  - Ville + Icône
  - Mini météo (temp, vent, humidité)
  - Badge qualité air coloré
  - Mini semaphore (✅❌ pour chaque filtre)

### **Panel Détail** (`#detail-panel`)
- Affichage au clic sur un POI
- Titre + thème
- Adresse complète
- **Météo détaillée**:
  - Condition actuelle (icone grande, temp, ressenti)
  - Détails (vent, humidité, précipitations)
  - Scroll horizontal: Prévisions 7 jours
- **Qualité de l'air**:
  - AQI + label coloré
  - Tableau: PM2.5, PM10, NO₂, O₃
  - Bouton "?" → popup explicatif
- Description POI
- Liens: Site web, téléphone

---

## 🧠 Système d'Évaluation "Semaphore"

Le système évalue si les conditions actuelles correspondent aux filtres de l'utilisateur.

### **Critères Évalués**
```javascript
✅ Température         : min ≤ temp ≤ max
✅ Vent               : vent ≤ windMax
✅ Précipitations     : selon filtre (aucune/pluie/neige)
✅ Qualité de l'air   : selon filtre (bon/acceptable/modéré/n'importe)
```

### **Score et Couleur**
```
Score = (critères remplis / critères actifs) × 100%

🟢 VERT (100%)     : Toutes les conditions remplies
🟡 JAUNE (50-99%)  : Conditions partiellement remplies
🔴 ROUGE (0-49%)   : Conditions non remplies
⚪ GRIS             : Aucun filtre actif
```

### **Affichages**
- **Semaphore Zone** (en haut liste): Résumé global pour toute la zone
- **Semaphore POI** (sur chaque card): Statut pour ce POI spécifique
- **Couleur marker**: Reflète le score du POI

---

## 🎯 Thèmes de Classification (16 catégories)

Chaque POI est automatiquement classifié par IA (Groq/Llama) dans une de ces catégories:

| # | Thème | Emoji | Exemples |
|---|-------|-------|----------|
| 1 | Patrimoine Historique | 🏰 | Châteaux, fortifications, sites archéologiques |
| 2 | Culture & Musées | 🎨 | Galeries d'art, théâtres, musées |
| 3 | Nature & Parcs | 🌿 | Parcs nationaux, forêts, montagnes, lacs |
| 4 | Sport & Aventure | 🏃 | Randonnée, escalade, vélo, ski |
| 5 | Gastronomie & Terroir | 🍽️ | Restaurants, caves à vin, fromages |
| 6 | Loisirs Familiaux | 👨‍👩‍👧 | Parcs d'attractions, zoos, aquariums |
| 7 | Détente & Bien-être | 🧘 | Spas, saunas, thermes |
| 8 | Spectacles & Événements | 🎭 | Concerts, festivals, cirques |
| 9 | Activités Aquatiques | 🏊 | Plages, sports nautiques, plongée |
| 10 | Shopping & Artisanat | 🛍️ | Marchés, boutiques artisanales |
| 11 | Vie Nocturne | 🌙 | Bars, clubs, discothèques |
| 12 | Édifices Religieux | ⛪ | Églises, cathédrales, mosquées |
| 13 | Science & Industrie | 🔬 | Musées scientifiques, usines historiques |
| 14 | Oenotourisme | 🍷 | Vignobles, dégustations de vins |
| 15 | Circuits & Balades | 🥾 | Routes touristiques, visites guidées |
| 16 | Autre | 📍 | Classification par défaut |

---

## 🔄 Flux Complet de Données

### **Scenario: Utilisateur cherche POIs à Grenoble**

```
1. USER ACTION
   └─ Tape "Grenoble" dans barre recherche

2. FRONTEND (app.js)
   └─ Autocomplete:
      └─ Fetch geo.api.gouv.fr/communes
      └─ Affiche suggestions (communes, depts, régions)
      └─ User clique "Grenoble"

3. USER INTERACTION
   └─ Frontend appelle: chargerPois(45.18, 5.72, 20)

4. FETCH POIs
   └─ Frontend: GET /api/pois?lat=45.18&lon=5.72&radius=20&size=30
   └─ Backend (datatourisme.py):
      ├─ POST https://api.datatourisme.fr/v1/geospatial/interests
      ├─ Extraction données (nom, desc, lat/lon, ville, web, tel)
      └─ Retourne 30 POIs

5. CLASSIFICATION IA
   └─ Backend (classifier.py):
      ├─ Prépare payload pour Groq
      ├─ POST https://api.groq.com/openai/v1/chat/completions
      │  └─ Modèle: llama-3.1-70b-versatile
      │  └─ Envoie: IDs POI + nom + description (300 chars)
      ├─ Reçoit: JSON {"uuid1": "Nature & Parcs", "uuid2": "Patrimoine", ...}
      └─ Ajoute "theme" à chaque POI
      
6. RETURN POIs CLASSIFIÉS
   └─ Frontend reçoit: array 30 POIs avec themes

7. LOAD WEATHER + AIR DONNÉES (OPTIMISÉ BATCH)
   └─ Frontend prépare locations array:
      └─ [{lat: 45.18, lon: 5.71}, {lat: 43.60, lon: 3.88}, ...]
      
   └─ 2 PARALLELES:
      ├─ POST /api/meteo/batch
      │  └─ Backend: 1 seule requête Open-Meteo pour 30 locations
      │  └─ Retourne: array 30 météo objects
      │
      └─ POST /api/air/batch
         └─ Backend: 1 seule requête Open-Meteo Air pour 30 locations
         └─ Retourne: array 30 air quality objects

8. FRONTEND RENDERING
   └─ Reçoit: pois[], meteoDatas[], airDatas[]
   └─ Pour chaque POI:
      ├─ Crée marker Leaflet (coloré selon score)
      ├─ Crée card HTML:
      │  ├─ Nom + thème + badge
      │  ├─ Météo mini
      │  ├─ Air quality mini
      │  └─ Semaphore mini
      └─ Ajoute au clusterGroup
      
   └─ Semaphore Zone (global):
      ├─ Évalue conditions globales
      ├─ Affiche résumé haut de la liste
      └─ Conseille ajuster filtres si nécessaire

9. USER SEES
   └─ Carte avec 30 markers colorés
   └─ Sidebar avec 30 cards
   └─ Détails complets si clique sur un POI
```

### **Optimisation Clé: BATCH Processing**

**SANS BATCH** (inefficace):
```
30 POIs × (météo + air) = 60 appels HTTP individuels
Latence: ~30-60 secondes
```

**AVEC BATCH** (optimisé):
```
1 POST /api/meteo/batch (30 locations) + 1 POST /api/air/batch
Latence: ~2-3 secondes
Gain: 95% moins de requêtes ✅
```

---

## 🎮 Interactions Principales

### **1. Recherche**
```javascript
searchInput.addEventListener("input", async () => {
  // Autocomplete geo.api.gouv.fr (communes, depts, régions)
  // Au clic sur un résultat:
  // - Centre la carte
  // - Trace le cercle de rayon
  // - Charge POIs
});
```

### **2. Localisation GPS**
```javascript
document.getElementById("locate-btn").addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    // Même flux que recherche
  });
});
```

### **3. Clic sur Carte**
```javascript
map.on("click", e => {
  const { lat, lng } = e.latlng;
  // Trace cercle + charge POIs
});
```

### **4. Filtres Dynamiques**
```javascript
// Curseurs temp, vent
// Toggles précipitations, air
// Click "Appliquer" → re-filtre lastPois
// Sans re-charger (utilise cache)
```

### **5. Filtres Thèmes**
```javascript
// Chaque chip thème = toggle
// Click "Appliquer" → cache dans selectedThemes Set
// Re-filtre list + ré-colore markers
```

### **6. Panel Détail**
```javascript
// Click sur card ou marker
// Affiche toutes les infos:
// - Météo détaillée + pronos 7j
// - Air quality détaillé
// - Description + web/tel
```

---

## 💾 Variables d'Environnement

Fichier `.env` à la racine du projet:

```env
# DataTourisme API
DATATOURISME_KEY=your_key_here

# Groq API (Llama 3.1)
GROQ_API_KEY=""
```

---

## 🚀 Démarrage de l'Application

```bash
# 1. Installer dépendances
pip install -r requirements.txt

# 2. Lancer le serveur Flask
python app.py

# 3. Ouvrir dans le navigateur
http://localhost:5000
```

**La première fois**:
- Map centrée sur France (46.5, 2.5)
- Cliquer quelque part ou utiliser recherche
- POIs et données chargent automatiquement

---

## 📊 Performance

### **Temps de Chargement Typique**
```
Recherche → POIs classifiés  : ~1-2 sec
Météo + Air batch           : ~1-2 sec
Total                       : ~2-4 sec ✅
```

### **Optimisations Implémentées**
1. ✅ **Batch API** → 1 request = 30 locations
2. ✅ **Clustering markers** → Pas de surcharge visuelle
3. ✅ **Lazy loading** → Load on demand
4. ✅ **Frontend cache** → lastPois, lastMeteoDatas, lastAirDatas
5. ✅ **Debouncing** → Autocomplete (300ms delay)
6. ✅ **CSS optimisé** → Flexbox, pas de recalculs

---

## 🐛 Troubleshooting

### **Erreur 429 (Rate Limit Groq)**
- La clé Groq a un rate limit
- Solution: Utiliser le fallback "Autre" (code gère gracefully)

### **Pas de POIs trouvés**
- Vérifier les coordonnées lat/lon
- Augmenter le rayon
- Vérifier que DataTourisme API répond

### **Pas de données météo/air**
- Open-Meteo API down?
- Vérifier la connectivité
- Les données air/meteo sont optionnelles

### **Autocomplete ne fonctionne pas**
- Vérifier géo.api.gouv.fr
- C'est une API publique sans auth

---

## 📈 Évolutions Futures Possibles

1. **Historique de recherches**
2. **Favoris utilisateur** (localStorage)
3. **Export données** (CSV, PDF)
4. **Alertes météo** (notifications)
5. **Multi-langue** (i18n)
6. **Auth utilisateur** (comptes)
7. **Itinéraires** (intégration OpenRouteService)
8. **Photos** (Wikimedia, Unsplash)
9. **Avis utilisateurs** (intégration TripAdvisor)
10. **Mode sombre** (dark theme)

---

## 📄 Fichiers Clés Expliqués

### **app.py** (70 lignes)
- Point d'entrée Flask
- Define 6 routes API
- Charge .env
- Importe modules api/

### **static/js/app.js** (2000+ lignes)
- Logique frontend complète
- Gestion état global
- Événements DOM
- Fetch API calls
- Rendering dynamique
- Système "semaphore"

### **api/datatourisme.py**
- Extraction POIs DataTourisme
- Parsing données brutes
- Appel classifier IA

### **api/meteo.py**
- Appels Open-Meteo
- Parsing codes WMO → emojis
- Support batch

### **api/air.py**
- Appels Open-Meteo Air
- Mapping AQI → labels + colors
- Support batch

### **api/classifier.py**
- Intégration Groq/Llama
- Retry logic avec backoff
- Fallback "Autre"

---

## 🎓 Concepts Clés

| Concept | Explication |
|---------|------------|
| **POI** | Point of Interest (lieu touristique) |
| **Batch API** | Une seule requête pour N locations |
| **Clustering** | Grouper markers proches visuellement |
| **Semaphore** | 🟢🟡🔴 Évaluation conditions |
| **Thème** | Catégorie POI (16 au total) |
| **AQI** | Air Quality Index (0-500) |
| **WMO** | Codes météorologiques standardisés |
| **CORS** | Cross-Origin Resource Sharing |
| **Debouncing** | Retarder action jusqu'à inactivité |
| **Fallback** | Solution de secours si erreur |

---

## 👨‍💻 Auteur

**Projet TOURISME FR**  
Challenge: Application web intégrant APIes multiples + IA

---

## 📞 Support

Pour des questions sur:
- **Architecture**: Voir section "Architecture Générale"
- **APIs**: Voir section "APIs Externes Utilisées"
- **Frontend**: Voir section "Interface Utilisateur"
- **Endpoints**: Voir section "Endpoints API Backend"

---

**Dernière mise à jour**: 21 Avril 2026
