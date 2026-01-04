from fastapi import FastAPI

app = FastAPI(title="Projet Gotham API")

@app.get("/")
def root():
    return {"status": "ok", "message": "Projet Gotham API en ligne"}
