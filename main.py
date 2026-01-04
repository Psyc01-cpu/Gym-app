from fastapi import FastAPI, Request, Body, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

USERS = {
    "dan": "admin123",
    "papy": "user123"
}

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request, user: str):
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "user": user}
    )

@app.post("/api/login")
def login(data: dict = Body(...)):
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Champs manquants")

    if username not in USERS:
        raise HTTPException(status_code=401, detail="Utilisateur inconnu")

    if USERS[username] != password:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")

    return {"success": True}
