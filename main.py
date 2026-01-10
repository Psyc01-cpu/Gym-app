import bcrypt
import uuid
from datetime import datetime
from collections import defaultdict
import os
import json
import tempfile

import gspread
from google.oauth2.service_account import Credentials

from fastapi import FastAPI, Request, Body, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


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
WORKOUTS_SHEET = "workouts"
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


def get_workouts_sheet():
    client = get_client()
    return client.open(SPREADSHEET_NAME).worksheet(WORKOUTS_SHEET)


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
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "user": user}
    )


# -------------------
# API - USERS
# -------------------

@app.get("/api/users")
def get_users():
    try:
        users_sheet = get_users_sheet()
        workouts_sheet = get_workouts_sheet()

        users_rows = users_sheet.get_all_records()
        workouts_rows = workouts_sheet.get_all_records()

        users = []

        for user in users_rows:
            if str(user.get("is_active")).lower() not in ["true", "1", "yes", "vrai"]:
                continue

            user_id = user.get("user_id")
            username = user.get("username")

            volume = 0

            for w in workouts_rows:
                if w.get("user_id") == user_id:
                    try:
                        volume += float(w.get("weight", 0))
                    except:
                        pass

            tier = compute_tier(int(volume))
            score = int(volume / 10)

            users.append({
                "user_id": user_id,
                "username": username,
                "volume": int(volume),
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

        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

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

                if bcrypt.checkpw(
                    password.encode("utf-8"),
                    stored_hash.encode("utf-8")
                ):
                    return {"success": True}

        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# API - WORKOUTS
# -------------------

@app.post("/api/workouts")
def add_workout(data: dict = Body(...)):
    user_id = data.get("user_id")
    username = data.get("username")
    exercise = data.get("exercise")
    weight = data.get("weight")

    if not user_id or not username or not exercise or not weight:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        weight = float(weight)
    except:
        raise HTTPException(status_code=400, detail="Poids invalide")

    try:
        sheet = get_workouts_sheet()

        sheet.append_row([
            str(uuid.uuid4()),
            user_id,
            exercise,
            weight,
            datetime.utcnow().isoformat()
        ])

        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# API - LEAST EXERCISE
# -------------------

@app.get("/api/least-exercise")
def get_least_exercise(user_id: str):
    try:
        sheet = get_workouts_sheet()
        rows = sheet.get_all_records()

        stats = {}

        for row in rows:
            if str(row.get("user_id")) == str(user_id):
                ex = row.get("exercise")
                weight = float(row.get("weight") or 0)
                stats[ex] = stats.get(ex, 0) + weight

        if not stats:
            return {"exercise": None}

        least_exercise = min(stats, key=stats.get)

        return {
            "exercise": least_exercise,
            "volume": int(stats[least_exercise])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -------------------
# API - EXERCISES LIST
# -------------------

@app.get("/api/exercises")
def get_exercises(user_id: str):
    try:
        sheet = get_workouts_sheet()
        rows = sheet.get_all_records()

        user_rows = [
            r for r in rows
            if str(r.get("user_id")) == str(user_id)
        ]

        if not user_rows:
            return []

        exercises = defaultdict(list)

        for row in user_rows:
            exercise = row.get("exercise")
            if exercise:
                exercises[exercise].append(row)

        result = []

        for exercise, rows in exercises.items():
            weights = []
            dates = []

            for r in rows:
                try:
                    weights.append(float(r.get("weight", 0)))
                except:
                    pass

                try:
                    if r.get("date"):
                        dates.append(datetime.fromisoformat(r.get("date")))
                except:
                    pass

            if not weights:
                continue

            max_weight = max(weights)
            training_weight = round(max_weight * 0.8, 1)
            sessions = len(weights)
            last_date = max(dates).strftime("%Y-%m-%d") if dates else None

            result.append({
                "exercise": exercise,
                "max_weight": max_weight,
                "training_weight": training_weight,
                "sessions": sessions,
                "last_date": last_date
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from collections import defaultdict

EXERCISES_SHEET = "exercises"

def get_exercises_sheet():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    creds_file = get_google_creds_file()
    creds = Credentials.from_service_account_file(creds_file, scopes=scopes)
    client = gspread.authorize(creds)
    return client.open(SPREADSHEET_NAME).worksheet(EXERCISES_SHEET)


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
            str(uuid.uuid4()),
            user_id,
            name,
            zone,
            video_url,
            datetime.utcnow().isoformat()
        ])

        return {"success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
