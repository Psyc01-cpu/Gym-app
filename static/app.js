document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("close-btn");
  const profileBtns = document.querySelectorAll(".profile-btn");

  if (!overlay || !closeBtn) {
    console.error("Modal introuvable dans le DOM");
    return;
  }

  let selectedUser = null;

  function openModal(user) {
    selectedUser = user;
    document.getElementById("modal-title").textContent =
      "Connexion – " + user;
    overlay.classList.remove("hidden");
    console.log("Modal ouverte pour :", user);
  }

  function closeModal() {
    overlay.classList.add("hidden");
    console.log("Modal fermée");
  }

  // Clic sur profils
  profileBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const user = btn.dataset.user;
      openModal(user);
    });
  });

  // Bouton fermer
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();   // évite les effets de bubbling
    closeModal();
  });

  // Clic sur le fond noir uniquement
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Optionnel : fermeture avec ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
});
