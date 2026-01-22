// =======================
// TOAST
// =======================
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// =======================
// APP (LOGIN)
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  const passwordInput = document.getElementById("password");

  const loginBtn = document.getElementById("login-btn");
  const viewBtn = document.getElementById("view-btn");
  const createProfileBtn = document.getElementById("create-profile-btn");

  const profilesContainer = document.getElementById("users-list");
  const loginForm = document.getElementById("login-form");

  // Modale création
  const createOverlay = document.getElementById("create-overlay");
  const validateCreateBtn = document.getElementById("validate-create-btn");

  // Password toggle (création)
  const togglePasswordBtn = document.getElementById("toggle-password");
  const pwdInput = document.getElementById("new-password");

  if (togglePasswordBtn && pwdInput) {
    togglePasswordBtn.addEventListener("click", () => {
      const isPassword = pwdInput.type === "password";
      pwdInput.type = isPassword ? "text" : "password";
      togglePasswordBtn.textContent = isPassword ? "Masquer" : "Afficher";
      togglePasswordBtn.setAttribute(
        "aria-label",
        isPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
      );
    });
  }

  if (!overlay || !profilesContainer || !createOverlay) {
    console.error("Éléments DOM manquants (modal-overlay / users-list / create-overlay)");
    return;
  }

  let selectedUser = null; // { user_id, username, rank, score, tier, ... }

  // -------------------------
  // MODALE PROFIL (LOGIN)
  // -------------------------
  function openModal(user) {
    selectedUser = user;

    modalTitle.textContent = `Profil – ${user.username}`;
    passwordInput.value = "";

    // IMPORTANT: donne à profile.js un endroit fiable pour récupérer l’utilisateur
    overlay.dataset.userId = user.user_id ?? user.id ?? "";
    overlay.dataset.username = user.username ?? "";

    overlay.classList.remove("hidden");
    document.body.classList.add("modal-open");

    // autofocus mobile
    setTimeout(() => passwordInput.focus(), 150);
  }

  function closeModal() {
    overlay.classList.add("hidden");
    document.body.classList.remove("modal-open");
    selectedUser = null;

    // Nettoyage dataset (optionnel mais propre)
    overlay.dataset.userId = "";
    overlay.dataset.username = "";
  }

  // -------------------------
  // MODALE CRÉATION
  // -------------------------
  function openCreate() {
    createOverlay.classList.remove("hidden");
    document.body.classList.add("modal-open");
  }

  function closeCreate() {
    createOverlay.classList.add("hidden");
    document.body.classList.remove("modal-open");
  }

  // -------------------------
  // RENDER PROFILS
  // -------------------------
  function escapeHtml(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function buildProfileCard(user) {
    const rank = user.rank ?? "–";
    const score = user.score ?? 0;
    const tier = user.tier ?? "Unranked";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "profile-card";

    // Stockage JSON (safe)
    btn.dataset.user = JSON.stringify(user);

    // IMPORTANT pour profile.js (sélection par data-*)
    btn.dataset.userId = user.user_id ?? user.id ?? "";
    btn.dataset.username = user.username ?? "";

    btn.innerHTML = `
      <div class="profile-left">
        <div class="profile-name">${escapeHtml(user.username)}</div>
        <div class="profile-meta">#${escapeHtml(rank)} • ${escapeHtml(score)} pts</div>
      </div>
      <div class="profile-right">
        <span class="tier-badge">${escapeHtml(tier)}</span>
      </div>
    `;

    return btn;
  }

  // -------------------------
  // CHARGEMENT DES PROFILS
  // -------------------------
  async function loadProfiles() {
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (!res.ok) throw new Error("/api/users not ok");

      const users = await res.json();
      if (!Array.isArray(users)) throw new Error("users not array");

      profilesContainer.innerHTML = "";

      if (users.length === 0) {
        const empty = document.createElement("div");
        empty.className = "profiles-empty";
        empty.textContent = "Aucun profil";
        profilesContainer.appendChild(empty);
        return;
      }

      users.forEach((user) => {
        profilesContainer.appendChild(buildProfileCard(user));
      });
    } catch (err) {
      console.error("Erreur chargement profils", err);
      profilesContainer.innerHTML = `<div class="profiles-empty">Erreur de chargement</div>`;
    }
  }

  loadProfiles();

  // -------------------------
  // CLIC SUR PROFIL
  // -------------------------
  profilesContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".profile-card");
    if (!btn) return;

    // visuel sélection (optionnel)
    document.querySelectorAll(".profile-card.selected").forEach(x => x.classList.remove("selected"));
    btn.classList.add("selected");

    try {
      const user = JSON.parse(btn.dataset.user);
      openModal(user);
    } catch (err) {
      console.error("Profil invalide", err);
    }
  });

  // -------------------------
  // OUVRIR MODALE CRÉATION
  // -------------------------
  if (createProfileBtn) {
    createProfileBtn.addEventListener("click", openCreate);
  }

  // -------------------------
  // VALIDATION CRÉATION PROFIL
  // -------------------------
  if (validateCreateBtn) {
    validateCreateBtn.addEventListener("click", async () => {
      const username = document.getElementById("new-username")?.value.trim();
      const age = document.getElementById("new-age")?.value;
      const height = document.getElementById("new-height")?.value;
      const password = document.getElementById("new-password")?.value;
      const confirmPassword = document.getElementById("confirm-password")?.value;
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
            height,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || "Erreur création profil", "error");
          return;
        }

        showToast("Profil créé", "success");
        closeCreate();
        loadProfiles();
      } catch (err) {
        showToast("Erreur réseau", "error");
        console.error(err);
      }
    });
  }

  // -------------------------
  // CONNEXION
  // -------------------------
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
          username: selectedUser.username,
          password,
        }),
      });

      if (!res.ok) {
        showToast("Identifiants incorrects", "error");
        return;
      }

      const url =
        `/dashboard?user=${encodeURIComponent(selectedUser.username)}` +
        `&user_id=${encodeURIComponent(selectedUser.user_id)}`;

      window.location.href = url;
    } catch (err) {
      showToast("Erreur réseau", "error");
      console.error(err);
    }
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      doLogin();
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      doLogin();
    });
  }

  // -------------------------
  // VOIR PROFIL
  // -------------------------
  // IMPORTANT : on ne met PAS de handler ici.
  // C’est profile.js qui gère #view-btn (ouverture + chargement).
  // On garde seulement une sécurité: si aucun profil sélectionné.
  if (viewBtn) {
    viewBtn.addEventListener("click", () => {
      if (!selectedUser) {
        showToast("Sélectionne un profil", "error");
      }
      // ne rien faire d’autre : profile.js prend la suite
    });
  }

  // -------------------------
  // FERMETURE DES MODALES
  // -------------------------
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  createOverlay.addEventListener("click", (e) => {
    if (e.target === createOverlay) closeCreate();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!overlay.classList.contains("hidden")) closeModal();
      if (!createOverlay.classList.contains("hidden")) closeCreate();
    }
  });
});

// =======================
// BACKGROUND STARS EFFECT
// =======================
(function initStars() {
  const canvas = document.getElementById("stars-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

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
        alpha: Math.random(),
      });
    }
  }

  createStars();

  function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const star of stars) {
      star.y += star.speed;
      if (star.y > canvas.height) {
        star.y = 0;
        star.x = Math.random() * canvas.width;
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(animateStars);
  }

  animateStars();
})();
