// ═══════════════════════════════════════════════════
//  CARTE
// ═══════════════════════════════════════════════════
const FRANCE_BOUNDS = L.latLngBounds(L.latLng(41.0, -5.5), L.latLng(51.5, 10.0));
const map = L.map("map", {
  center: [46.5, 2.5], zoom: 6, minZoom: 5, maxZoom: 18,
  maxBounds: FRANCE_BOUNDS, maxBoundsViscosity: 1.0,
});
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

const clusterGroup = L.markerClusterGroup({
  maxClusterRadius: 50,
  iconCreateFunction: cluster => {
    const count = cluster.getChildCount();
    const size  = count < 10 ? 34 : count < 50 ? 42 : 52;
    return L.divIcon({
      html: `<div class="cluster-icon" style="width:${size}px;height:${size}px"><span>${count}</span></div>`,
      className: "", iconSize: [size, size], iconAnchor: [size/2, size/2],
    });
  }
});
map.addLayer(clusterGroup);

// ═══════════════════════════════════════════════════
//  DOM
// ═══════════════════════════════════════════════════
const poiList       = document.getElementById("poi-list");
const detailPanel   = document.getElementById("detail-panel");
const detailContent = document.getElementById("detail-content");
const searchInput   = document.getElementById("search-input");
const suggestBox    = document.getElementById("suggest-box");

// ═══════════════════════════════════════════════════
//  ÉTAT GLOBAL
// ═══════════════════════════════════════════════════
let lastPois       = [];
let lastMeteoDatas = [];
let lastAirDatas   = [];

// ═══════════════════════════════════════════════════
//  THÈMES
// ═══════════════════════════════════════════════════
const THEME_EMOJI = {
  "Patrimoine Historique": "🏰", "Culture & Musées": "🎨", "Nature & Parcs": "🌿",
  "Sport & Aventure": "🏃", "Gastronomie & Terroir": "🍽️", "Loisirs Familiaux": "👨‍👩‍👧",
  "Détente & Bien-être": "🧘", "Spectacles & Événements": "🎭", "Activités Aquatiques": "🏊",
  "Shopping & Artisanat": "🛍️", "Vie Nocturne": "🌙", "Édifices Religieux": "⛪",
  "Science & Industrie": "🔬", "Oenotourisme": "🍷", "Circuits & Balades": "🥾", "Autre": "📍",
};

// ═══════════════════════════════════════════════════
//  FILTRES CONDITIONS
// ═══════════════════════════════════════════════════
const filters = { tempMin: 0, tempMax: 35, windMax: 60, precip: "any", air: "any" };

const tempMinSlider = document.getElementById("temp-min");
const tempMaxSlider = document.getElementById("temp-max");
const tempMinVal    = document.getElementById("temp-min-val");
const tempMaxVal    = document.getElementById("temp-max-val");
const windSlider    = document.getElementById("wind-max");
const windVal       = document.getElementById("wind-max-val");

tempMinSlider.addEventListener("input", () => {
  filters.tempMin = parseInt(tempMinSlider.value);
  if (filters.tempMin >= filters.tempMax) { filters.tempMin = filters.tempMax - 1; tempMinSlider.value = filters.tempMin; }
  tempMinVal.textContent = `${filters.tempMin}°C`; updateFilterBadge();
});
tempMaxSlider.addEventListener("input", () => {
  filters.tempMax = parseInt(tempMaxSlider.value);
  if (filters.tempMax <= filters.tempMin) { filters.tempMax = filters.tempMin + 1; tempMaxSlider.value = filters.tempMax; }
  tempMaxVal.textContent = `${filters.tempMax}°C`; updateFilterBadge();
});
windSlider.addEventListener("input", () => {
  filters.windMax = parseInt(windSlider.value);
  windVal.textContent = `${filters.windMax} km/h`; updateFilterBadge();
});

document.querySelectorAll(".toggle-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const group = btn.dataset.filter;
    document.querySelectorAll(`.toggle-btn[data-filter="${group}"]`).forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filters[group] = btn.dataset.val;
    updateFilterBadge();
  });
});

function filtersAreActive() {
  return filters.tempMin !== 0 || filters.tempMax !== 35 ||
         filters.windMax !== 60 || filters.precip !== "any" || filters.air !== "any";
}
function updateFilterBadge() {
  document.getElementById("filter-badge").classList.toggle("hidden", !filtersAreActive());
}

document.getElementById("filter-apply").addEventListener("click", () => {
  if (lastPois.length) { rendreListePois(lastPois, lastMeteoDatas, lastAirDatas); document.getElementById("filter-panel").classList.add("hidden"); }
});
document.getElementById("filter-reset").addEventListener("click", () => {
  filters.tempMin = 0; filters.tempMax = 35; filters.windMax = 60; filters.precip = "any"; filters.air = "any";
  tempMinSlider.value = 0; tempMinVal.textContent = "0°C";
  tempMaxSlider.value = 35; tempMaxVal.textContent = "35°C";
  windSlider.value = 60; windVal.textContent = "60 km/h";
  document.querySelectorAll(".toggle-btn").forEach(b => b.classList.toggle("active", b.dataset.val === "any"));
  updateFilterBadge();
  if (lastPois.length) rendreListePois(lastPois, lastMeteoDatas, lastAirDatas);
});

// ═══════════════════════════════════════════════════
//  FILTRES THÈMES
// ═══════════════════════════════════════════════════
let selectedThemes = new Set();

document.querySelectorAll(".theme-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const theme = chip.dataset.theme;
    selectedThemes.has(theme) ? selectedThemes.delete(theme) : selectedThemes.add(theme);
    chip.classList.toggle("active");
    updateThemeBadge();
  });
});
document.getElementById("theme-clear").addEventListener("click", () => {
  selectedThemes.clear();
  document.querySelectorAll(".theme-chip").forEach(c => c.classList.remove("active"));
  updateThemeBadge();
});
document.getElementById("theme-apply").addEventListener("click", () => {
  if (lastPois.length) { rendreListePois(lastPois, lastMeteoDatas, lastAirDatas); document.getElementById("theme-panel").classList.add("hidden"); }
});
function updateThemeBadge() {
  document.getElementById("theme-badge").classList.toggle("hidden", selectedThemes.size === 0);
}
function poiMatchesThemes(poi) {
  return selectedThemes.size === 0 || selectedThemes.has(poi.theme || "Autre");
}

// Panels mutuellement exclusifs
document.getElementById("filter-toggle").addEventListener("click", () => {
  document.getElementById("filter-panel").classList.toggle("hidden");
  document.getElementById("theme-panel").classList.add("hidden");
});
document.getElementById("theme-toggle").addEventListener("click", () => {
  document.getElementById("theme-panel").classList.toggle("hidden");
  document.getElementById("filter-panel").classList.add("hidden");
});

// ═══════════════════════════════════════════════════
//  ÉVALUATION CONDITIONS
// ═══════════════════════════════════════════════════
const AQI_LEVEL      = { "Bon": 1, "Acceptable": 2, "Modéré": 3, "Mauvais": 4, "Très mauvais": 5, "Extrêmement mauvais": 6 };
const AIR_FILTER_MAX = { "any": 99, "bon": 1, "acceptable": 2, "modere": 3 };

function evaluerConditions(meteo, air) {
  if (!meteo) return null;
  const now = meteo.maintenant;
  const checks = [
    { key: "temp",   emoji: "🌡️", label: "Température",      valeur: `${now.temp}°C`,     critere: `${filters.tempMin}°–${filters.tempMax}°`, ok: now.temp >= filters.tempMin && now.temp <= filters.tempMax, skip: false },
    { key: "vent",   emoji: "💨", label: "Vent",              valeur: `${now.vent} km/h`,  critere: `max ${filters.windMax} km/h`, ok: now.vent <= filters.windMax, skip: false },
  ];

  let precipOk = true, precipCritere = "Peu importe";
  if (filters.precip === "none") { precipOk = now.pluie === 0 && now.neige === 0; precipCritere = "Aucune précipitation"; }
  if (filters.precip === "rain") { precipOk = now.neige === 0; precipCritere = "Pluie OK, pas de neige"; }
  if (filters.precip === "snow") { precipOk = now.neige > 0; precipCritere = "Neige souhaitée"; }
  const precipValeur = now.neige > 0 ? `❄️ ${now.neige}cm` : now.pluie > 0 ? `🌧️ ${now.pluie}mm` : "☀️ Aucune";
  checks.push({ key: "precip", emoji: "🌧️", label: "Précipitations", valeur: precipValeur, critere: precipCritere, ok: precipOk, skip: filters.precip === "any" });

  let airOk = true;
  if (air && filters.air !== "any") airOk = (AQI_LEVEL[air.label] || 99) <= AIR_FILTER_MAX[filters.air];
  checks.push({ key: "air", emoji: "🌿", label: "Qualité de l'air", valeur: air ? `${air.icon} ${air.label} (${air.aqi})` : "N/A", critere: filters.air === "any" ? "Peu importe" : `Min. ${filters.air}`, ok: airOk, skip: filters.air === "any" });

  const active = checks.filter(c => !c.skip);
  const failed = active.filter(c => !c.ok);
  const score  = active.length === 0 ? 1 : (active.length - failed.length) / active.length;

  let niveau, couleur, emoji;
  if (!filtersAreActive())  { niveau = "Aucun filtre actif";                couleur = "#aaa";    emoji = "⚪"; }
  else if (score === 1)     { niveau = "Toutes les conditions remplies";     couleur = "#27ae60"; emoji = "🟢"; }
  else if (score >= 0.5)    { niveau = "Conditions partiellement remplies"; couleur = "#f39c12"; emoji = "🟡"; }
  else                      { niveau = "Conditions non remplies";            couleur = "#e74c3c"; emoji = "🔴"; }
  return { checks, score, niveau, couleur, emoji, failedChecks: failed };
}

function buildSemaphoreZone(result) {
  if (!result) return "";
  const rows = result.checks.map(c => `
    <div class="semaphore-row ${c.skip ? "skip" : c.ok ? "ok" : "fail"}">
      <span class="sem-status">${c.skip ? "⚪" : c.ok ? "✅" : "❌"}</span>
      <div class="sem-body">
        <span class="sem-label">${c.emoji} ${c.label} — <b>${c.valeur}</b></span>
        <span class="sem-critere">${c.critere}</span>
      </div>
    </div>`).join("");
  return `
    <div class="semaphore-card" style="border-left:4px solid ${result.couleur}">
      <div class="semaphore-title" style="color:${result.couleur}">${result.emoji} ${result.niveau}</div>
      <div class="semaphore-rows">${rows}</div>
      ${result.failedChecks.length > 0 ? `<div class="semaphore-tip">💡 Élargissez le rayon ou ajustez les filtres</div>` : ""}
    </div>`;
}

function buildMiniSemaphore(result) {
  if (!result || !filtersAreActive()) return "";
  const chips = result.checks.filter(c => !c.skip).map(c => `
    <div class="sem-chip ${c.ok ? "chip-ok" : "chip-fail"}">
      <span class="chip-icon">${c.ok ? "✅" : "❌"}</span>
      <span class="chip-text">${c.emoji} ${c.label}</span>
      <span class="chip-val">${c.valeur}</span>
    </div>`).join("");
  return `<div class="poi-mini-semaphore">${chips}</div>`;
}

// ═══════════════════════════════════════════════════
//  ICÔNES
// ═══════════════════════════════════════════════════
function makeIcon(color = "#1a73e8") {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7],
  });
}
function clearMarkers() { clusterGroup.clearLayers(); }

// ═══════════════════════════════════════════════════
//  AUTOCOMPLETE — geo.api.gouv.fr
// ═══════════════════════════════════════════════════
let suggestTimeout = null;
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  clearTimeout(suggestTimeout);
  if (q.length < 2) { hideSuggest(); return; }
  suggestTimeout = setTimeout(async () => {
    try {
      const [communes, departements, regions] = await Promise.all([
        fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codesPostaux,centre,codeDepartement&boost=population&limit=5`).then(r => r.json()),
        fetch(`https://geo.api.gouv.fr/departements?nom=${encodeURIComponent(q)}&fields=nom,code,centre&limit=3`).then(r => r.json()),
        fetch(`https://geo.api.gouv.fr/regions?nom=${encodeURIComponent(q)}&fields=nom,code,centre&limit=2`).then(r => r.json()),
      ]);
      const results = [
        ...communes.map(c => ({ label: `🏘️ ${c.nom} (${c.codesPostaux?.[0]||c.code})`, sublabel: `Commune · Dép. ${c.codeDepartement}`, lat: c.centre?.coordinates[1], lon: c.centre?.coordinates[0], nom: c.nom, zoom: 13 })),
        ...departements.map(d => ({ label: `🗂️ ${d.nom}`, sublabel: `Département · ${d.code}`, lat: d.centre?.coordinates[1], lon: d.centre?.coordinates[0], nom: d.nom, zoom: 9 })),
        ...regions.map(r => ({ label: `🌍 ${r.nom}`, sublabel: `Région`, lat: r.centre?.coordinates[1], lon: r.centre?.coordinates[0], nom: r.nom, zoom: 8 })),
      ].filter(r => r.lat && r.lon);
      if (!results.length) { hideSuggest(); return; }
      suggestBox.innerHTML = "";
      results.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggest-item";
        div.innerHTML = `<span class="suggest-label">${item.label}</span><span class="suggest-sub">${item.sublabel}</span>`;
        div.addEventListener("mousedown", e => {
          e.preventDefault(); searchInput.value = item.nom; hideSuggest();
          const radius = parseInt(document.getElementById("radius-select").value);
          map.setView([item.lat, item.lon], item.zoom);
          drawRadius(item.lat, item.lon, radius);
          chargerPois(item.lat, item.lon, radius);
        });
        suggestBox.appendChild(div);
      });
      suggestBox.classList.remove("hidden");
    } catch { hideSuggest(); }
  }, 300);
});
searchInput.addEventListener("blur",    () => setTimeout(hideSuggest, 150));
searchInput.addEventListener("keydown", e => { if (e.key === "Escape") hideSuggest(); if (e.key === "Enter") { hideSuggest(); lancerRecherche(); } });
function hideSuggest() { suggestBox.classList.add("hidden"); suggestBox.innerHTML = ""; }

// ═══════════════════════════════════════════════════
//  CHARGER POIs — utilise les endpoints BATCH
//  30 appels individuels → 2 appels batch
// ═══════════════════════════════════════════════════
async function chargerPois(lat, lon, radius) {
  poiList.innerHTML = "<p class='loading'>⏳ Chargement des lieux et classification IA...</p>";

  const pois = await fetch(`/api/pois?lat=${lat}&lon=${lon}&radius=${radius}&size=30`)
    .then(r => r.json());

  if (!pois.length) {
    lastPois = []; lastMeteoDatas = []; lastAirDatas = [];
    rendreListePois([], [], []);
    return;
  }

  poiList.innerHTML = "<p class='loading'>⏳ Chargement météo et qualité de l'air...</p>";

  // UNE seule requête pour toute la météo, UNE seule pour l'air
  const locations = pois.map(p => ({ lat: p.lat, lon: p.lon }));

  const [meteoDatas, airDatas] = await Promise.all([
    fetch("/api/meteo/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locations }) }).then(r => r.json()),
    fetch("/api/air/batch",   { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locations }) }).then(r => r.json()),
  ]);

  lastPois = pois; lastMeteoDatas = meteoDatas; lastAirDatas = airDatas;
  rendreListePois(pois, meteoDatas, airDatas);
}

// ═══════════════════════════════════════════════════
//  RENDRE la liste
// ═══════════════════════════════════════════════════
function rendreListePois(pois, meteoDatas, airDatas) {
  clearMarkers();
  poiList.innerHTML = "";

  const poisFiltres = pois.filter(p => poiMatchesThemes(p));

  if (selectedThemes.size > 0) {
    const resumeDiv = document.createElement("div");
    resumeDiv.className = "theme-resume";
    resumeDiv.textContent = `🏷️ ${poisFiltres.length} lieu${poisFiltres.length > 1 ? "x" : ""} sur ${pois.length} · ${[...selectedThemes].join(", ")}`;
    poiList.appendChild(resumeDiv);
  }

  if (!poisFiltres.length) {
    poiList.innerHTML += "<p id='poi-placeholder'>Aucun résultat pour ces thèmes</p>";
    return;
  }

  const now_str = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const bar = document.createElement("div");
  bar.className = "update-bar";
  bar.textContent = `🕐 Données actualisées à ${now_str}`;
  poiList.appendChild(bar);

  const meteoZone = meteoDatas.find(m => m !== null);
  const airZone   = airDatas.find(a => a !== null);
  const zoneResult = evaluerConditions(meteoZone, airZone);
  if (zoneResult) {
    const semDiv = document.createElement("div");
    semDiv.innerHTML = buildSemaphoreZone(zoneResult);
    poiList.appendChild(semDiv);
  }

  poisFiltres.forEach(poi => {
    const i         = pois.indexOf(poi);
    const meteo     = meteoDatas[i];
    const air       = airDatas[i];
    const now       = meteo?.maintenant;
    const airColor  = air?.color || "#1a73e8";
    const poiResult = evaluerConditions(meteo, air);
    const theme     = poi.theme || "Autre";

    const markerColor = !filtersAreActive() ? airColor :
      poiResult?.score === 1 ? "#27ae60" : poiResult?.score >= 0.5 ? "#f39c12" : "#e74c3c";

    const marker = L.marker([poi.lat, poi.lon], { icon: makeIcon(markerColor) });
    marker.bindTooltip(`
      <div class="map-tooltip">
        <b>${poi.nom}</b><br>📍 ${poi.ville}
        <br><span style="opacity:.8">${THEME_EMOJI[theme]||"📍"} ${theme}</span>
        ${now ? `<br>${now.icone} ${now.temp}°C &nbsp;💨 ${now.vent} km/h` : ""}
        ${now?.neige > 0 ? `<br>❄️ ${now.neige} cm` : ""}
        ${air ? `<br>${air.icon} Air : ${air.label}` : ""}
        ${poiResult && filtersAreActive() ? `<br>${poiResult.emoji} ${poiResult.niveau}` : ""}
      </div>
    `, { direction: "top", offset: [0, -8], opacity: 1, className: "custom-tooltip" });
    marker.on("click", () => ouvrirDetail(poi, meteo, air));
    clusterGroup.addLayer(marker);

    const card = document.createElement("div");
    card.className = "poi-card";
    card.innerHTML = `
      <div class="card-top">
        <h3>${poi.nom}</h3>
        <span class="theme-badge">${THEME_EMOJI[theme]||"📍"} ${theme}</span>
      </div>
      <div class="ville">📍 ${poi.ville}</div>
      ${now ? `<div class="meteo-mini">
        <span>${now.icone} ${now.temp}°C</span>
        <span>💨 ${now.vent} km/h</span>
        ${now.neige > 0 ? `<span>❄️ ${now.neige}cm</span>` : `<span>💧 ${now.humidite}%</span>`}
      </div>` : ""}
      ${air ? `<span class="air-mini" style="background:${air.color}20;border:1px solid ${air.color}">${air.icon} ${air.label} (AQI ${air.aqi})</span>` : ""}
      ${buildMiniSemaphore(poiResult)}
    `;
    card.addEventListener("click", () => { map.setView([poi.lat, poi.lon], 14); ouvrirDetail(poi, meteo, air); });
    poiList.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════
//  PANEL DÉTAIL
// ═══════════════════════════════════════════════════
function ouvrirDetail(poi, meteo, air) {
  const now   = meteo?.maintenant;
  const prev  = meteo?.previsions || [];
  const theme = poi.theme || "Autre";
  detailContent.innerHTML = `
    <div class="card-top" style="margin-bottom:4px">
      <h2>${poi.nom}</h2>
      <span class="theme-badge">${THEME_EMOJI[theme]||"📍"} ${theme}</span>
    </div>
    <div class="ville-d">📍 ${poi.ville}</div>
    ${now ? `
    <div class="meteo-now">
      <div class="icone">${now.icone}</div>
      <div class="temp">${now.temp}°C <span style="font-size:.9rem;opacity:.8">(ressenti ${now.ressenti}°C)</span></div>
      <div class="label">${now.label}</div>
      <div class="details">
        <span>💨 ${now.vent} km/h</span>
        <span>💧 ${now.humidite}%</span>
        ${now.neige > 0 ? `<span>❄️ ${now.neige}cm</span>` : `<span>🌧️ ${now.pluie}mm</span>`}
      </div>
    </div>
    <div class="prev-scroll">
      ${prev.map(j => `
        <div class="prev-day">
          <div class="prev-date">${j.date}</div>
          <div class="prev-icone">${j.icone}</div>
          <div class="prev-temps">${j.min}° / ${j.max}°</div>
          ${j.neige > 0 ? `<div class="prev-snow">❄️ ${j.neige}cm</div>` : `<div class="prev-pluie">${j.pluie}mm</div>`}
        </div>`).join("")}
    </div>` : ""}
    ${air ? `
    <div class="air-bloc" style="background:${air.color}18;border:1px solid ${air.color}50">
      <div class="air-titre">
        ${air.icon} Qualité de l'air — ${air.label} (AQI ${air.aqi})
        <button class="air-help-btn" onclick="document.getElementById('air-help-popup').classList.remove('hidden')">?</button>
      </div>
      <div class="air-grid">
        <span>PM2.5 : <b>${air.pm25} µg/m³</b></span>
        <span>PM10  : <b>${air.pm10} µg/m³</b></span>
        <span>NO₂   : <b>${air.no2} µg/m³</b></span>
        <span>O₃    : <b>${air.o3} µg/m³</b></span>
      </div>
    </div>` : ""}
    ${poi.description ? `<p class="poi-desc">${poi.description}</p>` : ""}
    <div class="poi-links">
      ${poi.web ? `<a href="${poi.web}" target="_blank">🌐 Site web</a>` : ""}
      ${poi.tel ? `<a href="tel:${poi.tel}">📞 ${poi.tel}</a>` : ""}
    </div>
  `;
  detailPanel.classList.remove("hidden");
}
document.getElementById("close-detail").addEventListener("click", () => detailPanel.classList.add("hidden"));
document.getElementById("air-help-close").addEventListener("click", () => document.getElementById("air-help-popup").classList.add("hidden"));

// ═══════════════════════════════════════════════════
//  CERCLE DE RAYON
// ═══════════════════════════════════════════════════
let radiusCircle = null, centerMarker = null;
function drawRadius(lat, lon, radiusKm) {
  if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
  if (centerMarker) { map.removeLayer(centerMarker); centerMarker = null; }
  radiusCircle = L.circle([lat, lon], { radius: radiusKm*1000, color: "#1a73e8", weight: 2, opacity: 0.8, fillColor: "#1a73e8", fillOpacity: 0.06, dashArray: "6 4" }).addTo(map);
  centerMarker = L.circleMarker([lat, lon], { radius: 6, color: "#1a73e8", weight: 2, fillColor: "white", fillOpacity: 1 }).addTo(map);
  centerMarker.bindTooltip(`🔍 Rayon ${radiusKm} km`, { permanent: true, direction: "top", offset: [0,-10], className: "radius-label" }).openTooltip();
}
document.getElementById("radius-select").addEventListener("change", () => {
  if (radiusCircle) { const c = radiusCircle.getLatLng(); drawRadius(c.lat, c.lng, parseInt(document.getElementById("radius-select").value)); }
});

// ═══════════════════════════════════════════════════
//  GÉOLOCALISATION
// ═══════════════════════════════════════════════════
document.getElementById("locate-btn").addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lon } = pos.coords;
    const radius = parseInt(document.getElementById("radius-select").value);
    map.setView([lat, lon], 12);
    drawRadius(lat, lon, radius);
    chargerPois(lat, lon, radius);
  }, () => alert("Géolocalisation refusée ou indisponible"));
});

// ═══════════════════════════════════════════════════
//  RECHERCHE TEXTUELLE
// ═══════════════════════════════════════════════════
document.getElementById("search-btn").addEventListener("click", lancerRecherche);
function lancerRecherche() {
  const q = searchInput.value.trim();
  if (!q) return;
  poiList.innerHTML = "<p class='loading'>⏳ Recherche et classification IA...</p>";
  fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()).then(async pois => {
    if (!pois.length) { lastPois=[]; rendreListePois([],[],[]); return; }
    const locations = pois.map(p => ({ lat: p.lat, lon: p.lon }));
    const [meteos, airs] = await Promise.all([
      fetch("/api/meteo/batch", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({locations}) }).then(r => r.json()),
      fetch("/api/air/batch",   { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({locations}) }).then(r => r.json()),
    ]);
    lastPois = pois; lastMeteoDatas = meteos; lastAirDatas = airs;
    rendreListePois(pois, meteos, airs);
  });
}

// ═══════════════════════════════════════════════════
//  CLIC SUR LA CARTE
// ═══════════════════════════════════════════════════
map.on("click", e => {
  const { lat, lng } = e.latlng;
  const radius = parseInt(document.getElementById("radius-select").value);
  drawRadius(lat, lng, radius);
  chargerPois(lat, lng, radius);
});
