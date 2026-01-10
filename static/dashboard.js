console.log("Dashboard JS chargé");

document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // USER FROM URL
  // ==========================

  const params = new URLSearchParams(window.location.search);
  const currentUser = params.get("user");

  console.log("USER URL =", currentUser);

  const usernameEl = document.getElementById("username-display");
  if (currentUser && usernameEl) {
    usernameEl.textContent = currentUser;
  } else {
    console.warn("Impossible d'afficher le pseudo");
  }

  // ==========================
  // NOUVEL EXERCICE (MODALE)
  // ==========================
  
  const newExerciseBtn = document.getElementById("new-exercise-btn");
  const modal = document.getElementById("exercise-modal");
  const closeModalBtn = document.getElementById("close-exercise-modal");
  const createExerciseBtn = document.getElementById("create-exercise-btn");
  
  newExerciseBtn?.addEventListener("click", () => {
    modal?.classList.remove("hidden");
  });
  
  closeModalBtn?.addEventListener("click", () => {
    modal?.classList.add("hidden");
  });
  
  createExerciseBtn?.addEventListener("click", async () => {
    const name = document.getElementById("exercise-name").value.trim();
    const zone = document.getElementById("exercise-zone").value;
    const video = document.getElementById("exercise-video").value.trim();
  
    if (!name || !zone) {
      alert("Nom et zone obligatoires");
      return;
    }
  
    try {
      const res = await fetch("/api/exercises/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUser,
          name: name,
          zone: zone,
          video_url: video
        })
      });
  
      if (!res.ok) throw new Error("API error");
  
      // ✅ Success
      modal.classList.add("hidden");
      alert("Exercice créé avec succès ✅");
  
      // Reset form
      document.getElementById("exercise-name").value = "";
      document.getElementById("exercise-zone").value = "";
      document.getElementById("exercise-video").value = "";
  
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création");
    }
  });

  
  // ==========================
  // PAGES (NAVIGATION)
  // ==========================

  const dashboardPage = document.getElementById("dashboard-page");
  const exercisesPage = document.getElementById("exercises-page");

  const navDashboard = document.getElementById("nav-dashboard");
  const navExercises = document.getElementById("nav-exercises");

  function showDashboard() {
    dashboardPage?.classList.remove("hidden");
    exercisesPage?.classList.add("hidden");

    navDashboard?.classList.add("active");
    navExercises?.classList.remove("active");
  }

  function showExercises() {
    dashboardPage?.classList.add("hidden");
    exercisesPage?.classList.remove("hidden");

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
  // AJOUT EXERCICE (MODALE)
  // ==========================

  const addExerciseBtn = document.getElementById("add-exercise-btn");
  const exerciseModal = document.getElementById("exercise-modal");
  const saveExerciseBtn = document.getElementById("save-exercise-btn");
  const cancelExerciseBtn = document.getElementById("cancel-exercise-btn");

  const exerciseNameInput = document.getElementById("exercise-name-input");
  const exerciseWeightInput = document.getElementById("exercise-weight-input");

  // Ouvrir la modale
  addExerciseBtn?.addEventListener("click", () => {
    exerciseModal?.classList.remove("hidden");
    exerciseNameInput.value = "";
    exerciseWeightInput.value = "";
  });

  // Fermer la modale
  cancelExerciseBtn?.addEventListener("click", () => {
    exerciseModal?.classList.add("hidden");
  });

  // Sauvegarder exercice (TEMPORAIRE : juste affichage)
  saveExerciseBtn?.addEventListener("click", () => {
    const name = exerciseNameInput.value.trim();
    const weight = exerciseWeightInput.value;

    if (!name || !weight) {
      alert("Merci de remplir tous les champs");
      return;
    }

    alert(`Exercice ajouté : ${name} — ${weight} kg`);

    exerciseModal?.classList.add("hidden");

    // 👉 Plus tard on branchera l’API ici
  });

  
  // ==========================
  // API — EXERCICE LE MOINS TRAVAILLÉ
  // ==========================

  async function loadLeastExercise() {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/least-exercise?user_id=${currentUser}`);
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
      // ✅ PARAMÈTRE CORRECT : user_id
      const res = await fetch(`/api/exercises?user_id=${currentUser}`);
      if (!res.ok) throw new Error("API error");

      const exercises = await res.json();
      grid.innerHTML = "";

      if (!Array.isArray(exercises) || exercises.length === 0) {
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
            🎯 Entraînement (80%) : <strong>${ex.training_weight} kg</strong>
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
      `Séances : ${exercise.sessions}\n` +
      `Dernière séance : ${exercise.last_date || "-"}`
    );
  }

  // ==========================
  // INIT
  // ==========================

  loadLeastExercise();
  bindLeastExerciseClick();

});
