const modal = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");

const closeBtn = document.getElementById("close-btn");
const loginBtn = document.getElementById("login-btn");
const viewBtn = document.getElementById("view-btn");

let currentUser = null;

// ouvrir la modale
document.querySelectorAll(".profile-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentUser = btn.dataset.user;
    modalTitle.innerText = "Profil : " + currentUser;
    modal.classList.remove("hidden");
  });
});

// fermer
closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
  currentUser = null;
});

// actions (pour l’instant demo)
loginBtn.addEventListener("click", () => {
  alert("Connexion pour " + currentUser);
});

viewBtn.addEventListener("click", () => {
  alert("Voir le profil de " + currentUser);
});

const loginBtn = document.getElementById("login-btn");
const passwordInput = document.getElementById("password");

let selectedUser = null;

document.querySelectorAll(".profile-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedUser = btn.dataset.user;
    modalTitle.textContent = `Profil : ${selectedUser}`;
    modal.classList.remove("hidden");
  });
});

loginBtn.addEventListener("click", async () => {
  const password = passwordInput.value;

  const formData = new FormData();
  formData.append("username", selectedUser);
  formData.append("password", password);

  const response = await fetch("/login", {
    method: "POST",
    body: formData
  });

  const data = await response.json();

  if (response.ok) {
    alert("Connexion réussie : " + data.user);
    // plus tard → redirect vers dashboard
  } else {
    alert(data.message);
  }
});
