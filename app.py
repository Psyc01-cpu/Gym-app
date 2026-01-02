import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd
from datetime import datetime

# ---------------- CONFIG ----------------
st.set_page_config(
    page_title="Projet Gotham",
    page_icon="🦇",
    layout="centered"
)

st.title("🦇 Projet Gotham")

URL = "https://docs.google.com/spreadsheets/d/1JqA_BaanjhljtGswHsPG2oMIIT9VjEa4YjH3mLAUczA/edit?usp=sharing"
conn = st.connection("gsheets", type=GSheetsConnection)

COLUMNS = ["Date", "Exercice", "Poids", "Reps", "Notes"]

# ---------------- FONCTIONS ----------------
def load_data():
    data = conn.read(spreadsheet=URL)
    if data is None or data.empty:
        return pd.DataFrame(columns=COLUMNS)
    return data

def save_data(df):
    conn.update(spreadsheet=URL, data=df)

# ---------------- INTERFACE ----------------
tab1, tab2, tab3 = st.tabs([
    "➕ Nouvelle séance",
    "📄 Historique",
    "📈 Progression"
])

# ---------- ONGLET 1 : SAISIE ----------
with tab1:
    st.subheader("Ajouter une séance")

    with st.form("gym_form", clear_on_submit=True):
        exercice = st.selectbox(
            "Exercice",
            [
                "Développé couché",
                "Squat",
                "Soulevé de terre",
                "Tractions",
                "Dips",
                "Fentes"
            ]
        )

        col1, col2 = st.columns(2)
        with col1:
            poids = st.number_input("Poids (kg)", min_value=0, step=1)
        with col2:
            reps = st.number_input("Répétitions", min_value=0, step=1)

        notes = st.text_input("Notes")
        submit = st.form_submit_button("Enregistrer")

    if submit:
        df = load_data()

        new_row = pd.DataFrame([{
            "Date": datetime.now().strftime("%Y-%m-%d"),
            "Exercice": exercice,
            "Poids": int(poids),
            "Reps": int(reps),
            "Notes": notes
        }])

        df = pd.concat([df, new_row], ignore_index=True)
        save_data(df)

        st.success("Séance enregistrée avec succès")

# ---------- ONGLET 2 : HISTORIQUE ----------
with tab2:
    st.subheader("Historique des séances")

    df = load_data()

    if df.empty:
        st.info("Aucune séance enregistrée pour le moment.")
    else:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df["Poids"] = pd.to_numeric(df["Poids"], errors="coerce")
        df["Reps"] = pd.to_numeric(df["Reps"], errors="coerce")

        filtres = st.multiselect(
            "Filtrer par exercice",
            sorted(df["Exercice"].dropna().unique())
        )

        if filtres:
            df = df[df["Exercice"].isin(filtres)]

        st.dataframe(
            df.sort_values("Date", ascending=False),
            use_container_width=True
        )

        csv = df.to_csv(index=False).encode("utf-8")
        st.download_button(
            "Télécharger les données (CSV)",
            data=csv,
            file_name="projet_gotham_gym_tracker.csv",
            mime="text/csv"
        )

# ---------- ONGLET 3 : PROGRESSION ----------
with tab3:
    st.subheader("Progression par exercice")

    df = load_data()

    if df.empty:
        st.info("Pas assez de données pour afficher une progression.")
    else:
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df["Poids"] = pd.to_numeric(df["Poids"], errors="coerce")

        exercice = st.selectbox(
            "Choisir un exercice",
            sorted(df["Exercice"].dropna().unique())
        )

        d = df[df["Exercice"] == exercice].dropna(subset=["Date", "Poids"])

        if d.empty:
            st.info("Pas encore de données pour cet exercice.")
        else:
            progression = (
                d.groupby(d["Date"].dt.date)["Poids"]
                .max()
                .reset_index()
                .rename(columns={"Poids": "Poids max"})
            )

            st.line_chart(progression, x="Date", y="Poids max")
