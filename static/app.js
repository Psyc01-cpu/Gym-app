document.addEventListener("DOMContentLoaded", () => {

  // ===== RÉFÉRENCES DOM =====
  const modal = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const closeBtn = document.getElementById("close-btn");
  const loginBtn = document.getElementById("login-btn");
  const viewBtn = document.getElementById("view-btn");
  const passwordInput = document.getElementById("password");

  let currentUser = null;

  // ===== DEBUG =====
  console.log("JS chargé");
  console.log({
    modal,
    modalTitle,
    closeBtn,
    loginBtn,
    viewBtn,
    passwordInput
  });

  // ===== SÉCURITÉ : MODALE TOUJOURS FERMÉE AU DÉPART =====
  modal.classList.add("hidden");

  // ===== OUVERTURE MODALE (clic sur dan / papy) =====
  document.querySelectorAll(".profile-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentUser = btn.dataset.user;
      modalTitle.textContent = `Profil : ${currentUser}`;
      passwordInput.value = "";
      modal.classList.remove("hidden");

      console.log("Profil sélectionné :", currentUser);
    });
  });

  // ===== FERMER MODALE =====
  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    currentUser = null;
    console.log("Modale fermée");
  });

  // ===== CONNEXION =====
  loginBtn.addEventListener("click", async () => {

    // 🔒 Sécurité profil
    if (!currentUser) {
      alert("Choisis d'abord un profil (dan ou papy)");
      return;
    }

    const password = passwordInput.value;

    // 🔒 Sécurité mot de passe
    if (!password) {
      alert("Entre un mot de passe");
      return;
    }

    console.log("CLICK LOGIN", currentUser, password);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: currentUser,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Connexion OK");
        window.location.href = `/dashboard?user=${currentUser}`;
      } else {
        alert(data.detail || "Erreur de connexion");
      }

    } catch (err) {
      console.error(err);
      alert("Erreur serveur");
    }
  });

  // ===== VOIR PROFIL (placeholder) =====
  viewBtn.addEventListener("click", () => {
    alert("Profil à venir");
  });

});
