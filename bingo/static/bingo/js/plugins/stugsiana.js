(() => {
  // ===== config =====
  const CFG = {
    STORAGE_KEY: "bingo_stugsiana_cat_gate_v1",

    TITLE: "Proszę kliknąć na grzeczną kicie",
    SUBTITLE: "MEOOOOOOOOOOOOOOOOOOOOOOW 🐱🐱🐱",

    // Obrazki do pop-upa
    IMG_1: "/static/bingo/images/stugsiana/kicia.png",
    IMG_2: "/static/bingo/images/stugsiana/kicia2.png",

    // ===== audio (loop) =====
    LOOP_AUDIO_SRC: "/static/bingo/sfx/stugsiana/mango67.mp3",
    LOOP_AUDIO_VOLUME: 0.18, // (0.0 - 1.0)

    // ===== bouncing logo =====
    BOUNCE_LOGO_SRC: "/static/bingo/images/stugsiana/wzwod.jpg",
    BOUNCE_LOGO_SIZE: 167,
    BOUNCE_LOGO_OPACITY: 0.50,
    BOUNCE_LOGO_MAX: 5,

    // ===== SLIDE CAT =====
    SLIDE_CAT_SRC: "/static/bingo/images/stugsiana/kot.png",
    SLIDE_CAT_SOUND: "/static/bingo/sfx/stugsiana/meow.mp3",
    SLIDE_CAT_INTERVAL: 45000,
    SLIDE_CAT_VOLUME: 0.50,

    // loop ducking podczas miauknięcia
    SLIDE_DUCK_FACTOR: 0.15, // 15% głośności w tle podczas SFX

    // popup na każdym wejściu
    ALWAYS_SHOW: true,
  };

  const LOGO_COUNT_KEY = "bingo_stugsiana_logo_count_v1";

  // ===== runtime state =====
  let slideCatPlaying = false;

  // WebAudio cache dla miauknięcia
  let slideAudioCtx = null;
  let slideAudioBuf = null;
  let slideAudioLoading = null;

  function whenRuntime(fn) {
    if (window.BingoPluginRuntime?.initUserPlugin) return fn();
    const t = setInterval(() => {
      if (window.BingoPluginRuntime?.initUserPlugin) {
        clearInterval(t);
        fn();
      }
    }, 40);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(CFG.STORAGE_KEY);
      return raw ? JSON.parse(raw) : { passed: false };
    } catch {
      return { passed: false };
    }
  }

  function saveState(state) {
    try { localStorage.setItem(CFG.STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function preload(url) {
    try { const img = new Image(); img.src = url; } catch {}
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  // ===== WebAudio: unlock + decode ONCE (musi być wywołane po kliknięciu usera) =====
  function unlockSlideAudio() {
    if (!slideAudioCtx) {
      slideAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Chrome potrafi usypiać context — wznawiamy zawsze
    slideAudioCtx.resume().catch(() => {});

    if (!slideAudioLoading) {
      slideAudioLoading = fetch(CFG.SLIDE_CAT_SOUND)
        .then(r => r.arrayBuffer())
        .then(buf => new Promise((resolve, reject) => {
          // Safari/Chrome różnie: wersja callback jest najbardziej kompatybilna
          slideAudioCtx.decodeAudioData(buf, resolve, reject);
        }))
        .then(decoded => {
          slideAudioBuf = decoded;
          return decoded;
        })
        .catch(() => {
          slideAudioBuf = null;
        });
    }
    return slideAudioLoading;
  }

  // ===== BOUNCER ENGINE =====
  function createBouncerLayer(ctx) {
    const layer = document.createElement("div");
    layer.id = "stu-bounce-layer";
    layer.style.position = "fixed";
    layer.style.inset = "0";
    layer.style.zIndex = "2";
    layer.style.pointerEvents = "none";
    layer.style.overflow = "hidden";
    document.body.appendChild(layer);

    const items = [];
    let raf = 0;

    function spawn() {
      if (items.length >= CFG.BOUNCE_LOGO_MAX) return;

      const el = document.createElement("img");
      el.src = CFG.BOUNCE_LOGO_SRC;
      el.alt = "logo";
      el.style.position = "absolute";
      el.style.width = CFG.BOUNCE_LOGO_SIZE + "px";
      el.style.height = CFG.BOUNCE_LOGO_SIZE + "px";
      el.style.opacity = String(CFG.BOUNCE_LOGO_OPACITY);
      el.style.userSelect = "none";
      el.style.webkitUserSelect = "none";
      el.style.transform = "translate3d(0,0,0)";
      el.draggable = false;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const size = CFG.BOUNCE_LOGO_SIZE;

      const obj = {
        el,
        x: Math.random() * Math.max(1, (w - size)),
        y: Math.random() * Math.max(1, (h - size)),
        vx: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.8),
        vy: (Math.random() < 0.5 ? -1 : 1) * (1.0 + Math.random() * 1.6),
        size
      };

      layer.appendChild(el);
      items.push(obj);
    }

    function tick() {
      const w = window.innerWidth;
      const h = window.innerHeight;

      for (const it of items) {
        it.x += it.vx;
        it.y += it.vy;

        if (it.x <= 0) { it.x = 0; it.vx *= -1; }
        if (it.y <= 0) { it.y = 0; it.vy *= -1; }
        if (it.x >= w - it.size) { it.x = w - it.size; it.vx *= -1; }
        if (it.y >= h - it.size) { it.y = h - it.size; it.vy *= -1; }

        it.el.style.transform = `translate3d(${it.x}px, ${it.y}px, 0)`;
      }

      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
    function destroy() {
      stop();
      for (const it of items) {
        try { it.el.remove(); } catch {}
      }
      items.length = 0;
      try { layer.remove(); } catch {}
    }

    return { spawn, start, stop, destroy, layer };
  }

  // ===== AUDIO (loop, volume) =====
  function createLoopAudio() {
    const audio = new Audio();
    audio.src = CFG.LOOP_AUDIO_SRC;
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = clamp(Number(CFG.LOOP_AUDIO_VOLUME || 0.2), 0, 1);
    return audio;
  }

  // ===== DETECT "cell filled" =====
  function attachCellWatcher(ctx, onFirstFill) {
    const known = new Map();

    function isField(el) {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea";
    }

    function nonEmptyValue(el) {
      const v = (el.value ?? "").toString().trim();
      return v.length > 0;
    }

    function handle(el) {
      if (!isField(el)) return;

      const now = nonEmptyValue(el);
      const prev = known.has(el) ? known.get(el) : nonEmptyValue(el);
      known.set(el, now);

      if (!prev && now) onFirstFill();
    }

    ctx.setTimeoutSafe(() => {
      const fields = document.querySelectorAll("input, textarea");
      fields.forEach(f => known.set(f, nonEmptyValue(f)));
    }, 200);

    ctx.on(document, "input", (e) => handle(e.target));
    ctx.on(document, "change", (e) => handle(e.target));
    ctx.on(document, "blur", (e) => handle(e.target), true);
  }

  // ===== SLIDE CAT (WebAudio + ducking loop) =====
  function createSlideCat(ctx, getLoopAudio) {
    let showing = false;

    const el = document.createElement("img");
    el.src = CFG.SLIDE_CAT_SRC;
    el.alt = "grzeczna kicia";
    el.style.position = "fixed";
    el.style.bottom = "0";
    el.style.top = "0";
    el.style.height = "100vh";
    el.style.objectFit = "contain";
    el.style.zIndex = "3";
    el.style.pointerEvents = "none";
    el.style.transition = "transform 1.6s ease-in-out";
    el.style.transform = "translateX(0)";
    el.style.willChange = "transform";
    el.style.display = "none";
    document.body.appendChild(el);

    function cleanup() {
      showing = false;
      slideCatPlaying = false;
    }

    async function show() {
      if (showing) return;
      showing = true;
      slideCatPlaying = true;

      const fromLeft = Math.random() < 0.5;

      el.style.display = "block";
      el.style.left = fromLeft ? "0" : "auto";
      el.style.right = fromLeft ? "auto" : "0";

      // start poza ekranem
      el.style.transform = `translateX(${fromLeft ? "-100%" : "100%"})`;
      el.getBoundingClientRect();

      // wjazd
      el.style.transform = "translateX(0)";

      // ducking loop
      const loop = typeof getLoopAudio === "function" ? getLoopAudio() : null;
      const prevVol = loop ? loop.volume : null;
      if (loop && typeof prevVol === "number") {
        loop.volume = Math.max(0, prevVol * CFG.SLIDE_DUCK_FACTOR);
      }

      // WebAudio play (buffer)
      try {
        await unlockSlideAudio(); // jeśli ctx usnął albo buffer niegotowy
        if (!slideAudioCtx || !slideAudioBuf) throw new Error("audio not ready");
        await slideAudioCtx.resume().catch(() => {});

        const src = slideAudioCtx.createBufferSource();
        const gain = slideAudioCtx.createGain();
        gain.gain.value = CFG.SLIDE_CAT_VOLUME;

        src.buffer = slideAudioBuf;
        src.connect(gain).connect(slideAudioCtx.destination);

        src.onended = () => {
          // przywróć loop volume
          if (loop && typeof prevVol === "number") loop.volume = prevVol;

          // wyjazd dopiero po pełnym dźwięku
          el.style.transform = `translateX(${fromLeft ? "-100%" : "100%"})`;
          ctx.setTimeoutSafe(() => {
            el.style.display = "none";
            cleanup();
          }, 1800);
        };

        src.start(0);
      } catch {
        // fallback: jakby WebAudio padło, nie zawieszaj kota
        if (loop && typeof prevVol === "number") loop.volume = prevVol;

        el.style.transform = `translateX(${fromLeft ? "-100%" : "100%"})`;
        ctx.setTimeoutSafe(() => {
          el.style.display = "none";
          cleanup();
        }, 1800);
      }
    }

    return { show, destroy: () => { try { el.remove(); } catch {} } };
  }

  whenRuntime(() => {
    window.BingoUserPlugin = {
      init(api) {
        const { ctx } = api;

        const root = document.getElementById("plugin-root");
        if (!root) return;
        if (!location.pathname.includes("game")) return;

        preload(CFG.IMG_1);
        preload(CFG.IMG_2);
        preload(CFG.BOUNCE_LOGO_SRC);
        preload(CFG.SLIDE_CAT_SRC);

        // ===== styles =====
        const style = document.createElement("style");
        style.textContent = `
#plugin-root { position: relative; z-index: 2147483000; }

.stu-overlay{
  position: fixed; inset: 0;
  z-index: 2147483646;
  pointer-events: auto;
  background: rgba(0,0,0,.78);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: start center;
  padding: 22px;
  overflow: auto;
}

.stu-modal{
  width: min(720px, 94vw);
  border-radius: 18px;
  background: rgba(18,18,18,.96);
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: 0 28px 90px rgba(0,0,0,.6);
  padding: 18px 18px 16px;
  color: #fff;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
  margin-top: 18px;
  outline: none;
}

.stu-title{ font-size: 18px; font-weight: 800; margin: 0 0 6px; }
.stu-sub{ font-size: 13px; opacity: .85; margin: 0 0 14px; line-height: 1.35; }

.stu-grid{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.stu-card{
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
  padding: 10px;
  cursor: pointer;
  user-select: none;
  transition: transform .12s ease, background .12s ease;
}

.stu-card:hover{ transform: translateY(-2px); background: rgba(255,255,255,.09); }

.stu-imgwrap{
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255,255,255,.05);
  display:flex;
  align-items:center;
  justify-content:center;
}

.stu-img{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display:block;
}

.stu-hint{
  margin-top: 12px;
  font-size: 12px;
  opacity: .8;
}
        `;
        document.head.appendChild(style);

        // ===== audio + bouncer =====
        const loopAudio = createLoopAudio();
        const bouncers = createBouncerLayer(ctx);

        const gateState = loadState();
        const savedCount = gateState.passed
          ? Number(localStorage.getItem(LOGO_COUNT_KEY) || 0)
          : 0;

        for (let i = 0; i < savedCount; i++) bouncers.spawn();
        bouncers.start();

        // spawn kolejnego logo co 2 wypełnienia
        let filledCounter = 0;
        attachCellWatcher(ctx, () => {
          filledCounter += 1;
          if (filledCounter % 2 === 0) bouncers.spawn();
        });

        // slide cat
        const slideCat = createSlideCat(ctx, () => loopAudio);
        let slideTimer = null;

        // popup
        let overlay = null;

        function closeOverlay() {
          if (overlay && overlay.parentElement) {
            try { overlay.remove(); } catch {}
          }
          overlay = null;
        }

        async function startLoopAudioSafe() {
          try {
            loopAudio.currentTime = 0;
            loopAudio.volume = clamp(Number(CFG.LOOP_AUDIO_VOLUME || 0.2), 0, 1);
            await loopAudio.play();
          } catch {}
        }

        function pass() {
          // MUSI być po kliknięciu usera
          unlockSlideAudio();

          saveState({ passed: true });
          closeOverlay();
          startLoopAudioSafe();

          if (!slideTimer) {
            slideTimer = ctx.setIntervalSafe(() => {
              slideCat.show();
            }, CFG.SLIDE_CAT_INTERVAL);
          }
        }

        function openOverlay() {
          if (slideCatPlaying) return;
          if (document.getElementById("stu-overlay")) return;

          overlay = document.createElement("div");
          overlay.className = "stu-overlay";
          overlay.id = "stu-overlay";
          overlay.setAttribute("role", "dialog");
          overlay.setAttribute("aria-modal", "true");

          const modal = document.createElement("div");
          modal.className = "stu-modal";
          modal.tabIndex = -1;

          const h = document.createElement("h2");
          h.className = "stu-title";
          h.textContent = CFG.TITLE;

          const s = document.createElement("p");
          s.className = "stu-sub";
          s.textContent = CFG.SUBTITLE;

          const grid = document.createElement("div");
          grid.className = "stu-grid";

          function mkCard(imgUrl, alt) {
            const card = document.createElement("div");
            card.className = "stu-card";
            card.tabIndex = 0;

            const wrap = document.createElement("div");
            wrap.className = "stu-imgwrap";

            const img = document.createElement("img");
            img.className = "stu-img";
            img.src = imgUrl;
            img.alt = alt || "kicia";

            wrap.appendChild(img);
            card.appendChild(wrap);

            ctx.on(card, "click", (e) => {
              e.preventDefault(); e.stopPropagation();
              pass();
            });
            ctx.on(card, "keydown", (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault(); e.stopPropagation();
                pass();
              }
            });

            return card;
          }

          grid.appendChild(mkCard(CFG.IMG_1, "kicia 1"));
          grid.appendChild(mkCard(CFG.IMG_2, "kicia 2"));

          const hint = document.createElement("div");
          hint.className = "stu-hint";
          hint.textContent = "Hmmm która kicia jest grzeczniejsza...?";

          modal.appendChild(h);
          modal.appendChild(s);
          modal.appendChild(grid);
          modal.appendChild(hint);

          overlay.appendChild(modal);
          root.appendChild(overlay);

          ctx.on(overlay, "pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); });
          ctx.on(overlay, "click", (e) => { e.preventDefault(); e.stopPropagation(); });

          ctx.setTimeoutSafe(() => { try { modal.focus(); } catch {} }, 30);
        }

        // start popup + obsługa BFCache / focus
        ctx.setTimeoutSafe(() => openOverlay(), 80);
        ctx.on(window, "pageshow", () => openOverlay());
        ctx.on(document, "visibilitychange", () => {
          if (document.visibilityState === "visible") openOverlay();
        });

        return () => {
          try { closeOverlay(); } catch {}
          try { style.remove(); } catch {}
          try { bouncers.destroy(); } catch {}
          try { loopAudio.pause(); } catch {}
          try { ctx.clearIntervalSafe(slideTimer); } catch {}
          try { slideCat.destroy?.(); } catch {}
        };
      }
    };
  });
})();
