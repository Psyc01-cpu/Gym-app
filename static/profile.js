console.log("PROFILE JS chargé");

(function () {
  function qs(sel) { return document.querySelector(sel); }

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

  function formatKgCompact(total){
    const n = Number(total || 0);
    if (n >= 10000) return `${(n/1000).toFixed(1)}k kg`;
    return `${Math.round(n).toLocaleString("fr-FR")} kg`;
  }

  function perfVolume(p){
    const w = Number(p.weight ?? 0) || 0;
    const r = Number(p.reps ?? 0) || 0;
    return w * r;
  }

  async function getJSON(url){
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const t = await r.text().catch(()=> "");
      throw new Error(`${url} -> HTTP ${r.status} ${t}`);
    }
    return await r.json();
  }

  // ------- Sélection user -------
  let selected = { user_id: null, username: null };

  // Quand tu cliques une card profil (injectée par app.js)
  document.addEventListener("click", (e) => {
    const card = e.target?.closest?.(".profile-card");
    if (!card) return;

    const uid = card.getAttribute("data-user-id");
    const uname = card.getAttribute("data-username");

    if (uid) selected.user_id = uid;
    if (uname) selected.username = uname;

    document.querySelectorAll(".profile-card.selected").forEach(x => x.classList.remove("selected"));
    card.classList.add("selected");
  }, true);

  function getUserFromLoginDataset(){
    const loginOverlay = qs("#modal-overlay");
    if (!loginOverlay) return { user_id: null, username: null };
    return {
      user_id: loginOverlay.dataset.userId || null,
      username: loginOverlay.dataset.username || null,
    };
  }

  function getUserFromSelectedCard(){
    const card = document.querySelector(".profile-card.selected");
    if (!card) return { user_id: null, username: null };
    return {
      user_id: card.getAttribute("data-user-id") || null,
      username: card.getAttribute("data-username") || null,
    };
  }

  function resolveUser(){
    const ds = getUserFromLoginDataset();
    const sel = getUserFromSelectedCard();
    return {
      user_id: selected.user_id || ds.user_id || sel.user_id || null,
      username: selected.username || ds.username || sel.username || null,
    };
  }

  // ------- Modale profil -------
  const overlay = qs("#profile-overlay");
  const closeBtn = qs("#profile-close");

  function openProfile(){
    if (!overlay) return;
    overlay.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function closeProfile(){
    if (!overlay) return;
    overlay.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  closeBtn?.addEventListener("click", closeProfile);
  overlay?.addEventListener("click", (e) => { if (e.target === overlay) closeProfile(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && !overlay.classList.contains("hidden")) closeProfile();
  });

  async function loadProfile(userId, usernameFromUi){
    const need = ["#profile-name","#profile-tier","#profile-score","#profile-volume","#profile-max-list","#profile-history"];
    for (const id of need){
      if (!qs(id)) {
        console.error("Profil: ID manquant dans index.html:", id);
        return;
      }
    }

    qs("#profile-name").textContent = usernameFromUi || "Profil";
    qs("#profile-tier").textContent = "—";
    qs("#profile-score").textContent = "—";
    qs("#profile-volume").textContent = "—";
    qs("#profile-max-list").innerHTML = `<div style="opacity:.75;padding:10px 0;">Chargement…</div>`;
    qs("#profile-history").innerHTML = `<div style="opacity:.75;padding:10px 0;">Chargement…</div>`;

    // 1) users : score / tier
    try {
      const users = await getJSON("/api/users");
      const me = Array.isArray(users) ? users.find(u => String(u.user_id) === String(userId)) : null;
      if (me) {
        qs("#profile-name").textContent = me.username || usernameFromUi || "Profil";
        qs("#profile-tier").textContent = me.tier || "—";
        qs("#profile-score").textContent = (me.score ?? "—");
      }
    } catch (e) {
      console.error("Profil: erreur /api/users", e);
    }

    // 2) exercises : max perfs + ids
    let exercises = [];
    try {
      exercises = await getJSON(`/api/exercises?user_id=${encodeURIComponent(userId)}`);
      if (!Array.isArray(exercises)) exercises = [];
    } catch (e) {
      console.error("Profil: erreur /api/exercises", e);
      exercises = [];
    }

    const maxBox = qs("#profile-max-list");
    if (exercises.length === 0) {
      maxBox.innerHTML = `<div style="opacity:.75;padding:10px 0;">Aucune performance maximale.</div>`;
    } else {
      const sorted = exercises
        .slice()
        .sort((a,b) => Number(b.max_weight||0) - Number(a.max_weight||0))
        .slice(0, 15);

      maxBox.innerHTML = sorted.map(ex => {
        const name = ex.exercise || ex.name || "Exercice";
        const w = Number(ex.max_weight || 0);
        return `
          <div class="max-perf-row">
            <span class="max-perf-name">${esc(name)}</span>
            <strong class="max-perf-weight">${esc(w)} kg</strong>
          </div>
        `;
      }).join("");
    }

    // 3) performances : historique + volume total
    const exNameById = new Map();
    for (const ex of exercises) {
      const id = ex.exercise_id;
      const name = ex.exercise || ex.name || "Exercice";
      if (id) exNameById.set(String(id), name);
    }

    let allPerfs = [];
    try {
      const ids = exercises.map(e => e.exercise_id).filter(Boolean);

      const perEx = await Promise.all(ids.map(async (eid) => {
        try {
          const list = await getJSON(`/api/performances?user_id=${encodeURIComponent(userId)}&exercise_id=${encodeURIComponent(eid)}`);
          return Array.isArray(list) ? list.map(p => ({ ...p, exercise_id: eid })) : [];
        } catch {
          return [];
        }
      }));

      allPerfs = perEx.flat();
    } catch (e) {
      console.error("Profil: erreur historique", e);
      allPerfs = [];
    }

    let totalVol = 0;
    for (const p of allPerfs) totalVol += perfVolume(p);
    qs("#profile-volume").textContent = formatKgCompact(totalVol);

    allPerfs.sort((a,b) => String(b.date || b.created_at || "").localeCompare(String(a.date || a.created_at || "")));

    const histBox = qs("#profile-history");
    if (allPerfs.length === 0) {
      histBox.innerHTML = `<div style="opacity:.75;padding:10px 0;">Aucun historique.</div>`;
    } else {
      const shown = allPerfs.slice(0, 50);
      histBox.innerHTML = shown.map(p => {
        const name = exNameById.get(String(p.exercise_id)) || "Exercice";
        const w = Number(p.weight || 0);
        const r = Number(p.reps || 0);
        const d = formatDateFR(p.date || p.created_at || "");
        return `
          <div class="history-row">
            <span class="history-ex">${esc(name)}</span>
            <strong class="history-val">${esc(w)} kg × ${esc(r)}</strong>
            <span class="history-date">${esc(d)}</span>
          </div>
        `;
      }).join("");
    }
  }

  // ------- Bouton Voir le profil -------
  const viewBtn = qs("#view-btn");
  viewBtn?.addEventListener("click", async () => {
    const r = resolveUser();
    console.log("Profil resolveUser:", r);

    if (!r.user_id) {
      alert("Impossible de trouver le user_id. Clique d'abord sur un profil dans la liste.");
      return;
    }

    openProfile();
    await loadProfile(r.user_id, r.username);
  });

})();
