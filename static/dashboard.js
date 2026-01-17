console.log("Dashboard JS chargé");

const API_BASE = ""; // laisse vide si tes routes sont du type /api/...

const ENDPOINTS = {
  exercisesList: "/api/exercises",
  exercisesCreate: "/api/exercises/create",
  leastExercise: "/api/least-exercise",

  // Performances: on tente /api/performances puis fallback /api/workouts
  perfListPrimary: "/api/performances",
  perfListFallback: "/api/workouts",

  // Delete performance (adaptable)
  perfDeleteById: "/api/performances",      // DELETE /api/performances/:id
  perfDeletePost: "/api/performances/delete" // POST { performance_id, user_id }
};

function qs(sel) { return document.querySelector(sel); }

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}

function formatDateFR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

async function fetchJsonWithFallback(primaryUrl, fallbackUrl) {
  try {
    return await fetchJson(primaryUrl);
  } catch {
    return await fetchJson(fallbackUrl);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // USER FROM URL
  // ==========================
  const params = new URLSearchParams(window.location.search);
  const username = params.get("user");
  const userId = params.get("user_id");

  console.log("USER URL (username) =", username);
  console.log("USER URL (user_id) =", userId);

  const usernameEl = qs("#username-display");
  if (usernameEl) usernameEl.textContent = username || "Profil";

  if (!userId) {
    console.warn("Paramètre ?user_id manquant : les appels API ne fonctionneront pas.");
  }

  // ==========================
  // MODALE (NOUVEL EXERCICE)
  // ==========================
  const createModal = qs("#exercise-modal");
  const closeCreateModalBtn = qs("#close-exercise-modal");
  const createExerciseBtn = qs("#create-exercise-btn");

  const newExerciseBtn = qs("#new-exercise-btn");
  const addExerciseBtn = qs("#add-exercise-btn");

  function openCreateExerciseModal() {
    if (!createModal) return;
    createModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    setTimeout(() => qs("#exercise-name")?.focus(), 150);
  }

  function closeCreateExerciseModal() {
    if (!createModal) return;
    createModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  newExerciseBtn?.addEventListener("click", openCreateExerciseModal);
  addExerciseBtn?.addEventListener("click", openCreateExerciseModal);
  closeCreateModalBtn?.addEventListener("click", closeCreateExerciseModal);

  createModal?.addEventListener("click", (e) => {
    if (e.target === createModal) closeCreateExerciseModal();
  });

  // ==========================
  // MODALE (OUVRIR EXERCICE)
  // ==========================
  const openModalEl = qs("#exercise-open-modal");
  const openTitleEl = qs("#exopen-title");
  const openZoneEl = qs("#exopen-zone");
  const openListEl = qs("#exopen-list");
  const openCloseBtn = qs("#exopen-close");
  const openAddBtn = qs("#exopen-add-performance");

  let currentExercise = null;
  let EXERCISES_CACHE = [];

  function openExerciseModal(ex) {
    if (!openModalEl || !openTitleEl || !openZoneEl || !openListEl) return;

    currentExercise = ex;

    openTitleEl.textContent = ex.name || "Exercice";
    openZoneEl.textContent = ex.zone === "bas" ? "Bas du corps" : "Haut du corps";

    openListEl.innerHTML = '<div style="opacity:.75;color:#fff;padding:10px 0;">Chargement…</div>';

    openModalEl.classList.remove("hidden");
    openModalEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    loadPerformancesForExercise(ex);
  }

  function closeExerciseModal() {
    if (!openModalEl) return;
    openModalEl.classList.add("hidden");
    openModalEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    currentExercise = null;
  }

  openCloseBtn?.addEventListener("click", closeExerciseModal);

  // click backdrop
  openModalEl?.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.dataset?.close === "true") closeExerciseModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openModalEl && !openModalEl.classList.contains("hidden")) {
      closeExerciseModal();
    }
  });

  openAddBtn?.addEventListener("click", () => {
    if (!currentExercise) return;
    alert("Ajout performance : prochaine étape (formulaire).");
  });

  // delete performance (delegation)
  openListEl?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-perf]");
    if (!btn) return;

    const perfId = btn.getAttribute("data-del-perf");
    if (!perfId) return;

    if (!confirm("Supprimer cette performance ?")) return;

    try {
      await fetchJson(`${API_BASE}${ENDPOINTS.perfDeleteById}/${encodeURIComponent(perfId)}`, {
        method: "DELETE",
      });
    } catch (err1) {
      try {
        await fetchJson(`${API_BASE}${ENDPOINTS.perfDeletePost}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ performance_id: perfId, user_id: userId }),
        });
      } catch (err2) {
        console.error(err1);
        console.error(err2);
        alert("Impossible de supprimer (endpoint à ajuster côté API).");
        return;
      }
    }

    const row = openListEl.querySelector(`.exopen-row[data-perf-id="${CSS.escape(perfId)}"]`);
    row?.remove();

    if (openListEl.querySelectorAll(".exopen-row").length === 0) {
      openListEl.innerHTML = '<div style="opacity:.75;color:#fff;padding:10px 0;">Aucune performance pour le moment.</div>';
    }
  });

  async function loadPerformancesForExercise(ex) {
    if (!openListEl || !userId) return;

    const primary =
      `${API_BASE}${ENDPOINTS.perfListPrimary}?user_id=${encodeURIComponent(userId)}&exercise_id=${encodeURIComponent(ex.exercise_id)}`;
    const fallback =
      `${API_BASE}${ENDPOINTS.perfListFallback}?user_id=${encodeURIComponent(userId)}&exercise_id=${encodeURIComponent(ex.exercise_id)}`;

    try {
      const rows = await fetchJsonWithFallback(primary, fallback);

      if (!Array.isArray(rows) || rows.length === 0) {
        openListEl.innerHTML = '<div style="opacity:.75;color:#fff;padding:10px 0;">Aucune performance pour le moment.</div>';
        return;
      }

      openListEl.innerHTML = rows.map((p) => {
        const perfId = p.perf_id || p.performance_id || p.id || "";
        const weight = p.weight ?? p.kg ?? p.charge ?? 0;
        const reps = p.reps ?? p.repetitions ?? 0;
        const rpe = p.ressenti ?? p.rpe ?? "-";
        const date = formatDateFR(p.date || p.created_at || p.timestamp);

        return `
          <div class="exopen-row" data-perf-id="${esc(perfId)}">
            <div class="exopen-left">
              <div class="exopen-main">${esc(weight)} kg × ${esc(reps)} reps</div>
              <div class="exopen-date">${esc(date)}</div>
            </div>
            <div class="exopen-right">
              <div class="exopen-rpe">RPE: ${esc(rpe)}/10</div>
              <button class="exopen-del" type="button" data-del-perf="${esc(perfId)}">Supprimer</button>
            </div>
          </div>
        `;
      }).join("");

    } catch (err) {
      console.error(err);
      openListEl.innerHTML = '<div style="opacity:.75;color:#fff;padding:10px 0;">Erreur de chargement.</div>';
    }
  }

  // ==========================
  // CREATE EXERCISE
  // ==========================
  createExerciseBtn?.addEventListener("click", async () => {
    const name = qs("#exercise-name")?.value.trim();
    const zone = qs("input[name='zone']:checked")?.value || "";
    const video = qs("#exercise-video")?.value.trim();

    if (!name || !zone) {
      alert("Nom et zone obligatoires");
      return;
    }
    if (!userId) {
      alert("Erreur: user_id manquant dans l'URL. Reconnectez-vous depuis la page login.");
      return;
    }

    try {
      await fetchJson(`${API_BASE}${ENDPOINTS.exercisesCreate}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name, zone, video_url: video || "" }),
      });

      closeCreateExerciseModal();

      // reset form
      const n = qs("#exercise-name");
      const v = qs("#exercise-video");
      if (n) n.value = "";
      if (v) v.value = "";

      // défaut = haut
      const defaultRadio = qs("input[name='zone'][value='haut']");
      if (defaultRadio) defaultRadio.checked = true;

      // refresh list if user is on exercises page
      await loadExercises();

    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création");
    }
  });

  // ==========================
  // NAVIGATION PAGES
  // ==========================
  const dashboardPage = qs("#dashboard-page");
  const exercisesPage = qs("#exercises-page");
  const navDashboard = qs("#nav-dashboard");
  const navExercises = qs("#nav-exercises");

  function setActiveNav(activeId) {
    [navDashboard, navExercises].filter(Boolean).forEach((btn) => btn.classList.remove("active"));
    if (activeId === "dashboard") navDashboard?.classList.add("active");
    if (activeId === "exercises") navExercises?.classList.add("active");
  }

  function showDashboard() {
    dashboardPage?.classList.remove("hidden");
    exercisesPage?.classList.add("hidden");
    setActiveNav("dashboard");
  }

  async function showExercises() {
    dashboardPage?.classList.add("hidden");
    exercisesPage?.classList.remove("hidden");
    setActiveNav("exercises");
    await loadExercises();
  }

  navDashboard?.addEventListener("click", showDashboard);
  navExercises?.addEventListener("click", showExercises);

  // default page
  showDashboard();

  // ==========================
  // API — LEAST EXERCISE
  // ==========================
  async function loadLeastExercise() {
    if (!userId) return;
    try {
      const data = await fetchJson(`${API_BASE}${ENDPOINTS.leastExercise}?user_id=${encodeURIComponent(userId)}`);
      const label = qs("#least-exercise-name");
      if (label) label.textContent = data.exercise || "Aucun exercice";
    } catch (err) {
      console.error("Erreur chargement exercice faible", err);
    }
  }

  qs("#least-exercise-btn")?.addEventListener("click", () => {
    alert("Fiche exercice à venir (performances bientôt)");
  });

  // ==========================
  // API — LISTE DES EXERCICES
  // ==========================
  async function loadExercises() {
    if (!userId) return;

    const grid = qs("#exercises-grid");
    if (!grid) return;

    grid.innerHTML = "Chargement...";

    try {
      const raw = await fetchJson(`${API_BASE}${ENDPOINTS.exercisesList}?user_id=${encodeURIComponent(userId)}`);
      grid.innerHTML = "";

      if (!Array.isArray(raw) || raw.length === 0) {
        grid.innerHTML = "<p>Aucun exercice enregistré.</p>";
        EXERCISES_CACHE = [];
        return;
      }

      EXERCISES_CACHE = raw.map((e) => ({
        exercise_id: e.exercise_id || e.id || e.exerciseId || "",
        name: e.name || e.exercise || "",
        zone: e.zone || "haut",
        video_url: e.video_url || e.video || e.videoUrl || "",
        sessions: Number(e.sessions ?? e.nb ?? e.count ?? 0),
        max_weight: Number(e.max_weight ?? e.max ?? 0),
        training_weight: Number(e.training_weight ?? e.training ?? 0),
      }));

      for (const ex of EXERCISES_CACHE) {
        const card = document.createElement("div");
        card.className = "exercise-card";

        card.innerHTML = `
          <div class="exercise-header">
            <div class="exercise-title">${esc(ex.name || "Exercice")}</div>
            <div class="exercise-badge">${esc(ex.zone || "zone")}</div>
          </div>

          <div class="exercise-info">Nombre d'exos : <strong>${esc(ex.sessions)}</strong></div>
          <div class="exercise-info">Max atteint : <strong>${esc(ex.max_weight)} kg</strong></div>
          <div class="exercise-info">Poids d'entraînement : <strong>${esc(ex.training_weight)} kg</strong></div>

          <div class="exercise-actions">
            <button class="btn-open" type="button" data-action="open" data-exercise-id="${esc(ex.exercise_id)}">Ouvrir</button>
            <button class="btn-edit" type="button" data-action="edit" data-exercise-id="${esc(ex.exercise_id)}">Modifier</button>
            <button class="btn-delete" type="button" data-action="delete" data-exercise-id="${esc(ex.exercise_id)}">Supprimer</button>
          </div>
        `;

        grid.appendChild(card);
      }

    } catch (err) {
      console.error("Erreur chargement exercices", err);
      grid.innerHTML = "<p>Erreur de chargement.</p>";
    }
  }

  // Delegation buttons (IMPORTANT)
  const gridEl = qs("#exercises-grid");
  gridEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-exercise-id");
    const ex = EXERCISES_CACHE.find((x) => String(x.exercise_id) === String(id));
    if (!ex) return;

    if (action === "open") {
      openExerciseModal(ex);
      return;
    }
    if (action === "edit") {
      alert("Modifier exercice : prochaine étape.");
      return;
    }
    if (action === "delete") {
      alert("Supprimer exercice : prochaine étape.");
      return;
    }
  });

  // ==========================
  // INIT
  // ==========================
  loadLeastExercise();
});
