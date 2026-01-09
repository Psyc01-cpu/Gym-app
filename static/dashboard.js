document.addEventListener("DOMContentLoaded", () => {

  const menuBtn = document.getElementById("menu-btn");
  const menuOverlay = document.getElementById("menu-overlay");
  const menuItems = document.querySelectorAll(".menu-item");
  const pageContent = document.getElementById("page-content");

  if (!menuBtn || !menuOverlay || !pageContent) {
    console.warn("Dashboard UI non initialisée");
    return;
  }

  function openMenu() {
    menuOverlay.classList.remove("hidden");
  }

  function closeMenu() {
    menuOverlay.classList.add("hidden");
  }

  menuBtn.addEventListener("click", openMenu);
  menuOverlay.addEventListener("click", closeMenu);

  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;
      loadPage(page);
      closeMenu();
    });
  });

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
      `;
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

  // Page par défaut
  loadPage("training");

});
