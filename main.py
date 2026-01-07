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

SPREADSHEET_NAME = "GothamUsers"   # ⚠️ nom exact de ton fichier Google Sheet
SHEET_NAME = "users"              # ⚠️ nom exact de l’onglet


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
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds_file = get_google_creds_file()

    creds = Credentials.from_service_account_file(
        creds_file,
        scopes=scopes
    )

    client = gspread.authorize(creds)
    sheet = client.open(SPREADSHEET_NAME).worksheet(SHEET_NAME)
    return sheet


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
    """
    Retourne la liste des usernames depuis Google Sheets
    """
    try:
        sheet = get_sheet()
        rows = sheet.get_all_records()
        return [row["username"] for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/users")
def create_user(data: dict = Body(...)):
    """
    Création d’un nouvel utilisateur dans Google Sheets
    """
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        sheet = get_sheet()
        rows = sheet.get_all_records()

        # Vérifier doublon
        for row in rows:
            if row["username"] == username:
                raise HTTPException(
                    status_code=400,
                    detail="Utilisateur déjà existant"
                )

        # Ajout dans la feuille
        sheet.append_row([username, password])
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
    Vérifie les identifiants dans Google Sheets
    """
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Champs manquants")

    try:
        sheet = get_sheet()
        rows = sheet.get_all_records()

        for row in rows:
            if row["username"] == username and row["password"] == password:
                return {"success": True}

        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
