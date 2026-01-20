(function () {
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

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
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return await r.json();
  }

  // ---- Sélection du profil (robuste) ----
  // On capte le clic sur une "profile-card" injectée dans #users-list
  // et on stocke le user_id/username pour "Voir le profil".
  let selected = { user_id: null, username: null };

  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest && e.target.closest(".profile-card");
    if (!btn) return;

    const userId = btn.getAttribute("data-user-id");
    const username = btn.getAttribute("data-username");

    if (userId) selected.user_id = userId;
    if (username) selected.username = username;
  }, true);

  // ---- Modale Profil ----
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
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeProfile();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (overlay && !overlay.classList.contains("hidden")) closeProfile();
  });

  // ---- Remplissage de la modale ----
  async function loadProfile(userId, usernameFromUi){
    // UI placeholders
    qs("#profile-name").textContent = usernameFromUi || "Profil";
    qs("#profile-tier").textContent = "—";
    qs("#profile-score").textContent = "—";
    qs("#profile-volume").textContent = "—";
    qs("#profile-max-list").innerHTML = `<div style="opacity:.75;padding:10px 0;">Chargement…</div>`;
    qs("#profile-history").innerHTML = `<div style="opacity:.75;padding:10px 0;">Chargement…</div>`;

    // 1) users (score/tier)
    let me = null;
    try {
      const users = await getJSON("/api/users");
      me = Array.isArray(users) ? users.find(u => String(u.user_id) === String(userId)) : null;
      if (me) {
        qs("#profile-name").textContent = me.username || usernameFromUi || "Profil";
        qs("#profile-tier").textContent = me.tier || "—";
        qs("#profile-score").textContent = (me.score ?? "—");
      }
    } catch (e) {
      console.error("Profil: erreur /api/users", e);
    }

    // 2) exercises (max list + ids)
    let exercises = [];
    try {
      exercises = await getJSON(`/api/exercises?user_id=${encodeURIComponent(userId)}`);
      if (!Array.isArray(exercises)) exercises = [];
    } catch (e) {
      console.error("Profil: erreur /api/exercises", e);
      exercises = [];
    }

    // Render max performances (top 15)
    const maxBox = qs("#profile-max-list");
    if (maxBox) {
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
    }

    // 3) performances (historique + volume total)
    // Pas d'API "all", donc on fetch par exercise_id et on fusionne.
    const exNameById = new Map();
    for (const ex of exercises) {
      const id = ex.exercise_id;
      const name = ex.exercise || ex.name || "Exercice";
      if (id) exNameById.set(String(id), name);
    }

    let allPerfs = [];
    try {
      const ids = exercises.map(e => e.exercise_id).filter(Boolean);

      // Limite de charge: on charge tout, puis on n'affiche que les 50 dernières
      const requests = ids.map(async (eid) => {
        try {
          const list = await getJSON(`/api/performances?user_id=${encodeURIComponent(userId)}&exercise_id=${encodeURIComponent(eid)}`);
          return Array.isArray(list) ? list.map(p => ({ ...p, exercise_id: eid })) : [];
        } catch {
          return [];
        }
      });

      const perfsByEx = await Promise.all(requests);
      allPerfs = perfsByEx.flat();

    } catch (e) {
      console.error("Profil: erreur historique", e);
      allPerfs = [];
    }

    // Volume total = somme(weight * reps) sur toutes les perfs
    let totalVol = 0;
    for (const p of allPerfs) totalVol += perfVolume(p);
    qs("#profile-volume").textContent = formatKgCompact(totalVol);

    // Historique: tri desc par date si possible
    allPerfs.sort((a,b) => {
      const da = a.date || a.created_at || "";
      const db = b.date || b.created_at || "";
      return String(db).localeCompare(String(da));
    });

    const historyBox = qs("#profile-history");
    if (historyBox) {
      if (allPerfs.length === 0) {
        historyBox.innerHTML = `<div style="opacity:.75;padding:10px 0;">Aucun historique.</div>`;
      } else {
        const shown = allPerfs.slice(0, 50);
        historyBox.innerHTML = shown.map(p => {
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
  }

  // ---- Bouton "Voir le profil" (dans la modale login existante) ----
  const viewBtn = qs("#view-btn");
  viewBtn?.addEventListener("click", async () => {
    // On essaie aussi de récupérer l'ID depuis la modale login si app.js l'a stocké
    const loginOverlay = qs("#modal-overlay");
    const dsUserId = loginOverlay?.dataset?.userId || null;
    const dsUsername = loginOverlay?.dataset?.username || null;

    const userId = selected.user_id || dsUserId;
    const username = selected.username || dsUsername;

    if (!userId) {
      alert("Sélectionne un profil dans la liste avant.");
      return;
    }

    openProfile();
    await loadProfile(userId, username);
  });
})();
