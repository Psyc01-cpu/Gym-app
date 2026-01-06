document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("close-btn");
  const profileBtns = document.querySelectorAll(".profile-btn");

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
      console.log("Profil sélectionné :", user);
      openModal(user);
    });
  });

  // Bouton fermer
  closeBtn.addEventListener("click", closeModal);

  // Clic sur le fond noir
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
});
