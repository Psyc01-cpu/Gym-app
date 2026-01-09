import bcrypt
import uuid
from datetime import datetime

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
SHEET_NAME = "users"              
WORKOUTS_SHEET = "workouts"
STATS_SHEET = "stats"


def get_google_creds_file():
    """
    Recrée dynamiquement un fichier JSON temporaire
    depuis la variable d’environnement GOOGLE_CREDS_JSON (Render)
    """
    creds_json = os.environ.get("GOOGLE_CREDS_JSON")

    if not creds_json:
        raise RuntimeError("GOOGLE_CREDS_JSON non défini dans Render")

    data = json.loads(creds_json)

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
    with open(temp_file.name, "w") as f:
        json.dump(data, f)

    return temp_file.name


def get_sheet():
    """
    Connexion à Google Sheets
    """
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]

    creds_file = get_google_creds_file()

    creds = Credentials.from_service_account_file(
        creds_file,
        scopes=scopes
    )

    client = gspread.authorize(creds)
    sheet = client.open(SPREADSHEET_NAME).worksheet(SHEET_NAME)
    return sheet

def get_workouts_sheet():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    creds_file = get_google_creds_file()
    creds = Credentials.from_service_account_file(creds_file, scopes=scopes)
    client = gspread.authorize(creds)
    return client.open(SPREADSHEET_NAME).worksheet(WORKOUTS_SHEET)


def get_stats_sheet():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
    ]
    creds_file = get_google_creds_file()
    creds = Credentials.from_service_account_file(creds_file, scopes=scopes)
    client = gspread.authorize(creds)
    return client.open(SPREADSHEET_NAME).worksheet(STATS_SHEET)


def compute_tier(volume: int) -> str:
    if volume < 1000:
        return "Bronze"
    elif volume < 5000:
        return "Silver"
    elif volume < 15000:
        return "Gold"
    else:
        return "Diamond"

@app.post("/api/workouts")
def add_workout(data: dict = Body(...)):
    """
    Enregistre un poids soulevé et met à jour les stats
    """
    user_id = data.get("user_id")
    username = data.get("username")
    exercise = data.get("exercise", "")
    weight = data.get("weight")

    if not user_id or not username or not weight:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        weight = int(weight)
    except:
        raise HTTPException(status_code=400, detail="Poids invalide")

    try:
        workouts_sheet = get_workouts_sheet()
        stats_sheet = get_stats_sheet()

        # ➕ Ajouter la perf
        workouts_sheet.append_row([
            str(uuid.uuid4()),
            user_id,
            username,
            exercise,
            weight,
            datetime.utcnow().isoformat()
        ])

        # 🔢 Recalcul du volume total
        rows = workouts_sheet.get_all_records()
        total_volume = sum(
            int(r.get("weight", 0))
            for r in rows
            if r.get("user_id") == user_id
        )

        points = total_volume
        tier = compute_tier(total_volume)

        # 📊 Mise à jour stats
        stats_rows = stats_sheet.get_all_records()
        updated = False

        for idx, row in enumerate(stats_rows, start=2):
            if row.get("user_id") == user_id:
                stats_sheet.update(f"C{idx}", total_volume)
                stats_sheet.update(f"D{idx}", points)
                stats_sheet.update(f"E{idx}", tier)
                stats_sheet.update(f"G{idx}", datetime.utcnow().isoformat())
                updated = True
                break

        if not updated:
            stats_sheet.append_row([
                user_id,
                username,
                total_volume,
                points,
                tier,
                "",  # rank sera recalculé
                datetime.utcnow().isoformat()
            ])

        return {
            "success": True,
            "total_volume": total_volume,
            "points": points,
            "tier": tier
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats():
    """
    Retourne les stats classées par points
    """
    try:
        stats_sheet = get_stats_sheet()
        rows = stats_sheet.get_all_records()

        rows.sort(key=lambda r: int(r.get("points", 0)), reverse=True)

        result = []
        for idx, row in enumerate(rows, start=1):
            row["rank"] = idx
            result.append(row)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



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
# API - USERS (LECTURE)
# -------------------

@app.get("/api/users")
def get_users():
    """
    Retourne la liste des utilisateurs avec stats
    """
    try:
        sheet = get_sheet()
        rows = sheet.get_all_records()

        users = []

        for row in rows:
            is_active = str(row.get("is_active")).lower()
            if is_active not in ["true", "vrai", "1", "yes"]:
                continue

            volume = float(row.get("volume_total") or 0)
            score = int(row.get("score") or 0)
            tier = row.get("tier") or "Bronze I"
            rank = int(row.get("rank") or 0)

            users.append({
                "username": row.get("username"),
                "tier": tier,
                "score": score,
                "rank": rank,
                "volume": int(volume)
            })

        # Classement automatique par score décroissant
        users.sort(key=lambda u: u["score"], reverse=True)
        for i, u in enumerate(users):
            u["rank"] = i + 1

        return users

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# -------------------
# API - USERS (CREATION)
# -------------------

@app.post("/api/users")
def create_user(data: dict = Body(...)):
    """
    Création d’un utilisateur dans Google Sheets
    """
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user")

    gender = data.get("gender")
    age = data.get("age")
    height = data.get("height")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Champs obligatoires manquants")

    try:
        sheet = get_sheet()
        rows = sheet.get_all_records()

        # Vérifier doublon
        for row in rows:
            if row.get("username") == username:
                raise HTTPException(
                    status_code=400,
                    detail="Utilisateur déjà existant"
                )

        # Hash du mot de passe
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        new_row = [
            str(uuid.uuid4()),              # user_id
            username,                      # username
            password_hash,                 # password_hash
            role,                          # role
            gender,                        # gender
            int(age) if age else "",        # age
            int(height) if height else "", # height
            True,                           # is_active
            datetime.utcnow().isoformat()  # created_at
        ]

        sheet.append_row(new_row)

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
    """
    Vérifie les identifiants avec bcrypt
    """
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        sheet = get_sheet()
        rows = sheet.get_all_records()

        for row in rows:
            if (
                row.get("username") == username
                and str(row.get("is_active")).upper() == "TRUE"
            ):
                stored_hash = row.get("password_hash")

                if not stored_hash:
                    break

                if bcrypt.checkpw(
                    password.encode("utf-8"),
                    stored_hash.encode("utf-8")
                ):
                    return {
                        "success": True,
                        "role": row.get("role"),
                        "gender": row.get("gender"),
                        "age": row.get("age"),
                        "height": row.get("height")
                    }

                break

        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/least-exercise")
def get_least_exercise(user: str):
    """
    Retourne l'exercice le moins travaillé pour un utilisateur
    """
    try:
        sheet = client.open("GothamUsers").worksheet("exercises")
        rows = sheet.get_all_records()

        # Filtrer uniquement les exercices du user
        user_rows = [r for r in rows if r.get("user") == user]

        if not user_rows:
            return {"exercise": None}

        # Cumuler les volumes par exercice
        stats = {}
        for row in user_rows:
            ex = row.get("exercise")
            vol = float(row.get("volume") or 0)
            stats[ex] = stats.get(ex, 0) + vol

        # Trouver l'exercice avec le plus petit volume
        least_exercise = min(stats, key=stats.get)

        return {
            "exercise": least_exercise,
            "volume": stats[least_exercise]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
