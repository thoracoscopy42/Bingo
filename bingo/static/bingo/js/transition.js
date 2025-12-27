(() => {
  // === CONFIG ===
  const CFG = {
    SFX_SRC: "/static/bingo/sfx/intoraffle.mp3",
    FADE_MS: 12670,

    DROP_IMG_MS: 3000,
    DROP_IMG_SRC: "/static/bingo/images/absolutne.jpg",
    DROP_AT_MS: 1000 * 15,

    SFX_VOL: 0.15,
    FALLBACK_NAV_MS: 25000,
  };

  // tylko na /game/
  if (!String(location.pathname || "").includes("game")) return;

  // --- GLOBAL MUTE ---
  function hardMuteAllMedia() {
    // 1) wycisz wszystko co już istnieje
    document.querySelectorAll("audio, video").forEach((m) => {
      try {
        if (m.dataset.prevVolume == null) m.dataset.prevVolume = String(m.volume ?? 1);
        m.muted = true;
        m.volume = 0;
        m.pause?.(); // jeśli nie chcesz pause, usuń tę linię
      } catch {}
    });

    // 2) patch na przyszłe "new Audio()" (i każde .play())
    if (!window.__mutePatchInstalled) {
      window.__mutePatchInstalled = true;

      const origPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        try {
          // WYJĄTEK: jeśli element ma allowSound=1, nie wyciszamy go
          if (this?.dataset?.allowSound === "1") {
            // nic
          } else {
            this.muted = true;
            this.volume = 0;
          }
        } catch {}
        return origPlay.apply(this, arguments);
      };
    }
  }

  function ensureOverlay() {
    let ov = document.getElementById("transition-ov");
    if (ov) return ov;

    ov = document.createElement("div");
    ov.id = "transition-ov";
    ov.style.position = "fixed";
    ov.style.inset = "0";
    ov.style.background = "black";
    ov.style.opacity = "0";
    ov.style.pointerEvents = "none";
    ov.style.zIndex = "2147483644";
    ov.style.transition = `opacity ${CFG.FADE_MS}ms ease`;
    document.body.appendChild(ov);
    return ov;
  }

  function ensureDropImg() {
    let img = document.getElementById("transition-drop-img");
    if (img) return img;

    img = document.createElement("img");
    img.id = "transition-drop-img";
    img.src = CFG.DROP_IMG_SRC;
    img.alt = "drop";
    img.style.position = "fixed";
    img.style.inset = "0";
    img.style.margin = "auto";
    img.style.maxWidth = "72vw";
    img.style.maxHeight = "72vh";
    img.style.opacity = "0";
    img.style.transform = "scale(0.98)";
    img.style.transition = "opacity 140ms ease, transform 140ms ease";
    img.style.pointerEvents = "none";
    img.style.zIndex = "2147483645";
    document.body.appendChild(img);
    return img;
  }

  function fadeOutEverything() {
    const ov = ensureOverlay();
    ov.style.pointerEvents = "auto";
    requestAnimationFrame(() => {
      ov.style.opacity = "1";
    });
  }

  function showDrop() {
    const img = ensureDropImg();
    img.style.opacity = "1";
    img.style.transform = "scale(1)";
    setTimeout(() => {
      img.style.opacity = "0";
      img.style.transform = "scale(0.98)";
    }, CFG.DROP_IMG_MS);
  }

  async function playSfx() {
    const a = new Audio(CFG.SFX_SRC);
    a.preload = "auto";

    // !!! WAŻNE: oznaczamy jako "wyjątek" od global mute patcha
    a.dataset.allowSound = "1";
    a.muted = false;

    a.volume = Math.max(0, Math.min(1, Number(CFG.SFX_VOL) || 1));

    await a.play(); // wywołane po kliknięciu, więc autoplay powinno przejść
    return a;
  }

  function findRaffleLink(el) {
    const a = el?.closest?.("a.btn.btn--secondary");
    if (!a) return null;
    const href = a.getAttribute("href") || "";
    if (!href.includes("raffle")) return null;
    return a;
  }

  let locked = false;

  document.addEventListener(
    "click",
    async (e) => {
      const a = findRaffleLink(e.target);
      if (!a) return;

      if (locked) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      locked = true;

      e.preventDefault();
      e.stopPropagation();

      const targetHref = a.href;

      // 1) NAJPIERW wycisz wszystko inne
      hardMuteAllMedia();

      // 2) fade do czerni
      fadeOutEverything();

      // 3) fallback na wypadek jak audio nie ruszy / nie ma ended
      let navDone = false;
      const fallbackTimer = setTimeout(() => {
        if (navDone) return;
        navDone = true;
        location.href = targetHref;
      }, CFG.FALLBACK_NAV_MS);

      try {
        const audio = await playSfx();

        // drop obrazka w określonym momencie
        setTimeout(() => {
          if (navDone) return;
          showDrop();
        }, CFG.DROP_AT_MS);

        // przejście po zakończeniu audio
        audio.addEventListener("ended", () => {
          if (navDone) return;
          navDone = true;
          clearTimeout(fallbackTimer);
          location.href = targetHref;
        });
      } catch {
        // jak audio nie ruszy, fallback zrobi robotę
      }
    },
    true
  );
})();
