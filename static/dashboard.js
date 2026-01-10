console.log("Dashboard JS chargé");

document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // USER FROM URL
  // ==========================

  const params = new URLSearchParams(window.location.search);
  const currentUser = params.get("user");

  const usernameEl = document.getElementById("username-display");
  if (currentUser && usernameEl) {
    usernameEl.textContent = currentUser;
  } else {
    console.warn("Impossible d'afficher le pseudo");
  }

  // ==========================
  // PAGES
  // ==========================

  const dashboardPage = document.getElementById("dashboard-page");
  const exercisesPage = document.getElementById("exercises-page");

  const navDashboard = document.getElementById("nav-dashboard");
  const navExercises = document.getElementById("nav-exercises");

  function showDashboard() {
    if (dashboardPage) dashboardPage.classList.remove("hidden");
    if (exercisesPage) exercisesPage.classList.add("hidden");

    navDashboard?.classList.add("active");
    navExercises?.classList.remove("active");
  }

  function showExercises() {
    if (dashboardPage) dashboardPage.classList.add("hidden");
    if (exercisesPage) exercisesPage.classList.remove("hidden");

    navDashboard?.classList.remove("active");
    navExercises?.classList.add("active");

    // Charger les exercices quand on ouvre la page
    loadExercises();
  }

  navDashboard?.addEventListener("click", showDashboard);
  navExercises?.addEventListener("click", showExercises);

  // Page affichée par défaut
  showDashboard();

  // ==========================
  // API — EXERCICE LE MOINS TRAVAILLÉ
  // ==========================

  async function loadLeastExercise() {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/least-exercise?user=${currentUser}`);
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const label = document.getElementById("least-exercise-name");
      if (!label) return;

      label.textContent = data.exercise || "Aucun exercice";

    } catch (err) {
      console.error("Erreur chargement exercice faible", err);
    }
  }

  function bindLeastExerciseClick() {
    const btn = document.getElementById("least-exercise-btn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      alert("Fiche exercice à venir (modale bientôt)");
    });
  }

  // ==========================
  // API — LISTE DES EXERCICES
  // ==========================

  async function loadExercises() {
    if (!currentUser) return;

    const grid = document.getElementById("exercises-grid");
    if (!grid) return;

    grid.innerHTML = "Chargement...";

    try {
      const res = await fetch(`/api/exercises?user=${currentUser}`);
      if (!res.ok) throw new Error("API error");

      const exercises = await res.json();
      grid.innerHTML = "";

      if (!exercises.length) {
        grid.innerHTML = "<p>Aucun exercice enregistré.</p>";
        return;
      }

      exercises.forEach(ex => {
        const card = document.createElement("div");
        card.className = "exercise-card";

        card.innerHTML = `
          <div class="exercise-title">${ex.exercise}</div>

          <div class="exercise-stat">
            🏆 Max : <strong>${ex.max_weight} kg</strong>
          </div>

          <div class="exercise-stat exercise-highlight">
            🎯 Entraînement : ${ex.training_weight} kg
          </div>

          <div class="exercise-stat">
            📅 Séances : ${ex.sessions}
          </div>

          <div class="exercise-stat">
            ⏱️ Dernière : ${ex.last_date || "-"}
          </div>
        `;

        card.addEventListener("click", () => {
          openExerciseModal(ex);
        });

        grid.appendChild(card);
      });

    } catch (err) {
      console.error("Erreur chargement exercices", err);
      grid.innerHTML = "<p>Erreur de chargement.</p>";
    }
  }

  // ==========================
  // MODALE EXERCICE (PLACEHOLDER)
  // ==========================

  function openExerciseModal(exercise) {
    alert(
      `Exercice : ${exercise.exercise}\n` +
      `Max : ${exercise.max_weight} kg\n` +
      `Poids cible (80%) : ${exercise.training_weight} kg\n` +
      `Séances : ${exercise.sessions}`
    );
  }

  // ==========================
  // INIT
  // ==========================

  loadLeastExercise();
  bindLeastExerciseClick();

});
