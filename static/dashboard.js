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
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
      const j = await r.json();
      return j;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("GET failed");
}

/* ==========================
   DASH STATS HELPERS
   - Semaine: lundi 00:01 -> dimanche 23:59
   - Mois: 1er 00:01 -> dernier 23:59
   ========================== */

function startOfWeekMonday(d){
  const x = new Date(d);
  const day = x.getDay(); // 0=dim, 1=lun...
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 1, 0, 0); // ✅ lundi 00:01
  return x;
}

function endOfWeekSunday(d){
  const s = startOfWeekMonday(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23,59,59,999); // ✅ dimanche 23:59
  return e;
}

function startOfMonth(d){
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0,1,0,0); // ✅ 1er jour 00:01
  return x;
}

function endOfMonth(d){
  const x = new Date(d.getFullYear(), d.getMonth()+1, 0);
  x.setHours(23,59,59,999); // ✅ dernier jour 23:59
  return x;
}

function parseISODateLoose(v){
  if (!v) return null;
  const s = String(v);

  // cas YYYY-MM-DD
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);

  // cas ISO avec microsecondes -> on tronque à 3 chiffres (ms)
  const m2 = s.match(/^(.+\.\d{3})\d+(Z)?$/);
  const cleaned = m2 ? (m2[1] + (m2[2] || "")) : s;

  const d = new Date(cleaned);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function perfVolume(p){
  const w = Number(p.weight ?? p.kg ?? 0) || 0;
  const r = Number(p.reps ?? p.repetitions ?? 0) || 0;
  return w * r;
}

function formatKg(n){
  const val = Math.round(Number(n || 0));
  return `${val.toLocaleString("fr-FR")} kg`;
}

/* ==========================
   OBJECTIF 3 séances / semaine
   - 1 séance = au moins 1 perf dans la journée
   - cap à 3 : au-delà on reste à 3/3
   ========================== */
function dayKey(d){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function setObjectiveText(x, max=3){
  const el = document.querySelector(".progress-text strong");
  if (el) el.textContent = `${x} / ${max}`;
}

function setRingProgress(ratio){
  const circle = document.querySelector(".ring-progress");
  if (!circle) return;

  const r = Number(circle.getAttribute("r") || 60);
  const c = 2 * Math.PI * r;

  circle.style.strokeDasharray = `${c}`;
  circle.style.strokeDashoffset = `${c * (1 - ratio)}`;
}

/* ==========================
   KPI PATCH (Série -> Ratio / Séances -> Calories)
   - Pour l’instant valeurs en dur
   - Plus tard : récupérer depuis Suivi + Nutrition
   ========================== */
function computeShoulderWaistRatio(shoulderCm, waistCm){
  const s = Number(shoulderCm || 0);
  const w = Number(waistCm || 0);
  if (!s || !w) return "—";
  return (s / w).toFixed(2);
}

function setCardByIds({ labelId, valueId, labelText, valueText }){
  const labelEl = labelId ? qs(labelId) : null;
  const valueEl = valueId ? qs(valueId) : null;
  if (labelEl) labelEl.textContent = labelText;
  if (valueEl) valueEl.textContent = valueText;
  return Boolean(labelEl || valueEl);
}

function setCardByTitle(oldTitle, newTitle, newValue){
  const normalize = (t) => String(t || "").trim().toLowerCase();

  // on balaye les cartes (classes typiques)
  const candidates = qsa(
    ".stat-card, .metric-card, .kpi-card, .dashboard-card, .tile, .card"
  );

  for (const card of candidates){
    const titleEl =
      card.querySelector(".stat-title, .metric-title, .kpi-title, .card-title, .label, h3, h4, h5, .title")
      || null;

    if (!titleEl) continue;

    if (normalize(titleEl.textContent) === normalize(oldTitle)){
      titleEl.textContent = newTitle;

      // Valeur : on privilégie un élément "value" existant, sinon le premier <strong> de la carte
      const valueEl =
        card.querySelector(".stat-value, .metric-value, .kpi-value, .value, .number, strong")
        || null;

      if (valueEl) valueEl.textContent = newValue;
      return true;
    }
  }
  return false;
}

function updateRatioAndCaloriesCards(){
  // Valeurs en dur (temporaire)
  const shoulderCm = 120;
  const waistCm = 75;
  const calorieTarget = 2800;

  const ratio = computeShoulderWaistRatio(shoulderCm, waistCm);
  const ratioText = ratio;            // ex: "1.60"
  const calText = `${calorieTarget.toLocaleString("fr-FR")} kcal`;

  // 1) Si ton HTML a des IDs dédiés (au cas où)
  //    Tu peux ajuster si tes IDs sont différents.
  const doneByIds1 = setCardByIds({
    labelId: "#streak-label",
    valueId: "#streak-value",
    labelText: "Ratio Épaules / Taille",
    valueText: ratioText
  });
  const doneByIds2 = setCardByIds({
    labelId: "#sessions-label",
    valueId: "#sessions-value",
    labelText: "Objectif calories",
    valueText: calText
  });

  // 2) Sinon : on remplace en cherchant les titres "Série" et "Séances"
  if (!doneByIds1) setCardByTitle("Série", "Ratio Épaules / Taille", ratioText);
  if (!doneByIds2) setCardByTitle("Séances", "Objectif calories", calText);
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

  // ✅ applique le patch KPI dès le chargement UI
  updateRatioAndCaloriesCards();

  // ==========================
  // PLACEHOLDERS (à brancher plus tard)
  // ==========================
  const UI_PLACEHOLDERS = {
    shoulderWaistRatio: "1,62",     // <-- tu pourras calculer/charger plus tard
    calorieTarget: "2 500 kcal",    // <-- idem (nutrition)
  };
  
  // Remplace un "tile" dashboard en trouvant le titre exact (ex: "Série", "Séances")
  function replaceDashboardTile(oldTitle, newTitle, newValueHtml){
    const root = qs("#dashboard-page") || document;
  
    // Cherche un élément dont le texte est exactement oldTitle
    const titleEl = Array.from(root.querySelectorAll("*"))
      .find(el => el.children.length === 0 && (el.textContent || "").trim() === oldTitle);
  
    if (!titleEl) {
      console.warn(`Tile "${oldTitle}" introuvable (HTML différent).`);
      return false;
    }
  
    // Trouve le conteneur de la carte (selon tes classes)
    const card = titleEl.closest(".stat-card, .dash-card, .card, .metric-card, .tile, .panel") || titleEl.parentElement;
  
    // Titre
    titleEl.textContent = newTitle;
  
    // Valeur : on privilégie le <strong> existant, sinon on le crée
    let strong = card?.querySelector("strong");
    if (!strong) {
      // Essaie de viser un bloc "valeur" courant
      const candidate = card?.querySelector(".value, .stat-value, .metric-value") || card;
      strong = document.createElement("strong");
      candidate?.appendChild(strong);
    }
  
    if (strong) strong.innerHTML = newValueHtml;
  
    return true;
  }
  
  // ✅ Applique le remplacement
  replaceDashboardTile("Série", "Ratio épaules / taille", UI_PLACEHOLDERS.shoulderWaistRatio);
  replaceDashboardTile("Séances", "Objectif calories", UI_PLACEHOLDERS.calorieTarget);
  
  
  // ==========================
  // DASHBOARD STATS (API ALL PERFS)
  // ==========================
  async function fetchAllPerformances(){
    if (!userId) return [];
    const u = encodeURIComponent(userId);

    // 1) récupère les exercices
    let exercises = [];
    const exRes = await fetch(`/api/exercises?user_id=${u}`, { cache: "no-store" });
    if (!exRes.ok) return [];
    const exJson = await exRes.json().catch(()=>[]);
    exercises = Array.isArray(exJson) ? exJson : [];

    const ids = exercises.map(e => e.exercise_id || e.id).filter(Boolean);
    if (!ids.length) return [];

    // 2) récupère les perfs par exercice
    const packs = await Promise.all(ids.map(async (eid) => {
      const url = `/api/performances?user_id=${u}&exercise_id=${encodeURIComponent(eid)}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return [];
      const j = await r.json().catch(()=>[]);
      if (Array.isArray(j)) return j;
      if (Array.isArray(j?.items)) return j.items;
      if (Array.isArray(j?.data)) return j.data;
      return [];
    }));

    return packs.flat();
  }

  function computeDashboardStats(perfs){
    const now = new Date();
    const weekStart = startOfWeekMonday(now);
    const weekEnd = endOfWeekSunday(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let weekVolume = 0;
    let weekPerfCount = 0;
    let monthVolume = 0;

    const daysWithSession = new Set();

    for (const p of (perfs || [])){
      const d = parseISODateLoose(p.created_at || p.date || p.at);
      if (!d) continue;

      const vol = perfVolume(p);

      if (d >= weekStart && d <= weekEnd){
        weekVolume += vol;
        weekPerfCount += 1;
        daysWithSession.add(dayKey(d));
      }

      if (d >= monthStart && d <= monthEnd){
        monthVolume += vol;
      }
    }

    const sessions = daysWithSession.size;
    const cappedSessions = Math.min(sessions, 3);

    return { weekVolume, weekPerfCount, monthVolume, sessions, cappedSessions };
  }

  function renderDashboardStats(stats){
    const elWeekVol = qs("#weekly-volume");
    const elWeekPerf = qs("#weekly-perfs");
    const elMonthVol = qs("#monthly-volume");

    if (elWeekVol) elWeekVol.textContent = formatKg(stats.weekVolume);
    if (elWeekPerf) elWeekPerf.textContent = String(stats.weekPerfCount);
    if (elMonthVol) elMonthVol.textContent = formatKg(stats.monthVolume);

    setObjectiveText(stats.cappedSessions, 3);
    setRingProgress(stats.cappedSessions / 3);

    // ✅ s’assure que les KPI restent bons même après rerender/refresh
    updateRatioAndCaloriesCards();
  }

  async function refreshDashboardStats(){
    try{
      const perfs = await fetchAllPerformances();
      console.log("PERFS COUNT:", perfs.length, perfs[0]);
      const stats = computeDashboardStats(perfs);
      renderDashboardStats(stats);
    }catch(err){
      console.error("Erreur stats dashboard", err);
    }
  }

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
    refreshDashboardStats();
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
      await refreshDashboardStats();
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
      await tryPost(
        ["/api/workouts/create", "/api/performances/create"],
        payload
      );

      closePerfModal();
      await loadPerformancesForExercise(currentExercise);
      await loadExercises();
      await refreshDashboardStats();
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
      openListEl.innerHTML = `<div style="opacity:.75;color:#fff;padding:10px 0;">Aucune performance.</div>`;
      return;
    }

    const rows = list.map((p) => {
      const id = p.perf_id || p.performance_id || p.id || "";
      const weight = Number(p.weight ?? p.kg ?? 0);
      const reps = Number(p.reps ?? p.repetitions ?? 0);

      const rpe = (p.ressenti ?? p.rpe ?? p.rpe10 ?? "");
      const date = formatDateFR(p.date || p.created_at || p.at || "");

      const notes = (p.notes || "").trim();

      return `
        <div class="exopen-item" data-perf-id="${esc(id)}">
          <div class="exopen-left">
            <div class="exopen-main">${esc(weight)} kg × ${esc(reps)} reps</div>
            <div class="exopen-sub">${esc(date)}</div>
            ${notes ? `<div class="exopen-notes">${esc(notes)}</div>` : ``}
          </div>

          <div class="exopen-right">
            <div class="exopen-rpe">RPE: ${esc(rpe)}/10</div>
            <button class="exopen-del" type="button" data-del="${esc(id)}">Supprimer</button>
          </div>
        </div>
      `;
    }).join("");

    openListEl.innerHTML = rows;

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
      await refreshDashboardStats();
    } catch (err) {
      console.error(err);
      alert("Erreur suppression");
    }
  }

    // ==========================
    // API — LEAST EXERCISE
    // ==========================
    let leastExerciseRef = null; // { exercise_id, name }
  
    function bindLeastExerciseClick(){
      // On cible soit un bouton dédié, soit le parent du label
      const label = qs("#least-exercise-name");
      const host =
        qs("#least-exercise-card") ||
        qs("#least-exercise-btn") ||
        label?.closest("button") ||
        label?.closest(".dash-cta") ||
        label?.closest(".card") ||
        label?.parentElement;
  
      if (!host) return;
  
      // évite de binder 10 fois
      if (host.dataset.boundClick === "1") return;
      host.dataset.boundClick = "1";
  
      host.style.cursor = "pointer";
      host.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (!userId) return;
  
          // 1) Si on a déjà l'id, parfait
          if (leastExerciseRef?.exercise_id) {
            openExerciseModal({
              exercise_id: leastExerciseRef.exercise_id,
              name: leastExerciseRef.name || label?.textContent || "",
              zone: leastExerciseRef.zone || ""
            });
            return;
          }
  
          // 2) Sinon : on cherche dans /api/exercises par le nom affiché
          const targetName = (leastExerciseRef?.name || label?.textContent || "").trim();
          if (!targetName) return;
  
          const res = await fetch(`/api/exercises?user_id=${encodeURIComponent(userId)}`, { cache: "no-store" });
          if (!res.ok) throw new Error("Impossible de récupérer la liste des exercices");
  
          const exercises = await res.json().catch(()=>[]);
          const normalized = (Array.isArray(exercises) ? exercises : []).map((ex) => ({
            exercise_id: ex.exercise_id || ex.id || "",
            name: ex.name || ex.exercise || "",
            zone: ex.zone || "",
            video_url: ex.video_url || ex.video || "",
          }));
  
          const found = normalized.find(x => (x.name || "").trim().toLowerCase() === targetName.toLowerCase())
                     || normalized.find(x => (x.name || "").trim().toLowerCase().includes(targetName.toLowerCase()));
  
          if (!found?.exercise_id) {
            alert("Exercice introuvable. (Le backend ne renvoie pas l'exercise_id)");
            return;
          }
  
          // On ouvre le même modal que "Ouvrir"
          openExerciseModal(found);
  
        } catch (err) {
          console.error("Erreur ouverture least exercise:", err);
          alert("Erreur lors de l'ouverture de l'exercice.");
        }
      });
    }
  
    async function loadLeastExercise() {
      if (!userId) return;
      try {
        const res = await fetch(`/api/least-exercise?user_id=${encodeURIComponent(userId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("API error");
        const data = await res.json().catch(()=> ({}));
  
        // Tolérant : backend peut renvoyer {exercise: "nom"} ou {name:"", exercise_id:""}
        const exName = (data.exercise || data.name || "").trim();
  
        // Si ton backend renvoie un id un jour, on le prend direct
        const exId = data.exercise_id || data.id || null;
  
        leastExerciseRef = { exercise_id: exId, name: exName, zone: data.zone || "" };
  
        const label = qs("#least-exercise-name");
        if (label) label.textContent = exName || "Aucun exercice";
  
        // Rend la tuile cliquable
        bindLeastExerciseClick();
  
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
      const res = await fetch(`/api/exercises?user_id=${encodeURIComponent(userId)}`, { cache: "no-store" });
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
  renderRatioAndCalories();
  loadLeastExercise();
  refreshDashboardStats();
});
