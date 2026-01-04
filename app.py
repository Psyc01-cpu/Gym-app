import streamlit as st
import pandas as pd
import bcrypt
import uuid
from datetime import datetime
from streamlit_gsheets import GSheetsConnection

def is_user_active(value):
    if value is None:
        return True
    if isinstance(value, bool):
        return value

    s = str(value).strip().lower()
    if s == "":
        return True
    return s in {"true", "vrai", "1", "yes", "oui", "y", "t"}

# ---------------- CONFIG ----------------
st.set_page_config(page_title="Projet Gotham", page_icon="🦇", layout="centered")
st.title("🦇 Projet Gotham")

conn = st.connection("gsheets", type=GSheetsConnection)

USERS_SHEET = "users"
PROFILES_SHEET = "profiles"

USERS_COLS = ["user_id", "username", "password_hash", "role", "is_active", "created_at"]
PROFILES_COLS = ["user_id", "display_name", "age", "sex", "height_cm", "weight_kg", "goal", "activity_level", "created_at"]


# ---------------- HELPERS ----------------
def now_iso():
    return datetime.utcnow().isoformat(timespec="seconds")


def read_sheet(name: str, cols: list[str]) -> pd.DataFrame:
    df = conn.read(worksheet=name, ttl=0)
    if df is None or df.empty:
        return pd.DataFrame(columns=cols)
    # Ajoute colonnes manquantes
    for c in cols:
        if c not in df.columns:
            df[c] = None
    return df[cols].copy()


def write_sheet(name: str, df: pd.DataFrame):
    conn.update(worksheet=name, data=df)


def hash_password(pw: str) -> str:
    # bcrypt stocke un hash, pas le mdp
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw.encode("utf-8"), salt).decode("utf-8")


def check_password(pw: str, pw_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), pw_hash.encode("utf-8"))
    except Exception:
        return False


def get_users() -> pd.DataFrame:
    df = read_sheet(USERS_SHEET, USERS_COLS)

    # nettoyage strict du champ is_active
    df["is_active"] = df["is_active"].apply(is_user_active)

    # normalisation username
    df["username"] = df["username"].astype(str).str.strip().str.lower()

    return df


def get_profiles() -> pd.DataFrame:
    return read_sheet(PROFILES_SHEET, PROFILES_COLS)


def create_user(username: str, password: str) -> tuple[bool, str]:
    username = username.strip().lower()
    if len(username) < 3:
        return False, "Le nom d’utilisateur doit faire au moins 3 caractères."
    if len(password) < 6:
        return False, "Le mot de passe doit faire au moins 6 caractères."

    users = get_users()
    if (users["username"] == username).any():
        return False, "Ce nom d’utilisateur existe déjà."

    user_id = str(uuid.uuid4())
    new_row = pd.DataFrame([{
        "user_id": user_id,
        "username": username,
        "password_hash": hash_password(password),
        "role": "user",
        "is_active": True,
        "created_at": now_iso(),
    }])

    users = pd.concat([users, new_row], ignore_index=True)
    write_sheet(USERS_SHEET, users)
    return True, "Compte créé. Tu peux te connecter."


def login_user(username: str, password: str) -> tuple[bool, str]:
    username = username.strip().lower()
    users = get_users()
    st.write(users[["username", "role", "is_active"]])

    row = users[users["username"] == username]
    if row.empty:
        return False, "Identifiants invalides."

    u = row.iloc[0].to_dict()
    if not bool(u.get("is_active", True)):
        return False, "Compte désactivé."

    if not check_password(password, str(u.get("password_hash", ""))):
        return False, "Identifiants invalides."

    st.session_state["auth"] = {
        "user_id": u["user_id"],
        "username": u["username"],
        "role": u.get("role", "user"),
    }
    return True, "Connecté."
    
    u = row.iloc[0].to_dict()


def logout():
    st.session_state.pop("auth", None)


def is_logged_in() -> bool:
    return "auth" in st.session_state


def current_user():
    return st.session_state.get("auth")


def upsert_profile(user_id: str, data: dict):
    profiles = get_profiles()
    existing = profiles[profiles["user_id"] == user_id]

    row = {
        "user_id": user_id,
        "display_name": data.get("display_name", ""),
        "age": data.get("age", None),
        "sex": data.get("sex", ""),
        "height_cm": data.get("height_cm", None),
        "weight_kg": data.get("weight_kg", None),
        "goal": data.get("goal", ""),
        "activity_level": data.get("activity_level", ""),
        "created_at": now_iso(),
    }

    if existing.empty:
        profiles = pd.concat([profiles, pd.DataFrame([row])], ignore_index=True)
    else:
        idx = existing.index[0]
        for k, v in row.items():
            profiles.loc[idx, k] = v

    write_sheet(PROFILES_SHEET, profiles)


def get_profile(user_id: str) -> dict:
    profiles = get_profiles()
    row = profiles[profiles["user_id"] == user_id]
    if row.empty:
        return {}
    return row.iloc[0].to_dict()


# ---------------- UI ----------------
if not is_logged_in():
    st.subheader("Connexion")

    tab_login, tab_signup = st.tabs(["Se connecter", "Créer un compte"])

    with tab_login:
        with st.form("login_form"):
            username = st.text_input("Nom d’utilisateur")
            password = st.text_input("Mot de passe", type="password")
            submit = st.form_submit_button("Connexion")

        if submit:
            ok, msg = login_user(username, password)
            if ok:
                st.success(msg)
                st.rerun()
            else:
                st.error(msg)

    with tab_signup:
        st.info("Crée ton compte. Ton mot de passe n’est jamais stocké en clair.")
        with st.form("signup_form"):
            username = st.text_input("Nom d’utilisateur (min 3 caractères)")
            password = st.text_input("Mot de passe (min 6 caractères)", type="password")
            password2 = st.text_input("Confirmer le mot de passe", type="password")
            submit2 = st.form_submit_button("Créer mon compte")

        if submit2:
            if password != password2:
                st.error("Les mots de passe ne correspondent pas.")
            else:
                ok, msg = create_user(username, password)
                if ok:
                    st.success(msg)
                else:
                    st.error(msg)

    st.stop()

# ----------- Zone privée -----------
auth = current_user()
st.sidebar.markdown(f"Connecté : **{auth['username']}**")
st.sidebar.markdown(f"Rôle : **{auth.get('role','user')}**")

if st.sidebar.button("Se déconnecter"):
    logout()
    st.rerun()

# Navigation simple (on fera mieux après)
page = st.sidebar.radio("Navigation", ["Dashboard", "Mon profil"] + (["Admin"] if auth.get("role") == "admin" else []))

if page == "Dashboard":
    st.subheader("Dashboard")
    st.write("Étape 1 OK : authentification + profils.")
    st.info("Prochaine étape : exercices + séances + stats.")

elif page == "Mon profil":
    st.subheader("Mon profil")

    profile = get_profile(auth["user_id"])

    with st.form("profile_form"):
        display_name = st.text_input("Nom affiché", value=str(profile.get("display_name", "")))
        age = st.number_input("Âge", min_value=0, max_value=120, value=int(profile.get("age") or 0))
        sex = st.selectbox("Sexe", ["", "Homme", "Femme", "Autre"], index=0 if not profile.get("sex") else ["", "Homme", "Femme", "Autre"].index(profile.get("sex")))
        height_cm = st.number_input("Taille (cm)", min_value=0, max_value=250, value=int(profile.get("height_cm") or 0))
        weight_kg = st.number_input("Poids (kg)", min_value=0.0, max_value=400.0, value=float(profile.get("weight_kg") or 0.0))
        goal = st.selectbox("Objectif", ["", "Perte de poids", "Maintien", "Prise de masse"], index=0 if not profile.get("goal") else ["", "Perte de poids", "Maintien", "Prise de masse"].index(profile.get("goal")))
        activity_level = st.selectbox("Niveau d’activité", ["", "Faible", "Modéré", "Élevé"], index=0 if not profile.get("activity_level") else ["", "Faible", "Modéré", "Élevé"].index(profile.get("activity_level")))

        save = st.form_submit_button("Enregistrer le profil")

    if save:
        upsert_profile(auth["user_id"], {
            "display_name": display_name,
            "age": age if age > 0 else None,
            "sex": sex,
            "height_cm": height_cm if height_cm > 0 else None,
            "weight_kg": weight_kg if weight_kg > 0 else None,
            "goal": goal,
            "activity_level": activity_level,
        })
        st.success("Profil enregistré.")
        st.rerun()

elif page == "Admin":
    st.subheader("Admin — Utilisateurs")

    users = get_users()
    st.dataframe(users, use_container_width=True)

    st.info("À ce stade on ne montre PAS les mots de passe (sécurité). Prochaine étape : désactiver / supprimer / impersonation.")
