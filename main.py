import os
import json
import time
import uuid
import tempfile
from datetime import datetime
from collections import defaultdict

import bcrypt
import gspread
from google.oauth2.service_account import Credentials

from fastapi import FastAPI, Request, Body, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


# -------------------
# CACHE SYSTEM
# -------------------

CACHE = {
    "users": {"data": None, "ts": 0},
    "exercises": {"data": None, "ts": 0},
    "performances": {"data": None, "ts": 0},
}

CACHE_TTL = 30  # durée du cache en secondes


def get_cached(key, loader):
    now = time.time()
    if key not in CACHE:
        raise KeyError(key)

    entry = CACHE[key]

    # Recharge si vide ou expiré
    if entry["data"] is None or now - entry["ts"] > CACHE_TTL:
        print(f"🔄 Refresh cache: {key}")
        entry["data"] = loader()
        entry["ts"] = now

    return entry["data"]


def invalidate_cache(key: str):
    if key in CACHE:
        CACHE[key]["data"] = None
        CACHE[key]["ts"] = 0


# -------------------
# APP CONFIG
# -------------------

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# -------------------
# GOOGLE SHEETS CONFIG
# -------------------

SPREADSHEET_NAME = "GothamUsers"
USERS_SHEET = "users"
EXERCISES_SHEET = "exercises"
PERFORMANCES_SHEET = "performances"
STATS_SHEET = "stats"


# -------------------
# GOOGLE CREDS
# -------------------

def get_google_creds_file():
    """
    Recrée dynamiquement un fichier JSON temporaire
    depuis la variable d’environnement GOOGLE_CREDS_JSON
    """
    creds_json = os.environ.get("GOOGLE_CREDS_JSON")
    if not creds_json:
        raise RuntimeError("GOOGLE_CREDS_JSON non défini")

    data = json.loads(creds_json)

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
    with open(temp_file.name, "w") as f:
        json.dump(data, f)

    return temp_file.name


def get_client():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    creds_file = get_google_creds_file()
    creds = Credentials.from_service_account_file(creds_file, scopes=scopes)
    return gspread.authorize(creds)


def get_users_sheet():
    client = get_client()
    return client.open(SPREADSHEET_NAME).worksheet(USERS_SHEET)


def get_exercises_sheet():
    client = get_client()
    return client.open(SPREADSHEET_NAME).worksheet(EXERCISES_SHEET)


def get_performances_sheet():
    client = get_client()
    return client.open(SPREADSHEET_NAME).worksheet(PERFORMANCES_SHEET)


def get_stats_sheet():
    client = get_client()
    return client.open(SPREADSHEET_NAME).worksheet(STATS_SHEET)


# -------------------
# TIER SYSTEM
# -------------------

def compute_tier(volume: int) -> str:
    tiers = [
        (10_000, "Bronze I"),
        (50_000, "Bronze II"),
        (100_000, "Bronze III"),
        (200_000, "Argent I"),
        (400_000, "Argent II"),
        (600_000, "Argent III"),
        (800_000, "Or I"),
        (1_200_000, "Or II"),
        (1_600_000, "Or III"),
        (2_000_000, "Diamant I"),
        (2_600_000, "Diamant II"),
        (3_200_000, "Diamant III"),
        (4_000_000, "Mythique I"),
        (5_000_000, "Mythique II"),
        (6_000_000, "Mythique III"),
        (7_500_000, "Légendaire I"),
        (9_000_000, "Légendaire II"),
        (10_000_000, "Légendaire III"),
        (12_000_000, "Élite I"),
        (15_000_000, "Élite II"),
        (18_000_000, "Élite III"),
        (22_000_000, "Maître I"),
        (27_000_000, "Maître II"),
        (32_000_000, "Maître III"),
        (38_000_000, "Titan I"),
        (45_000_000, "Titan II"),
        (52_000_000, "Titan III"),
        (60_000_000, "Ombre I"),
        (75_000_000, "Ombre II"),
        (100_000_000, "Ombre III"),
    ]

    for limit, name in tiers:
        if volume < limit:
            return name

    return "Ombre III"


# -------------------
# PAGES HTML
# -------------------

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, user: str):
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": user})


# -------------------
# API - USERS
# -------------------

@app.get("/api/users")
def get_users():
    try:
        users_rows = get_cached("users", lambda: get_users_sheet().get_all_records())
        perf_rows = get_cached("performances", lambda: get_performances_sheet().get_all_records())

        users = []

        for user in users_rows:
            if str(user.get("is_active")).lower() not in ["true", "1", "yes", "vrai"]:
                continue

            user_id = user.get("user_id")
            username = user.get("username")

            volume = 0.0
            for p in perf_rows:
                if str(p.get("user_id")) == str(user_id):
                    try:
                        w = p.get("weight")
                        volume += float(w) if w not in ["", None] else 0.0
                    except:
                        pass

            volume_int = int(volume)
            tier = compute_tier(volume_int)
            score = int(volume_int / 10)

            users.append({
                "user_id": user_id,
                "username": username,
                "volume": volume_int,
                "score": score,
                "tier": tier
            })

        users.sort(key=lambda u: u["volume"], reverse=True)

        for idx, u in enumerate(users, start=1):
            u["rank"] = idx

        return users

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users")
def create_user(data: dict = Body(...)):
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user")
    gender = data.get("gender")
    age = data.get("age")
    height = data.get("height")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        sheet = get_users_sheet()
        rows = sheet.get_all_records()

        for row in rows:
            if row.get("username") == username:
                raise HTTPException(status_code=400, detail="Utilisateur déjà existant")

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        sheet.append_row([
            str(uuid.uuid4()),
            username,
            password_hash,
            role,
            gender,
            int(age) if age else "",
            int(height) if height else "",
            True,
            datetime.utcnow().isoformat()
        ])

        invalidate_cache("users")
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# API - LOGIN
# -------------------

@app.post("/api/login")
def login(data: dict = Body(...)):
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        sheet = get_users_sheet()
        rows = sheet.get_all_records()

        for row in rows:
            if row.get("username") == username and str(row.get("is_active")).upper() == "TRUE":
                stored_hash = row.get("password_hash")
                if bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8")):
                    return {"success": True}

        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# API - LEAST EXERCISE (basé sur performances)
# -------------------

@app.get("/api/least-exercise")
def get_least_exercise(user_id: str):
    """
    Renvoie l'exercice le moins travaillé (volume le plus faible),
    basé sur performances + catalogue exercises.
    """
    try:
        exercises_rows = get_cached("exercises", lambda: get_exercises_sheet().get_all_records())
        perf_rows = get_cached("performances", lambda: get_performances_sheet().get_all_records())

        # Exercices du user
        user_exercises = [e for e in exercises_rows if str(e.get("user_id")) == str(user_id)]
        if not user_exercises:
            return {"exercise": None, "volume": 0}

        # init volumes à 0 pour tous
        volumes = {}
        ex_name_by_id = {}
        for e in user_exercises:
            ex_id = str(e.get("exercise_id"))
            if ex_id:
                volumes[ex_id] = 0.0
                ex_name_by_id[ex_id] = e.get("name") or "Exercice"

        # cumule poids
        for p in perf_rows:
            if str(p.get("user_id")) != str(user_id):
                continue
            ex_id = str(p.get("exercise_id"))
            if ex_id in volumes:
                try:
                    w = p.get("weight")
                    volumes[ex_id] += float(w) if w not in ["", None] else 0.0
                except:
                    pass

        least_ex_id = min(volumes, key=volumes.get)
        return {"exercise": ex_name_by_id.get(least_ex_id), "volume": int(volumes[least_ex_id])}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# API - EXERCISES (catalogue + stats via performances)
# -------------------

@app.get("/api/exercises")
def get_exercises(user_id: str):
    try:
        exercises_rows = get_cached("exercises", lambda: get_exercises_sheet().get_all_records())
        perf_rows = get_cached("performances", lambda: get_performances_sheet().get_all_records())

        # Catalogue user
        user_exercises = [ex for ex in exercises_rows if str(ex.get("user_id")) == str(user_id)]

        ex_map = {}
        for ex in user_exercises:
            ex_id = str(ex.get("exercise_id"))
            if ex_id:
                ex_map[ex_id] = {
                    "name": ex.get("name") or "Exercice",
                    "zone": ex.get("zone") or "",
                    "video_url": ex.get("video_url") or "",
                }

        # Perfs user groupées
        grouped = defaultdict(list)
        for p in perf_rows:
            if str(p.get("user_id")) != str(user_id):
                continue
            ex_id = str(p.get("exercise_id"))
            if ex_id:
                grouped[ex_id].append(p)

        result = []

        for ex_id, meta in ex_map.items():
            rows = grouped.get(ex_id, [])

            weights = []
            dates = []

            for r in rows:
                w = r.get("weight")
                try:
                    if w not in ["", None]:
                        weights.append(float(w))
                except:
                    pass

                d = r.get("date")
                try:
                    if d:
                        dates.append(datetime.fromisoformat(d))
                except:
                    pass

            sessions = len(rows)
            last_date = max(dates).strftime("%Y-%m-%d") if dates else None
            max_weight = max(weights) if weights else 0
            training_weight = round(max_weight * 0.8, 1) if max_weight else 0

            result.append({
                "exercise_id": ex_id,
                "exercise": meta["name"],
                "zone": meta["zone"],
                "video_url": meta["video_url"],
                "max_weight": max_weight,
                "training_weight": training_weight,
                "sessions": sessions,
                "last_date": last_date
            })

        result.sort(key=lambda x: (x["last_date"] or ""), reverse=True)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/exercises/create")
def create_exercise(data: dict = Body(...)):
    name = data.get("name")
    zone = data.get("zone")
    video_url = data.get("video_url", "")
    user_id = data.get("user_id")

    if not name or not zone or not user_id:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        sheet = get_exercises_sheet()

        sheet.append_row([
            str(uuid.uuid4()),          # exercise_id
            user_id,
            name,
            zone,
            video_url,
            datetime.utcnow().isoformat()
        ])

        invalidate_cache("exercises")
        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# API - PERFORMANCES
# -------------------

@app.post("/api/performances/create")
def create_performance(data: dict = Body(...)):
    user_id = data.get("user_id")
    exercise_id = data.get("exercise_id")
    date = data.get("date")            # ISO string
    weight = data.get("weight", "")    # optionnel
    reps = data.get("reps")
    ressenti = data.get("ressenti")
    notes = data.get("notes", "")

    if not user_id or not exercise_id or not date or reps is None or ressenti is None:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        try:
            reps = int(reps)
        except:
            raise HTTPException(status_code=400, detail="reps invalide")

        if weight not in ["", None]:
            try:
                weight = float(weight)
            except:
                raise HTTPException(status_code=400, detail="weight invalide")
        else:
            weight = ""

        sheet = get_performances_sheet()

        sheet.append_row([
            str(uuid.uuid4()),          # perf_id
            user_id,
            exercise_id,
            date,
            weight,
            reps,
            ressenti,
            notes,
            datetime.utcnow().isoformat()
        ])

        invalidate_cache("performances")
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# HEALTH CHECK
# -------------------

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok"}
