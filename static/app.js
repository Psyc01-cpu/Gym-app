document.addEventListener("DOMContentLoaded", () => {

  const modal = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("close-btn");

  // 🔍 DEBUG
  console.log("Modal:", modal);
  console.log("Close button:", closeBtn);

  // 🔒 Sécurité : si ça manque, on stop
  if (!modal || !closeBtn) {
    console.error("Éléments modale manquants");
    return;
  }

  // 🔒 AU CHARGEMENT → MODALE FERMÉE
  modal.classList.add("hidden");

  // ❌ FERMER LA MODALE
  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    console.log("Modale fermée");
  });

});
