// === éléments DOM ===
const modal = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const closeBtn = document.getElementById("close-btn");
const loginBtn = document.getElementById("login-btn");
const passwordInput = document.getElementById("password");

let selectedUser = null;

// === ouvrir la modale ===
document.querySelectorAll(".profile-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedUser = btn.dataset.user;
    modalTitle.textContent = `Profil : ${selectedUser}`;
    modal.classList.remove("hidden");
    passwordInput.value = "";
  });
});

// === fermer la modale ===
closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  selectedUser = null;
});

// === connexion ===
loginBtn.addEventListener("click", async () => {
  const password = passwordInput.value;

  if (!password) {
    alert("Mot de passe requis");
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
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

    // ✅ succès → dashboard
    window.location.href = `/dashboard?user=${selectedUser}`;

  } catch (err) {
    console.error(err);
    alert("Erreur serveur");
  }
});
