console.log("Dashboard JS chargé");

document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // USER FROM URL
  // ==========================

  const params = new URLSearchParams(window.location.search);
  const currentUser = params.get("user");

  console.log("USER URL =", currentUser);

  const usernameEl = document.getElementById("username-display");
  console.log("SPAN =", usernameEl);

  if (currentUser && usernameEl) {
    usernameEl.textContent = currentUser;
    console.log("Pseudo injecté :", currentUser);
  } else {
    console.warn("Impossible d'afficher le pseudo");
  }

  // ==========================
  // API — Exercice le moins travaillé
  // ==========================

  async function loadLeastExercise() {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/least-exercise?user=${currentUser}`);
      if (!res.ok) return;

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
      alert("Fiche exercice à venir");
    });
  }

  // ==========================
  // INIT
  // ==========================

  loadLeastExercise();
  bindLeastExerciseClick();

});
