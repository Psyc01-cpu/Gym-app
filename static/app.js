document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("close-btn");
  const modalTitle = document.getElementById("modal-title");
  const passwordInput = document.getElementById("password");

  const loginBtn = document.getElementById("login-btn");
  const viewBtn = document.getElementById("view-btn");
  const createProfileBtn = document.getElementById("create-profile-btn");

  const profilesContainer = document.querySelector(".profiles");

  if (!overlay || !closeBtn || !profilesContainer) {
    console.error("Éléments DOM manquants");
    return;
  }

  let selectedUser = null;

  /* -------------------------
     MODALE
  -------------------------- */

  function openModal(user) {
    selectedUser = user;
    modalTitle.textContent = "Profil – " + user;
    passwordInput.value = "";
    overlay.classList.remove("hidden");
    console.log("Modal ouverte pour :", user);
  }

  function closeModal() {
    overlay.classList.add("hidden");
    selectedUser = null;
    console.log("Modal fermée");
  }

  /* -------------------------
     CHARGEMENT DES PROFILS
  -------------------------- */

  async function loadProfiles() {
    try {
      const res = await fetch("/api/users");
      const users = await res.json();

      profilesContainer.innerHTML = "";

      users.forEach((user) => {
        const btn = document.createElement("button");
        btn.className = "profile-btn";
        btn.dataset.user = user;
        btn.textContent = user;
        profilesContainer.appendChild(btn);
      });

    } catch (err) {
      console.error("Erreur chargement profils", err);
    }
  }

  loadProfiles();

  /* -------------------------
     CLIC SUR PROFIL (délégation)
  -------------------------- */

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".profile-btn");
    if (!btn) return;

    const user = btn.dataset.user;
    openModal(user);
  });

  /* -------------------------
     BOUTON ➕ CRÉER PROFIL
  -------------------------- */

  if (createProfileBtn) {
    createProfileBtn.addEventListener("click", async () => {
      const username = prompt("Nom du profil :");
      const password = prompt("Mot de passe :");

      if (!username || !password) return;

      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.detail || "Erreur création profil");
          return;
        }

        alert("Profil créé avec succès");
        loadProfiles();

      } catch (err) {
        alert("Erreur réseau");
        console.error(err);
      }
    });
  }

  /* -------------------------
     BOUTON 🔐 CONNEXION
  -------------------------- */

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const password = passwordInput.value;

      if (!selectedUser || !password) {
        alert("Mot de passe requis");
        return;
      }

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: selectedUser,
            password: password
          })
        });

        if (!res.ok) {
          alert("Identifiants incorrects");
          return;
        }

        window.location.href = `/dashboard?user=${selectedUser}`;

      } catch (err) {
        alert("Erreur réseau");
        console.error(err);
      }
    });
  }

  /* -------------------------
     BOUTON 👁️ VOIR PROFIL
  -------------------------- */

  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      if (!selectedUser) return;
      window.location.href = `/dashboard?user=${selectedUser}`;
    });
  }

  /* -------------------------
     FERMETURE MODALE
  -------------------------- */

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
});
