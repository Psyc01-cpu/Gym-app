const modal = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const closeBtn = document.getElementById("close-btn");
const loginBtn = document.getElementById("login-btn");
const viewBtn = document.getElementById("view-btn");
const passwordInput = document.getElementById("password");

let selectedUser = null;

// ouvrir la modale
document.querySelectorAll(".profile-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedUser = btn.dataset.user;
    modalTitle.textContent = `Profil : ${selectedUser}`;
    modal.classList.remove("hidden");
  });
});

// fermer
closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  passwordInput.value = "";
  selectedUser = null;
});

// connexion
loginBtn.addEventListener("click", async () => {
  if (!selectedUser) {
    alert("Aucun utilisateur sélectionné");
    return;
  }

  const password = passwordInput.value;
  if (!password) {
    alert("Mot de passe manquant");
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: selectedUser,
        password: password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Erreur de connexion");
      return;
    }

    // succès
    window.location.href = `/dashboard?user=${selectedUser}`;

  } catch (err) {
    console.error(err);
    alert("Erreur réseau");
  }
});

// voir profil (sans login pour l’instant)
viewBtn.addEventListener("click", () => {
  if (!selectedUser) {
    alert("Aucun utilisateur");
    return;
  }
  window.location.href = `/dashboard?user=${selectedUser}`;
});
