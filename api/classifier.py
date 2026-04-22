import requests
import json
import os
import time


# OpenRouter API - usar modelo solicitado
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
# Modelo solicitado por el usuario (rápido / multimodal)
MODEL = "google/gemini-2.0-flash-lite-001"

THEMATIQUES = [
    "Patrimoine Historique", "Culture & Musées", "Nature & Parcs", "Sport & Aventure",
    "Gastronomie & Terroir", "Loisirs Familiaux", "Détente & Bien-être",
    "Spectacles & Événements", "Activités Aquatiques", "Shopping & Artisanat",
    "Vie Nocturne", "Édifices Religieux", "Science & Industrie",
    "Oenotourisme", "Circuits & Balades", "Autre"
]


def classer_activites(pois, max_retries=3):
    if not pois:
        return pois

    pois_pour_prompt = [
        {"id": p.get("uuid"), "nom": p.get("nom", "?")[:300]}
        for p in pois
    ]

    prompt_text = (
        "En tant qu'expert en tourisme, associe chacun des Points d'Intérêt (POIs) suivants à UNE SEULE thématique parmi la liste.\n"
        "Si le POI ne correspond à aucune thématique, utilise strictement 'Autre'.\n"
        "Réponds UNIQUEMENT par un objet JSON valide où la clé est l'id du POI et la valeur est la thématique.\n\n"
        f"Thématiques autorisées: {', '.join(THEMATIQUES)}\n\n"
        f"POIs: {json.dumps(pois_pour_prompt, ensure_ascii=False)}\n\n"
        "Réponse attendue: Objet JSON strict, sans bloc de code, sans texte supplémentaire."
    )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:5000",
        "X-Title": "Projet Tourisme",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt_text}],
        "temperature": 0.2,
        "max_tokens": 2048
    }

    for attempt in range(max_retries):
        try:
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )

            # Retry sur 429 avec backoff simple
            if resp.status_code == 429:
                wait = 5 * (attempt + 1)  # 5s, 10s, 15s
                print(f"[classifier] 429 — attente {wait}s (tentative {attempt+1}/{max_retries})")
                time.sleep(wait)
                continue

            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()

            # Nettoyer les blocs ```json
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()

            categories_map = json.loads(content)

            for p in pois:
                cat = categories_map.get(p.get("uuid"), "Autre")
                p["theme"] = cat if cat in THEMATIQUES else "Autre"

            print(f"[classifier] ✅ {len(pois)} POIs classifiés")
            return pois

        except json.JSONDecodeError as e:
            print(f"[classifier] JSON invalido (tentativa {attempt+1}): {e}")
            if attempt < max_retries - 1:
                time.sleep(3)
            continue
        except requests.exceptions.HTTPError as e:
            print(f"[classifier] HTTP Error (tentativa {attempt+1}): {e}")
            if hasattr(e.response, 'text'):
                print(f"[classifier] Response: {e.response.text[:200]}")
            if attempt < max_retries - 1:
                time.sleep(3)
            continue
        except Exception as e:
            print(f"[classifier] Erreur (tentativa {attempt+1}): {type(e).__name__} - {str(e)[:100]}")
            if attempt < max_retries - 1:
                time.sleep(3)
            continue

    # Toutes les tentatives ont échoué
    print("[classifier] ⚠️  Toutes les tentatives ont échoué — thème 'Autre' par défaut (API indisponible)")
    for p in pois:
        p.setdefault("theme", "Autre")
    return pois
