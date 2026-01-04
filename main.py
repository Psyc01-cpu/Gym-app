from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

app = FastAPI()

# Lien vers les fichiers statiques (CSS / JS)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Lien vers les templates HTML
templates = Jinja2Templates(directory="templates")

# Page principale
@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )

from fastapi import Form
from fastapi.responses import JSONResponse

USERS = {
    "dan": "admin123",
    "papy": "user123"
}

@app.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    if username in USERS and USERS[username] == password:
        return {"status": "ok", "user": username}
    return JSONResponse(
        status_code=401,
        content={"status": "error", "message": "Mot de passe incorrect"}
    )
