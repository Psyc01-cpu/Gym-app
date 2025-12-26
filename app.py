import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd
from datetime import datetime

# Configuration de la page pour mobile
st.set_page_config(page_title="Gym Tracker", page_icon="🏋️")

st.title("🏋️ Mon Gym Tracker")

# Ton lien Google Sheet
URL = "https://docs.google.com/spreadsheets/d/1JqA_BaanjhljtGswHsPG2oMIIT9VjEa4YjH3mLAUczA/edit?usp=sharing"

# Connexion sécurisée
conn = st.connection("gsheets", type=GSheetsConnection)

# --- SECTION 1 : AJOUTER UNE SÉANCE ---
st.subheader("Nouvelle Séance")
with st.form("gym_form", clear_on_submit=True):
    exercice = st.selectbox("Exercice", ["Développé couché", "Squat", "Soulevé de terre", "Tractions", "Dips", "Fentes"])
    col1, col2 = st.columns(2)
    with col1:
        poids = st.number_input("Poids (kg)", min_value=0, step=1)
    with col2:
        reps = st.number_input("Répétitions", min_value=0, step=1)
    
    notes = st.text_input("Notes (ex: Dur !)")
    submit = st.form_submit_button("Enregistrer la performance")

if submit:
    try:
        # Lire les données actuelles
        existing_data = conn.read(spreadsheet=URL, usecols=[0,1,2,3,4])
        
        # Créer la nouvelle ligne
        new_entry = pd.DataFrame([{
            "Date": datetime.now().strftime("%d/%m/%Y"),
            "Exercice": exercice,
            "Poids": poids,
            "Reps": reps,
            "Notes": notes
        }])
        
        # Ajouter la ligne et envoyer au Sheet
        updated_df = pd.concat([existing_data, new_entry], ignore_index=True)
        conn.update(spreadsheet=URL, data=updated_df)
        
        st.success("C'est enregistré dans ton Google Sheet !")
        st.balloons()
    except Exception as e:
        st.error(f"Erreur : Vérifie que ton Sheet est bien partagé en 'Éditeur'.")

# --- SECTION 2 : HISTORIQUE ---
st.divider()
st.subheader("Tes 5 dernières séances")
try:
    data = conn.read(spreadsheet=URL)
    if not data.empty:
        st.dataframe(data.tail(5), use_container_width=True)
    else:
        st.info("Aucune donnée pour le moment.")
except:
    st.info("Le tableau est vide ou en cours de connexion.")
