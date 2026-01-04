from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Projet Gotham")

@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Batman Training</title>
        <style>
            body {
                margin: 0;
                font-family: Arial, sans-serif;
                background: radial-gradient(circle at top, #111 0%, #000 60%);
                color: #f5c542;
                text-align: center;
            }
            h1 {
                margin-top: 80px;
                font-size: 48px;
                letter-spacing: 2px;
            }
            p {
                color: #aaa;
                margin-bottom: 40px;
            }
            .card {
                background: #111;
                border: 1px solid #333;
                border-radius: 12px;
                padding: 30px;
                width: 300px;
                margin: 0 auto;
                box-shadow: 0 0 30px rgba(245,197,66,0.1);
            }
            button {
                background: #f5c542;
                color: #000;
                border: none;
                p
