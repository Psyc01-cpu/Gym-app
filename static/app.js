const modal = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const closeBtn = document.getElementById("close-btn");
const loginBtn = document.getElementById("login-btn");
const viewBtn = document.getElementById("view-btn");
const passwordInput = document.getElementById("password");

let currentUser = null;

// Ouvrir la modale
document.querySelectorAll(".profile-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentUser = btn.dataset.user;
    modalTitle.textContent = `Profil : ${currentUser}`;
    modal.classList.remove("hidden");
    passwordInput.value = "";
  });
});

// Fermer la modale
closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  currentUser = null;
});

// Connexion
loginBtn.addEventListener("click", async () => {
  const password = passwordInput.value;

  if (!password) {
    alert("Entre un mot de passe");
    return;
  }

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
      window.location.href = `/dashboard?user=${currentUser}`;
    } else {
      alert(data.detail || "Erreur de connexion");
    }
  } catch (err) {
    alert("Erreur serveur");
  }
});

// Voir le profil (placeholder)
viewBtn.addEventListener("click", () => {
  alert("Profil à venir");
});
