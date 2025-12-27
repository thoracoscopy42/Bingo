(() => {
  const CFG = {
    SFX_SRC: "/static/bingo/sfx/intoraffle.mp3",
    FADE_MS: 12670,

    DROP_IMG_MS: 3000,
    DROP_IMG_SRC: "/static/bingo/images/absolutne.jpg",
    DROP_AT_MS: 1000 * 15,

    SFX_VOL: 0.15,
    FALLBACK_NAV_MS: 25000,
  };

  if (!String(location.pathname || "").includes("game")) return;

  // ---------------------------
  // WEB AUDIO GLOBAL MUTE BUS
  // ---------------------------
  const WebAudioBus = (() => {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return { setMuted() {} };

    const contexts = new Set();         // trzymamy referencje do contextów
    const masterByCtx = new WeakMap();  // ctx -> masterGain
    let installed = false;
    let globallyMuted = false;

    function ensureMaster(ctx) {
      let g = masterByCtx.get(ctx);
      if (g) return g;

      g = ctx.createGain();
      g.gain.value = globallyMuted ? 0 : 1;

      // master -> destination
      const origConnect = AudioNode.prototype.connect;
      origConnect.call(g, ctx.destination);

      masterByCtx.set(ctx, g);
      contexts.add(ctx);
      return g;
    }

    function install() {
      if (installed) return;
      installed = true;

      // 1) patch AudioContext constructor (żeby łapać nowe contexty)
      // Nie da się łatwo "podmienić" klasy w 100% bez ryzyk,
      // więc robimy: patch na connect + rejestracja na resume/create.
      // Najważniejsze: patch connect() działa, jeśli transition.js ładuje się PRZED pluginami.

      // 2) patch connect() - przekieruj destination -> masterGain
      const origConnect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (destination, ...rest) {
        try {
          const ctx = this.context;
          if (ctx && destination === ctx.destination) {
            const master = ensureMaster(ctx);
            return origConnect.call(this, master, ...rest);
          }
        } catch {}
        return origConnect.call(this, destination, ...rest);
      };

      // 3) patch resume() żeby masterGain zawsze istniał
      const origResume = Ctx.prototype.resume;
      if (origResume) {
        Ctx.prototype.resume = function (...args) {
          try { ensureMaster(this); } catch {}
          return origResume.apply(this, args);
        };
      }

      // 4) patch createBufferSource/createOscillator (żeby "dotknąć" ctx i zarejestrować)
      const wrapFactory = (name) => {
        const orig = Ctx.prototype[name];
        if (!orig) return;
        Ctx.prototype[name] = function (...args) {
          try { ensureMaster(this); } catch {}
          return orig.apply(this, args);
        };
      };
      wrapFactory("createBufferSource");
      wrapFactory("createOscillator");
      wrapFactory("createMediaElementSource");
      wrapFactory("createMediaStreamSource");
      wrapFactory("createGain");
    }

    function setMuted(muted) {
      globallyMuted = !!muted;
      for (const ctx of contexts) {
        try {
          const master = ensureMaster(ctx);
          master.gain.value = globallyMuted ? 0 : 1;
        } catch {}
      }
    }

    install();
    return { setMuted };
  })();

  // ---------------------------
  // HTML MEDIA MUTE
  // ---------------------------
  function hardMuteAllMedia() {
    // wycisz istniejące audio/video
    document.querySelectorAll("audio, video").forEach((m) => {
      try {
        if (m.dataset.prevVolume == null) m.dataset.prevVolume = String(m.volume ?? 1);
        m.muted = true;
        m.volume = 0;
        m.pause?.();
      } catch {}
    });

    // patch na przyszłe new Audio()
    if (!window.__mutePatchInstalled) {
      window.__mutePatchInstalled = true;
      const origPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        try {
          if (this?.dataset?.allowSound === "1") {
            // to jest nasz transition track
          } else {
            this.muted = true;
            this.volume = 0;
          }
        } catch {}
        return origPlay.apply(this, arguments);
      };
    }

    // I NAJWAŻNIEJSZE: WebAudio OFF
    WebAudioBus.setMuted(true);
  }

  // ---------------------------
  // UI overlay + drop
  // ---------------------------
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
    a.dataset.allowSound = "1";
    a.muted = false;
    a.volume = Math.max(0, Math.min(1, Number(CFG.SFX_VOL) || 1));
    await a.play();
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

      // 1) mute WSZYSTKO inne (HTML + WebAudio)
      hardMuteAllMedia();

      // 2) fade
      fadeOutEverything();

      // 3) fallback nav
      let navDone = false;
      const fallbackTimer = setTimeout(() => {
        if (navDone) return;
        navDone = true;
        location.href = targetHref;
      }, CFG.FALLBACK_NAV_MS);

      try {
        const audio = await playSfx();

        setTimeout(() => {
          if (navDone) return;
          showDrop();
        }, CFG.DROP_AT_MS);

        audio.addEventListener("ended", () => {
          if (navDone) return;
          navDone = true;
          clearTimeout(fallbackTimer);
          location.href = targetHref;
        });
      } catch {
        // fallback zrobi przejście
      }
    },
    true
  );
})();
