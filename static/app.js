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
