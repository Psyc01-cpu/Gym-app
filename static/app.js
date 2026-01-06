document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const closeBtn = document.getElementById("close-btn");
  const loginBtn = document.getElementById("login-btn");
  const viewBtn = document.getElementById("view-btn");
  const passwordInput = document.getElementById("password");

  const profileButtons = document.querySelectorAll(".profile-btn");

  let currentUser = null;

  // 🔍 DEBUG
  console.log({
    modal,
    modalTitle,
    closeBtn,
    loginBtn,
    viewBtn,
    passwordInput,
    profileButtons
  });

  // 🔒 AU DÉPART : MODALE FERMÉE
  modal.classList.add("hidden");

  // 👤 CLIC SUR DAN / PAPY
  profileButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      currentUser = btn.dataset.user; // data-user="dan" ou "papy"
      modalTitle.textContent = `Profhhhil : ${currentUser}`;
      passwordInput.value = "";
      modal.classList.remove("hidden");

      console.log("Profil sélectionné :", currentUser);
    });
  });

  // ❌ FERMER LA MODALE
  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    currentUser = null;
    console.log("Modale fermée");
  });

  // 🔑 CONNEXION
  loginBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Aucun profil sélectionné");
      return;
    }

    const password = passwordInput.value.trim();
    if (!password) {
      alert("Mot de passe manquant");
      return;
    }

    console.log(`Tentative de connexion → ${currentUser} / ${password}`);

    // ⚠️ ici tu brancheras plus tard ton vrai backend
    alert(`Connecté en tant que ${currentUser}`);
    modal.classList.add("hidden");
  });

  // 👁 VOIR LE PROFIL
  viewBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Aucun profil sélectionné");
      return;
    }

    console.log("Voir profil :", currentUser);
    window.location.href = `/profil/${currentUser}`;
  });

});
