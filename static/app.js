// ---------------- ELEMENTS ----------------
const modal = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");

const closeBtn = document.getElementById("close-btn");
const loginBtn = document.getElementById("login-btn");
const viewBtn = document.getElementById("view-btn");

const passwordInput = document.getElementById("password");

let selectedUser = null;

// ---------------- OUVERTURE MODALE ----------------
document.querySelectorAll(".profile-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedUser = btn.dataset.user;
    modalTitle.textContent = `Profil : ${selectedUser}`;
    passwordInput.value = "";
    modal.classList.remove("hidden");
  });
});

// ---------------- FERMER MODALE ----------------
closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  selectedUser = null;
  passwordInput.value = "";
});

// ---------------- CONNEXION ----------------
loginBtn.addEventListener("click", async () => {
  if (!selectedUser) {
    alert("Aucun profil sélectionné");
    return;
  }

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

    if (response.ok && data.success) {
      window.location.href = `/dashboard?user=${selectedUser}`;
    } else {
      alert(data.message || "Erreur de connexion");
    }

  } catch (err) {
    alert("Erreur serveur");
    console.error(err);
  }
});

// ---------------- VOIR PROFIL (DEMO POUR L’INSTANT) ----------------
viewBtn.addEventListener("click", () => {
  if (!selectedUser) return;
  alert(`Voir le profil de ${selectedUser} (à venir)`);
});
