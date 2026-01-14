console.log("Dashboard JS chargé");

document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // USER FROM URL
  // ==========================
  const params = new URLSearchParams(window.location.search);
  const username = params.get("user");     // affichage
  const userId = params.get("user_id");    // appels API

  console.log("USER URL (username) =", username);
  console.log("USER URL (user_id) =", userId);

  const usernameEl = document.getElementById("username-display");
  if (usernameEl) {
    usernameEl.textContent = username || "Profil";
    if (!username) console.warn("Impossible d'afficher le pseudo (param ?user manquant)");
  }

  if (!userId) {
    console.warn("Paramètre ?user_id manquant : les appels API ne fonctionneront pas.");
  }

  // ==========================
  // MODALE (NOUVEL EXERCICE)
  // ==========================
  const modal = document.getElementById("exercise-modal");
  const closeModalBtn = document.getElementById("close-exercise-modal");
  const createExerciseBtn = document.getElementById("create-exercise-btn");

  const newExerciseBtn = document.getElementById("new-exercise-btn"); // dashboard
  const addExerciseBtn = document.getElementById("add-exercise-btn"); // page exercices (header)

  function openCreateExerciseModal() {
    if (!modal) return;
    modal.classList.remove("hidden");

    // focus mobile
    setTimeout(() => {
      document.getElementById("exercise-name")?.focus();
    }, 150);
  }

  function closeCreateExerciseModal() {
    if (!modal) return;
    modal.classList.add("hidden");
  }

  // Ouvre la modale depuis dashboard
  newExerciseBtn?.addEventListener("click", openCreateExerciseModal);

  // Ouvre la modale depuis page Exercices
  addExerciseBtn?.addEventListener("click", openCreateExerciseModal);

  closeModalBtn?.addEventListener("click", closeCreateExerciseModal);

  // Fermer si clic sur l'overlay (si tu veux)
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeCreateExerciseModal();
  });

  // ==========================
  // CREATE EXERCISE
  // ==========================
  createExerciseBtn?.addEventListener("click", async () => {
    const name = document.getElementById("exercise-name")?.value.trim();

    // Zone depuis radio buttons (haut/bas)
    const zone = document.querySelector("input[name='zone']:checked")?.value || "";

    const video = document.getElementById("exercise-video")?.value.trim();

    if (!name || !zone) {
      alert("Nom et zone obligatoires");
      return;
    }

    if (!userId) {
      alert("Erreur: user_id manquant dans l'URL. Reconnectez-vous depuis la page login.");
      return;
    }

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

      if (!res.ok) throw new Error("API error");

      closeCreateExerciseModal();
      alert("Exercice créé avec succès ✅");

      // Reset form
      const n = document.getElementById("exercise-name");
      const v = document.getElementById("exercise-video");
      if (n) n.value = "";
      if (v) v.value = "";

      // Reset zone radios (aucun coché)
      document.querySelectorAll("input[name='zone']").forEach((radio) => {
        radio.checked = false;
      });

      // Recharge la liste (important)
      await loadExercises();

    } catch (err) {
      console.error(err);
      alert("Erreur lors de la création");
    }
  });

  // ==========================
  // NAVIGATION PAGES
  // ==========================
  const dashboardPage = document.getElementById("dashboard-page");
  const exercisesPage = document.getElementById("exercises-page");
  const navDashboard = document.getElementById("nav-dashboard");
  const navExercises = document.getElementById("nav-exercises");

  function setActiveNav(activeId) {
    const items = [navDashboard, navExercises].filter(Boolean);
    items.forEach((btn) => btn.classList.remove("active"));
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

  // Page par défaut
  showDashboard();

  // ==========================
  // API — EXERCICE LE MOINS TRAVAILLÉ
  // (reste basé sur workouts → OK)
  // ==========================
  async function loadLeastExercise() {
    if (!userId) return;

    try {
      const res = await fetch(`/api/least-exercise?user_id=${encodeURIComponent(userId)}`);
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
      alert("Fiche exercice à venir (performances bientôt)");
    });
  }

  // ==========================
  // API — LISTE DES EXERCICES (exercises sheet)
  // ==========================
  async function loadExercises() {
    if (!userId) return;

    const grid = document.getElementById("exercises-grid");
    if (!grid) return;

    grid.innerHTML = "Chargement...";

    try {
      // IMPORTANT : endpoint doit renvoyer les exercices créés (sheet exercises)
      const res = await fetch(`/api/exercises?user_id=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("API error");

      const exercises = await res.json();
      grid.innerHTML = "";

      if (!Array.isArray(exercises) || exercises.length === 0) {
        grid.innerHTML = "<p>Aucun exercice enregistré.</p>";
        return;
      }

      // Normalisation (au cas où)
      const normalized = exercises.map((e) => ({
        exercise_id: e.exercise_id || e.id || "",
        name: e.name || e.exercise || "",
        zone: e.zone || "",
        video_url: e.video_url || e.video || "",
        created_at: e.created_at || "",
      }));

      normalized.forEach((ex) => {
        const card = document.createElement("div");
        card.className = "exercise-card";

        const zoneLabel = ex.zone ? ex.zone.toUpperCase() : "-";
        const videoLabel = ex.video_url ? "🎥 Vidéo" : "";

        card.innerHTML = `
          <div class="exercise-header">
            <div class="exercise-title">${escapeHtml(ex.exercise)}</div>
            <div class="exercise-badge">${escapeHtml(ex.zone || "Zone")}</div>
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
            <button class="btn-open">Ouvrir</button>
            <button class="btn-edit">Modifier</button>
            <button class="btn-delete">Supprimer</button>
          </div>
        `;


        // Click : plus tard → ouvrir modale performance
        card.addEventListener("click", () => {
          openExercise(ex);
        });

        grid.appendChild(card);
      });

    } catch (err) {
      console.error("Erreur chargement exercices", err);
      grid.innerHTML = "<p>Erreur de chargement.</p>";
    }
  }

  function openExercise(ex) {
    // Placeholder (prochaine étape : modale performance)
    alert(
      `Exercice : ${ex.name}\n` +
      `Zone : ${ex.zone || "-"}\n` +
      (ex.video_url ? `Vidéo : ${ex.video_url}\n` : "")
    );
  }

  // ==========================
  // UTILS
  // ==========================
  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ==========================
  // INIT
  // ==========================
  loadLeastExercise();
  bindLeastExerciseClick();
});
