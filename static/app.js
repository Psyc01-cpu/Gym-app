function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const passwordInput = document.getElementById("password");

  const loginBtn = document.getElementById("login-btn");
  const viewBtn = document.getElementById("view-btn");
  const createProfileBtn = document.getElementById("create-profile-btn");

  const profilesContainer = document.querySelector(".profiles");
  const loginForm = document.getElementById("login-form");

  // Password toggle (création)
  const togglePasswordBtn = document.getElementById("toggle-password");
  const pwdInput = document.getElementById("new-password");
  const eyeOpen = document.getElementById("eye-open");
  const eyeClosed = document.getElementById("eye-closed");

  if (togglePasswordBtn && pwdInput && eyeOpen && eyeClosed) {
    togglePasswordBtn.addEventListener("click", () => {
      const isPassword = pwdInput.type === "password";
      pwdInput.type = isPassword ? "text" : "password";

      eyeOpen.classList.toggle("hidden", !isPassword);
      eyeClosed.classList.toggle("hidden", isPassword);

      togglePasswordBtn.setAttribute(
        "aria-label",
        isPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
      );
    });
  }

  // Modale création
  const createOverlay = document.getElementById("create-overlay");
  const validateCreateBtn = document.getElementById("validate-create-btn");

  if (!overlay || !profilesContainer || !createOverlay) {
    console.error("Éléments DOM manquants");
    return;
  }

  let selectedUser = null;

  /* -------------------------
     MODALE PROFIL
  -------------------------- */

  function openModal(user) {
    selectedUser = user;
    modalTitle.textContent = "Profil – " + user;
    passwordInput.value = "";
    overlay.classList.remove("hidden");

    // autofocus mobile
    setTimeout(() => passwordInput.focus(), 150);
  }

  function closeModal() {
    overlay.classList.add("hidden");
    selectedUser = null;
  }

  /* -------------------------
     CHARGEMENT DES PROFILS
  -------------------------- */

  async function loadProfiles() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;

      const users = await res.json();
      if (!Array.isArray(users)) return;

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
     CLIC SUR PROFIL
  -------------------------- */

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".profile-btn");
    if (!btn) return;
    openModal(btn.dataset.user);
  });

  /* -------------------------
     BOUTON ➕ OUVRIR MODALE CRÉATION
  -------------------------- */

  if (createProfileBtn) {
    createProfileBtn.addEventListener("click", () => {
      createOverlay.classList.remove("hidden");
    });
  }

  /* -------------------------
     VALIDATION CRÉATION PROFIL
  -------------------------- */

  if (validateCreateBtn) {
    validateCreateBtn.addEventListener("click", async () => {
      const username = document.getElementById("new-username").value.trim();
      const age = document.getElementById("new-age").value;
      const height = document.getElementById("new-height").value;
      const password = document.getElementById("new-password").value;
      const confirmPassword = document.getElementById("confirm-password").value;
      const gender = document.querySelector("input[name='gender']:checked")?.value;

      if (!username || !age || !height || !password || !confirmPassword || !gender) {
        showToast("Tous les champs sont obligatoires", "error");
        return;
      }

      if (password !== confirmPassword) {
        showToast("Les mots de passe ne correspondent pas", "error");
        return;
      }

      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            gender,
            age,
            height
          })
        });

        if (!res.ok) {
          const err = await res.json();
          showToast(err.detail || "Erreur création profil", "error");
          return;
        }

        showToast("Profil créé", "success");

        createOverlay.classList.add("hidden");
        loadProfiles();

      } catch (err) {
        showToast("Erreur réseau", "error");
        console.error(err);
      }
    });
  }

  /* -------------------------
     🔐 CONNEXION (FORMULAIRE → touche OK)
  -------------------------- */

  async function doLogin() {
    const password = passwordInput.value;

    if (!selectedUser || !password) {
      showToast("Mot de passe requis", "error");
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
        showToast("Identifiants incorrects", "error");
        return;
      }

      window.location.href = `/dashboard?user=${selectedUser}`;

    } catch (err) {
      showToast("Erreur réseau", "error");
      console.error(err);
    }
  }

  // ✅ Bouton Connexion
  if (loginBtn) {
    loginBtn.addEventListener("click", doLogin);
  }

  // ✅ Touche OK / Entrée du clavier mobile
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      doLogin();
    });
  }

  /* -------------------------
     👁️ VOIR PROFIL
  -------------------------- */

  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      if (!selectedUser) return;
      window.location.href = `/dashboard?user=${selectedUser}`;
    });
  }

  /* -------------------------
     FERMETURE DES MODALES
  -------------------------- */

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  createOverlay.addEventListener("click", (e) => {
    if (e.target === createOverlay) {
      createOverlay.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      createOverlay.classList.add("hidden");
    }
  });
});


// =======================
// BACKGROUND STARS EFFECT
// =======================

const canvas = document.getElementById("stars-canvas");
const ctx = canvas.getContext("2d");

let stars = [];
const STAR_COUNT = 120;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function createStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.3 + 0.1,
      alpha: Math.random()
    });
  }
}
createStars();

function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  stars.forEach(star => {
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
    ctx.fill();
  });

  requestAnimationFrame(animateStars);
}

animateStars();
