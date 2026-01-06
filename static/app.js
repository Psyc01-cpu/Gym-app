document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const closeBtn = document.getElementById("close-btn");
  const loginBtn = document.getElementById("login-btn");
  const viewBtn = document.getElementById("view-btn");
  const passwordInput = document.getElementById("password");
  const profileButtons = document.querySelectorAll(".profile-btn");

  let currentUser = null;

  // 🔒 AU CHARGEMENT → MODALE FERMÉE
  modal.classList.add("hidden");

  // 👤 CLIC SUR UN PROFIL
  profileButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      currentUser = btn.dataset.user;
      modalTitle.textContent = `Profil : ${currentUser}`;
      passwordInput.value = "";
      modal.classList.remove("hidden");
      console.log("Profil sélectionné :", currentUser);
    });
  });

  // ❌ FERMER (BOUTON)
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // 🔥 IMPORTANT
    modal.classList.add("hidden");
    currentUser = null;
    console.log("Modale fermée");
  });

  // ❌ FERMER (CLIC EN DEHORS)
  modal.addEventListener("click", () => {
    modal.classList.add("hidden");
    currentUser = null;
    console.log("Modale fermée (overlay)");
  });

  // ⛔ EMPÊCHE LA MODALE DE SE FERMER QUAND ON CLIQUE DEDANS
  document.querySelector(".modal").addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // 🔑 CONNEXION (pour test)
  loginBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Aucun profil sélectionné");
      return;
    }

    if (!passwordInput.value.trim()) {
      alert("Mot de passe manquant");
      return;
    }

    alert(`Connecté en tant que ${currentUser}`);
    modal.classList.add("hidden");
  });

});
