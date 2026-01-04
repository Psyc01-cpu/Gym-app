document.querySelectorAll(".profile-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    alert("Profil sélectionné : " + btn.innerText);
  });
});
