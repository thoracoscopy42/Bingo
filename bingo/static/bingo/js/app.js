// Added helpers

(() => {
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  let toastTimer = null;

  function showToast(message, type = "success", duration = 2200) {
    const el = document.getElementById("toast");
    if (!el) return;

    el.textContent = message;
    el.classList.remove("toast--success", "toast--error", "toast--show");
    el.classList.add(type === "error" ? "toast--error" : "toast--success");

    if (toastTimer) clearTimeout(toastTimer);

    requestAnimationFrame(() => el.classList.add("toast--show"));

    toastTimer = setTimeout(() => {
      el.classList.remove("toast--show");
    }, duration);
  }

  // globalny namespace dla innych plików
  window.Bingo = window.Bingo || {};
  window.Bingo.getCookie = getCookie;
  window.Bingo.showToast = showToast;
})();
