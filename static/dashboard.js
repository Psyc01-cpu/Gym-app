document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const username = params.get("user");

  console.log("USER URL =", username); // 👈 debug

  const usernameEl = document.getElementById("username-display");

  if (username && usernameEl) {
    usernameEl.textContent = ` — ${username}`;
  }
});


// =======================
// USER FROM URL
// =======================

function getUserFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user");
}

document.addEventListener("DOMContentLoaded", () => {
  const username = getUserFromUrl();
  const usernameEl = document.getElementById("username-display");

  if (username && usernameEl) {
    usernameEl.textContent = ` — ${username}`;
  }
});


document.addEventListener("DOMContentLoaded", () => {

  const menuBtn = document.getElementById("menu-btn");
  const menuOverlay = document.getElementById("menu-overlay");
  const menuItems = document.querySelectorAll(".menu-item");
  const pageContent = document.getElementById("page-content");

  if (!pageContent) {
    console.warn("Dashboard UI non initialisée");
    return;
  }

  // ----------------------------
  // USER depuis URL
  // ----------------------------

  const params = new URLSearchParams(window.location.search);
  const currentUser = params.get("user");

  const usernameLabel = document.getElementById("username-label");

if (usernameLabel && currentUser) {
  usernameLabel.textContent = currentUser;
}


  // ----------------------------
  // MENU
  // ----------------------------

  function openMenu() {
    if (menuOverlay) menuOverlay.classList.remove("hidden");
  }

  function closeMenu() {
    if (menuOverlay) menuOverlay.classList.add("hidden");
  }

  if (menuBtn && menuOverlay) {
    menuBtn.addEventListener("click", openMenu);
    menuOverlay.addEventListener("click", closeMenu);
  }

  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;
      loadPage(page);
      closeMenu();
    });
  });

  // ----------------------------
  // API — Exercice le moins travaillé
  // ----------------------------

  async function loadLeastExercise() {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/least-exercise?user=${currentUser}`);
      if (!res.ok) return;

      const data = await res.json();
      const label = document.getElementById("least-exercise-name");

      if (!label) return;

      if (!data.exercise) {
        label.textContent = "Aucun exercice";
      } else {
        label.textContent = data.exercise;
      }

    } catch (err) {
      console.error("Erreur chargement exercice faible", err);
    }
  }

  // ----------------------------
  // OUVERTURE MODALE EXERCICE (placeholder)
  // ----------------------------

  function bindLeastExerciseClick() {
    const btn = document.getElementById("least-exercise-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      alert("Fiche exercice à venir (modale bientôt)");
    });
  }

  // ----------------------------
  // PAGES
  // ----------------------------

  function loadPage(page) {

    if (page === "training") {
      pageContent.innerHTML = `
        <div class="user-header">
          <h1>🦇 Dashboard</h1>
          <div class="badge">Bronze I</div>
        </div>

        <div class="dashboard-grid">
          <div class="card glow">
            <h3>💪 Volume</h3>
            <div class="value">12 450 kg</div>
          </div>

          <div class="card glow">
            <h3>🏆 Score</h3>
            <div class="value">1 240 pts</div>
          </div>

          <div class="card">
            <h3>🔥 Série</h3>
            <div class="value">6 jours</div>
          </div>

          <div class="card">
            <h3>📅 Séances</h3>
            <div class="value">28</div>
          </div>
        </div>

        <!-- EXERCICE À PRIORISER -->
        <div class="priority-card" id="least-exercise-btn">
          <h3>🎯 Exercice à prioriser</h3>
          <div class="exercise-name" id="least-exercise-name">
            Chargement...
          </div>
          <small>Clique pour ouvrir la fiche</small>
        </div>
      `;

      // Charger l'exercice faible
      loadLeastExercise();

      // Brancher le clic
      bindLeastExerciseClick();
    }

    if (page === "profile") {
      pageContent.innerHTML = `
        <h1>⚙️ Profil</h1>
        <p>Paramètres à venir.</p>
      `;
    }

    if (page === "ranking") {
      pageContent.innerHTML = `
        <h1>🏆 Classement</h1>
        <p>Classement global bientôt disponible.</p>
      `;
    }

    if (page === "stats") {
      pageContent.innerHTML = `
        <h1>📊 Statistiques</h1>
        <p>Graphiques bientôt disponibles.</p>
      `;
    }
  }

  // ----------------------------
  // PAGE PAR DÉFAUT
  // ----------------------------

  loadPage("training");

});
