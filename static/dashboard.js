console.log("Dashboard JS chargé");

function qs(sel) { return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));
}

function formatDateFR(iso){
  if(!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function isoToday(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

async function tryPost(urls, payload){
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=> "");
        throw new Error(`${url} -> HTTP ${res.status} ${txt}`);
      }
      // si ton API renvoie JSON, on essaye
      try { return await res.json(); } catch { return true; }
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("POST failed");
}

async function tryGet(urls){
  let lastErr = null;
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
      const j = await r.json();
      return j;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("GET failed");
}

document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // USER FROM URL
  // ==========================
  const params = new URLSearchParams(window.location.search);
  const username = params.get("user");
  const userId = params.get("user_id");

  const usernameEl = qs("#username-display");
  if (usernameEl) usernameEl.textContent = username || "Profil";
  if (!userId) console.warn("Paramètre ?user_id manquant : les appels API ne fonctionneront pas.");

  // ==========================
  // NAVIGATION
  // ==========================
  const dashboardPage = qs("#dashboard-page");
  const exercisesPage = qs("#exercises-page");
  const navDashboard = qs("#nav-dashboard");
  const navExercises = qs("#nav-exercises");

  function setActiveNav(activeId) {
    [navDashboard, navExercises].filter(Boolean).forEach((b) => b.classList.remove("active"));
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

  // ==========================
  // MODALE (CREATE EXERCISE)
  // ==========================
  const createModal = qs("#exercise-modal");
  const closeModalBtn = qs("#close-exercise-modal");
  const createExerciseBtn = qs("#create-exercise-btn");

  const newExerciseBtn = qs("#new-exercise-btn");
  const addExerciseBtn = qs("#add-exercise-btn");

  function openCreateExerciseModal() {
    if (!createModal) return;
    createModal.classList.remove("hidden");
    document.body.classList.add("modal-open");
    setTimeout(() => qs("#exercise-name")?.focus(), 120);
  }
  function closeCreateExerciseModal() {
    if (!createModal) return;
    createModal.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  newExerciseBtn?.addEventListener("click", openCreateExerciseModal);
  addExerciseBtn?.addEventListener("click", openCreateExerciseModal);
  closeModalBtn?.addEventListener("click", closeCreateExerciseModal);

  createModal?.addEventListener("click", (e) => {
    if (e.target === createModal) closeCreateExerciseModal();
  });

  createExerciseBtn?.addEventListener("click", async () => {
    const name = qs("#exercise-name")?.value.trim();
    const zone = qs("input[name='zone']:checked")?.value || "";
    const video = qs("#exercise-video")?.value.trim();

    if (!name || !zone) return alert("Nom et zone obligatoires");
    if (!userId) return alert("Erreur: user_id manquant dans l'URL. Reconnectez-vous depuis la page login.");

    try {
      const res = await fetch("/api/exercises/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name,
          zone,
          video_url: video || "",
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      closeCreateExerciseModal();
      const n = qs("#exercise-name");
      const v = qs("#exercise-video");
      if (n) n.value = "";
      if (v) v.value = "";
      const haut = qs("input[name='zone'][value='haut']");
      if (haut) haut.checked = true;

      await loadExercises();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création");
    }
  });

  // ==========================
  // MODALE (OPEN EXERCISE)
  // ==========================
  const openModalEl   = qs("#exercise-open-modal");
  const openTitleEl   = qs("#exopen-title");
  const openZoneEl    = qs("#exopen-zone");
  const openListEl    = qs("#exopen-list");
  const openCloseBtn  = qs("#exopen-close");
  const openAddBtn    = qs("#exopen-add-performance");

  // ==========================
  // MODALE (ADD PERFORMANCE)
  // ==========================
  const perfModal     = qs("#perf-modal");
  const perfForm      = qs("#perf-form");
  const perfCloseBtn  = qs("#perf-close");

  const perfDate      = qs("#perf-date");
  const perfWeight    = qs("#perf-weight");
  const perfReps      = qs("#perf-reps");
  const perfRpe       = qs("#perf-rpe");
  const perfNotes     = qs("#perf-notes");

  let currentExercise = null;

  function openExerciseModal(ex){
    currentExercise = ex;

    if (openTitleEl) openTitleEl.textContent = ex.name || "Exercice";
    if (openZoneEl) openZoneEl.textContent = (ex.zone === "bas") ? "Bas du corps" : "Haut du corps";

    if (openListEl) openListEl.innerHTML = `<div class="exopen-empty">Chargement…</div>`;

    openModalEl?.classList.remove("hidden");
    openModalEl?.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    loadPerformancesForExercise(ex);
  }

  function closeExerciseModal(){
    openModalEl?.classList.add("hidden");
    openModalEl?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    currentExercise = null;
  }

  openCloseBtn?.addEventListener("click", closeExerciseModal);
  openModalEl?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") closeExerciseModal();
  });

  function openPerfModal(){
    if (!currentExercise) return;
    if (!perfModal) return;

    perfModal.classList.remove("hidden");
    perfModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    if (perfDate) perfDate.value = isoToday();
    if (perfWeight) perfWeight.value = "";
    if (perfReps) perfReps.value = "";
    if (perfRpe) perfRpe.value = "";
    if (perfNotes) perfNotes.value = "";

    setTimeout(() => perfWeight?.focus(), 80);
  }

  function closePerfModal(){
    if (!perfModal) return;
    perfModal.classList.add("hidden");
    perfModal.setAttribute("aria-hidden", "true");

    // on garde modal-open si la modale exercice est encore ouverte
    if (openModalEl?.classList.contains("hidden")) {
      document.body.classList.remove("modal-open");
    }
  }

  openAddBtn?.addEventListener("click", openPerfModal);
  perfCloseBtn?.addEventListener("click", closePerfModal);
  perfModal?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") closePerfModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (perfModal && !perfModal.classList.contains("hidden")) closePerfModal();
    else if (openModalEl && !openModalEl.classList.contains("hidden")) closeExerciseModal();
    else if (createModal && !createModal.classList.contains("hidden")) closeCreateExerciseModal();
  });

  perfForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!userId || !currentExercise?.exercise_id) return;

    const payload = {
      user_id: userId,
      exercise_id: currentExercise.exercise_id,
      date: perfDate?.value || "",
      weight: Number(perfWeight?.value || 0),
      reps: Number(perfReps?.value || 0),
      rpe: Number(perfRpe?.value || 0),
      notes: (perfNotes?.value || "").trim(),
    };

    if (!payload.date || payload.weight <= 0 || payload.reps <= 0) {
      return alert("Date, charge et répétitions obligatoires.");
    }

    try {
      // On tente d’abord l’endpoint “workouts” (chez toi c’est souvent celui-là)
      await tryPost(
        ["/api/workouts/create", "/api/performances/create"],
        payload
      );

      closePerfModal();
      await loadPerformancesForExercise(currentExercise);
      await loadExercises();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement.");
    }
  });

  // ==========================
  // PERFORMANCES (LIST + DELETE)
  // ==========================
  async function fetchPerformances(ex){
    const eid = ex.exercise_id;
    const u = encodeURIComponent(userId);

    const urls = [
      `/api/workouts?user_id=${u}&exercise_id=${encodeURIComponent(eid)}`,
      `/api/performances?user_id=${u}&exercise_id=${encodeURIComponent(eid)}`,
      `/api/exercises/${encodeURIComponent(eid)}/performances?user_id=${u}`,
    ];

    const j = await tryGet(urls);
    if (Array.isArray(j)) return j;
    if (Array.isArray(j?.items)) return j.items;
    return [];
  }

  function renderPerformances(list){
    if (!openListEl) return;

    if (!Array.isArray(list) || list.length === 0) {
      openListEl.innerHTML = `<div class="exopen-empty">Aucune performance.</div>`;
      return;
    }

    openListEl.innerHTML = list.map((p) => {
      const id = p.performance_id || p.id || p.workout_id || "";
      const weight = Number(p.weight ?? p.kg ?? 0);
      const reps = Number(p.reps ?? p.repetitions ?? 0);
      const rpe = (p.rpe ?? p.ressenti ?? "");
      const date = formatDateFR(p.date || p.created_at || p.at || "");

      return `
        <div class="exopen-item">
          <div class="exopen-left">
            <div class="exopen-main">${esc(weight)} kg × ${esc(reps)} reps</div>
            <div class="exopen-sub">${esc(date)}</div>
          </div>
          <div class="exopen-right">
            <div class="exopen-rpe">RPE: ${esc(rpe)}/10</div>
            <button class="exopen-del" type="button" data-del="${esc(id)}">Supprimer</button>
          </div>
        </div>
      `;
    }).join("");

    qsa(".exopen-del").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const perfId = btn.getAttribute("data-del");
        if (!perfId) return;
        await deletePerformance(perfId);
      });
    });
  }

  async function loadPerformancesForExercise(ex){
    if (!userId || !ex?.exercise_id) return;

    try {
      const list = await fetchPerformances(ex);
      renderPerformances(list);
    } catch (err) {
      console.error("Erreur chargement performances", err);
      if (openListEl) openListEl.innerHTML = `<div class="exopen-empty">Erreur de chargement.</div>`;
    }
  }

  async function deletePerformance(performanceId){
    if (!userId) return;
    if (!confirm("Supprimer cette performance ?")) return;

    try {
      await tryPost(
        ["/api/workouts/delete", "/api/performances/delete"],
        { user_id: userId, performance_id: performanceId, workout_id: performanceId }
      );

      await loadPerformancesForExercise(currentExercise);
      await loadExercises();
    } catch (err) {
      console.error(err);
      alert("Erreur suppression");
    }
  }

  // ==========================
  // API — LEAST EXERCISE
  // ==========================
  async function loadLeastExercise() {
    if (!userId) return;
    try {
      const res = await fetch(`/api/least-exercise?user_id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const label = qs("#least-exercise-name");
      if (label) label.textContent = data.exercise || "Aucun exercice";
    } catch (err) {
      console.error("Erreur chargement exercice faible", err);
    }
  }

  // ==========================
  // API — EXERCISES
  // ==========================
  async function loadExercises() {
    if (!userId) return;

    const grid = qs("#exercises-grid");
    if (!grid) return;

    grid.innerHTML = "Chargement...";

    try {
      const res = await fetch(`/api/exercises?user_id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);

      const exercises = await res.json();
      grid.innerHTML = "";

      if (!Array.isArray(exercises) || exercises.length === 0) {
        grid.innerHTML = "<p>Aucun exercice enregistré.</p>";
        return;
      }

      const normalized = exercises.map((e) => ({
        exercise_id: e.exercise_id || e.id || "",
        name: e.name || e.exercise || "",
        zone: e.zone || "",
        video_url: e.video_url || e.video || "",
        sessions: Number(e.sessions ?? e.count ?? 0),
        max_weight: Number(e.max_weight ?? e.max ?? 0),
        training_weight: Number(e.training_weight ?? e.tw ?? 0),
      }));

      normalized.forEach((ex) => {
        const card = document.createElement("div");
        card.className = "exercise-card";

        card.innerHTML = `
          <div class="exercise-header">
            <div class="exercise-title">${esc(ex.name)}</div>
            <div class="exercise-badge">${esc(ex.zone || "Zone")}</div>
          </div>

          <div class="exercise-info">
            Nombre d'exos : <strong>${Number(ex.sessions || 0)}</strong>
          </div>

          <div class="exercise-info">
            Max atteint : <strong>${Number(ex.max_weight || 0)} kg</strong>
          </div>

          <div class="exercise-info">
            Poids d'entraînement : <strong>${Number(ex.training_weight || 0)} kg</strong>
          </div>

          <div class="exercise-actions">
            <button class="btn-open" type="button">Ouvrir</button>
            <button class="btn-edit" type="button">Modifier</button>
            <button class="btn-delete" type="button">Supprimer</button>
          </div>
        `;

        card.querySelector(".btn-open")?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          openExerciseModal(ex);
        });

        card.querySelector(".btn-edit")?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          alert("Modifier : à brancher (prochaine étape).");
        });

        card.querySelector(".btn-delete")?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          alert("Supprimer : à brancher (prochaine étape).");
        });

        grid.appendChild(card);
      });

    } catch (err) {
      console.error("Erreur chargement exercices", err);
      grid.innerHTML = "<p>Erreur de chargement.</p>";
    }
  }

  // ==========================
  // INIT
  // ==========================
  showDashboard();
  loadLeastExercise();
});
