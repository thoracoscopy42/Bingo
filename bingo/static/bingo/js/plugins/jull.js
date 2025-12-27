(() => {
  const CFG = {
    BG_IMGS: [
      "/static/bingo/images/jull/bgkotek1.jpg",
      "/static/bingo/images/jull/bgkotek2.jpg",
      "/static/bingo/images/jull/bgkotek3.jpg",
    ],
    HAPPY_CAT: "/static/bingo/images/jull/happycat.jpg",
    SAD_CAT: "/static/bingo/images/jull/sadcat.jpg",

    // tło – układ
    ROWS: 6,
    TILE_H: 160,
    TILE_GAP: 14,
    SPEED_MIN: 18,
    SPEED_MAX: 36,
    BG_OPACITY: 0.20,         // << mniej agresywne tło

    // minigierka – tlen
    OXY_START: 0.65,
    OXY_DECAY_PER_SEC: 0.055,
    OXY_PUMP_ADD: 0.22,
    OXY_PUMP_CD_MS: 180,

    SAD_THRESHOLD: 0.30,
    FADE_MS: 280,

    // panel
    PANEL_W: 240,
    PANEL_H: 180,
    PANEL_MARGIN: 18,         // odstęp od krawędzi ekranu
    PANEL_SAFE_GAP: 10,       // minimalny dystans od elementów inputowych

    // ile prób "ucieczki" panelu w górę zanim odpuścimy
    AVOID_MAX_STEPS: 14,
  };

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function rand(min, max) { return min + Math.random() * (max - min); }

  function whenRuntime(fn) {
    if (window.BingoPluginRuntime?.initUserPlugin) return fn();
    const t = setInterval(() => {
      if (window.BingoPluginRuntime?.initUserPlugin) {
        clearInterval(t);
        fn();
      }
    }, 40);
  }

  function fillRow(track, rowW, tileW) {
    const need = Math.ceil((rowW * 2) / Math.max(1, tileW)) + 2;
    for (let i = 0; i < need; i++) {
      const img = document.createElement("img");
      img.src = pick(CFG.BG_IMGS);
      img.alt = "kotek";
      img.draggable = false;
      img.loading = "lazy";
      track.appendChild(img);
    }
  }

  function rectsOverlap(a, b) {
    return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
  }

  function expandedRect(r, pad) {
    return {
      left: r.left - pad,
      top: r.top - pad,
      right: r.right + pad,
      bottom: r.bottom + pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    };
  }

  whenRuntime(() => {
    window.BingoUserPlugin = {
      init(api) {
        if (window.__bingo_jull_cat_minigame_started) return;
        window.__bingo_jull_cat_minigame_started = true;

        const { ctx } = api;
        const root = document.getElementById("plugin-root");
        if (!root) return;

        // ===== style =====
        const style = document.createElement("style");
        style.textContent = `
/* U was #plugin-root jest globalnie fixed + z-index:9999, więc tu robimy:
   - tło kotków: bardzo subtelne, pointer-events none
   - panel gry: klikalny
   - podbijamy z-index głównego UI (panel/hero/page), żeby nie wyglądało jakby kotki były "nad" */
.jull-bgwrap{
  position: fixed;
  inset: 0;
  z-index: 1;                 /* poniżej UI, ale pamiętaj: #plugin-root jest 9999, więc i tak to "nad" body,
                                dlatego równoważymy to podbiciem UI (poniżej) */
  pointer-events: none;
  overflow: hidden;
}

.jull-bg{
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: repeat(${CFG.ROWS}, ${CFG.TILE_H}px);
  gap: ${CFG.TILE_GAP}px;
  padding: ${CFG.TILE_GAP}px;
  box-sizing: border-box;
  opacity: ${CFG.BG_OPACITY};
  pointer-events: none;
  filter: saturate(1.05) contrast(1.03);
}

.jull-row{
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background: rgba(255,255,255,.02);
  outline: 1px solid rgba(255,255,255,.06);
}

.jull-track{
  position: absolute;
  top: 0; left: 0;
  height: 100%;
  display: flex;
  gap: ${CFG.TILE_GAP}px;
  align-items: center;
  will-change: transform;
}

.jull-track img{
  height: 100%;
  width: auto;
  border-radius: 18px;
  object-fit: cover;
  user-select: none;
  pointer-events: none;
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
}

@keyframes jull-marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(calc(-50% - (${CFG.TILE_GAP}px / 2))); }
}

.jull-track.anim{
  animation: jull-marquee var(--jullDur, 26s) linear infinite;
}
.jull-track.reverse{ animation-direction: reverse; }

/* panel minigry */
.jull-panel{
  position: fixed;
  right: ${CFG.PANEL_MARGIN}px;
  bottom: ${CFG.PANEL_MARGIN}px;

  width: ${CFG.PANEL_W}px;
  height: ${CFG.PANEL_H}px;

  z-index: 10000;             /* trzyma się nad UI, ale nie blokuje poza swoim obszarem */
  pointer-events: auto;

  border-radius: 18px;
  background: rgba(0,0,0,.72);
  outline: 1px solid rgba(255,255,255,.14);
  box-shadow: 0 20px 60px rgba(0,0,0,.45);
  display: grid;
  grid-template-rows: 1fr auto auto auto;
  padding: 14px;
  box-sizing: border-box;
  gap: 10px;
}

.jull-catbox{
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,.04);
  outline: 1px solid rgba(255,255,255,.10);
}

.jull-catbox img{
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity ${CFG.FADE_MS}ms ease;
  user-select: none;
  pointer-events: none;
}

.jull-happy{ opacity: 1; }
.jull-sad{ opacity: 0; }

.jull-oxy{
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255,255,255,.12);
  outline: 1px solid rgba(255,255,255,.10);
}

.jull-oxy > div{
  height: 100%;
  width: 50%;
  border-radius: 999px;
  background: rgba(160, 255, 200, .92);
  transition: width 120ms linear, filter 120ms linear, opacity 120ms linear;
}

.jull-hint{
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
  font-size: 12px;
  color: rgba(255,255,255,.82);
  text-align: center;
  letter-spacing: .2px;
  user-select: none;
}

.jull-hint strong{ color: #fff; }

.jull-pumpbtn{
  border: 0;
  border-radius: 14px;
  padding: 10px 12px;
  font-weight: 900;
  cursor: pointer;
  background: rgba(255,255,255,.92);
  color: #111;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
}
.jull-pumpbtn:active{ transform: translateY(1px); }

/* delikatny "glass" na panelu strony, żeby kotki nie kłuły w oczy – tylko jeśli plugin-root jest nad wszystkim */
.jull-ui-raise{
  position: relative !important;
  z-index: 5000 !important;
}
`;
        document.head.appendChild(style);

        // ===== podbij UI nad tło (bez grzebania w globalnym css) =====
        // (wystarczy, że panel/hero/page będzie wyżej niż jull-bgwrap)
        const raised = [];
        function raiseUI() {
          const els = [
            document.querySelector(".page"),
            document.querySelector(".hero"),
            document.querySelector(".panel"),
            document.querySelector(".panel--wide"),
          ].filter(Boolean);

          els.forEach(el => {
            if (el.classList.contains("jull-ui-raise")) return;
            el.classList.add("jull-ui-raise");
            raised.push(el);
          });
        }
        raiseUI();

        // ===== DOM: tło =====
        const bgwrap = document.createElement("div");
        bgwrap.className = "jull-bgwrap";

        const bg = document.createElement("div");
        bg.className = "jull-bg";

        const rowEls = [];
        for (let r = 0; r < CFG.ROWS; r++) {
          const row = document.createElement("div");
          row.className = "jull-row";

          const track = document.createElement("div");
          track.className = "jull-track anim";
          if (r % 2 === 1) track.classList.add("reverse");
          track.style.setProperty("--jullDur", `${rand(CFG.SPEED_MIN, CFG.SPEED_MAX).toFixed(2)}s`);

          row.appendChild(track);
          bg.appendChild(row);
          rowEls.push({ track });
        }

        bgwrap.appendChild(bg);
        root.appendChild(bgwrap);

        // ===== DOM: panel =====
        const panel = document.createElement("div");
        panel.className = "jull-panel";

        const catbox = document.createElement("div");
        catbox.className = "jull-catbox";

        const happy = document.createElement("img");
        happy.className = "jull-happy";
        happy.src = CFG.HAPPY_CAT;
        happy.alt = "happy cat";
        happy.draggable = false;

        const sad = document.createElement("img");
        sad.className = "jull-sad";
        sad.src = CFG.SAD_CAT;
        sad.alt = "sad cat";
        sad.draggable = false;

        catbox.appendChild(happy);
        catbox.appendChild(sad);

        const oxy = document.createElement("div");
        oxy.className = "jull-oxy";
        const oxyFill = document.createElement("div");
        oxy.appendChild(oxyFill);

        const hint = document.createElement("div");
        hint.className = "jull-hint";
        hint.innerHTML = `Pompkuj tlen: <strong>klik</strong> / <strong>SPACJA</strong> / <strong>ENTER</strong>`;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "jull-pumpbtn";
        btn.textContent = "POMPUJ";
        btn.addEventListener("click", (e) => { e.preventDefault(); pump(); });

        panel.appendChild(catbox);
        panel.appendChild(oxy);
        panel.appendChild(hint);
        panel.appendChild(btn);
        root.appendChild(panel);

        // ===== layout fill (marquee) =====
        function layoutFill() {
          const rowW = (window.innerWidth || 1200);
          const tileW = (CFG.TILE_H * 1.35) + CFG.TILE_GAP;

          rowEls.forEach(({ track }) => {
            if (track.__filled) return;

            fillRow(track, rowW, tileW);

            const imgs = Array.from(track.querySelectorAll("img"));
            imgs.forEach(img => track.appendChild(img.cloneNode(true)));

            track.__filled = true;
          });
        }
        layoutFill();

        // ===== panel avoidance (żeby nie zasłaniać inputów) =====
        function avoidInputs() {
          // wszystko co faktycznie jest "do klikania/pisania"
          const blockers = Array.from(document.querySelectorAll(
            ".grid-table, .panel, .cell-wrapper, textarea.grid-cell, .cd__button, .cd__list"
          ));

          if (!blockers.length) return;

          // reset do domyślnej pozycji
          panel.style.right = `${CFG.PANEL_MARGIN}px`;
          panel.style.bottom = `${CFG.PANEL_MARGIN}px`;
          panel.style.top = "auto";
          panel.style.left = "auto";

          // iteracyjnie podnoś panel, aż przestanie nachodzić
          let steps = 0;
          while (steps < CFG.AVOID_MAX_STEPS) {
            const pr = expandedRect(panel.getBoundingClientRect(), CFG.PANEL_SAFE_GAP);

            let worst = null;
            for (const el of blockers) {
              const r = el.getBoundingClientRect();
              if (r.width <= 0 || r.height <= 0) continue;
              const rr = expandedRect(r, CFG.PANEL_SAFE_GAP);

              if (rectsOverlap(pr, rr)) {
                // ile musimy podnieść panel do góry, żeby nie nachodził
                const pushUp = pr.bottom - rr.top;
                if (!worst || pushUp > worst) worst = pushUp;
              }
            }

            if (!worst) break; // ok, nie nachodzi

            const curBottom = parseFloat(panel.style.bottom || `${CFG.PANEL_MARGIN}`) || CFG.PANEL_MARGIN;
            panel.style.bottom = `${curBottom + Math.ceil(worst) + 6}px`;
            steps++;
          }

          // nie pozwól uciec poza ekran
          const final = panel.getBoundingClientRect();
          if (final.top < 8) {
            panel.style.bottom = `${Math.max(CFG.PANEL_MARGIN, (window.innerHeight - final.height - 8))}px`;
          }
        }

        // odpal po renderze, i jeszcze raz po chwili (bo layout może się "doustawiać")
        requestAnimationFrame(() => {
          avoidInputs();
          setTimeout(avoidInputs, 300);
          setTimeout(avoidInputs, 900);
        });

        ctx.on(window, "resize", () => {
          layoutFill();
          avoidInputs();
        });

        // ===== minigame logic =====
        let oxyVal = clamp01(CFG.OXY_START);
        let lastPumpAt = 0;
        let lastTick = performance.now();
        let raf = null;

        function setMood() {
          const sadMode = oxyVal <= CFG.SAD_THRESHOLD;
          happy.style.opacity = sadMode ? "0" : "1";
          sad.style.opacity = sadMode ? "1" : "0";
        }

        function setOxyUI() {
          oxyFill.style.width = `${(oxyVal * 100).toFixed(1)}%`;
          const k = 1 - oxyVal;
          oxyFill.style.opacity = String(0.65 + (1 - k) * 0.35);
          oxyFill.style.filter = `saturate(${0.6 + oxyVal * 0.7})`;
        }

        function pump() {
          const t = performance.now();
          if (t - lastPumpAt < CFG.OXY_PUMP_CD_MS) return;
          lastPumpAt = t;

          oxyVal = clamp01(oxyVal + CFG.OXY_PUMP_ADD);
          setOxyUI();
          setMood();
        }

        function tick(t) {
          const dt = Math.max(0, (t - lastTick) / 1000);
          lastTick = t;

          oxyVal = clamp01(oxyVal - CFG.OXY_DECAY_PER_SEC * dt);
          setOxyUI();
          setMood();

          raf = requestAnimationFrame(tick);
        }

        setOxyUI();
        setMood();
        raf = requestAnimationFrame(tick);

        // input: panel click + klawiatura tylko gdy kursor nad panelem
        let armed = false;

        ctx.on(panel, "pointerdown", (e) => { e.preventDefault(); pump(); }, { passive: false });
        ctx.on(panel, "mouseenter", () => { armed = true; });
        ctx.on(panel, "mouseleave", () => { armed = false; });
        ctx.on(panel, "focusin", () => { armed = true; });
        ctx.on(panel, "focusout", () => { armed = false; });

        ctx.on(document, "keydown", (e) => {
          if (!armed) return;
          const k = e.key;
          if (k === " " || k === "Enter") {
            e.preventDefault();
            pump();
          }
        }, { capture: true });

        // cleanup
        return () => {
          try { if (raf) cancelAnimationFrame(raf); } catch {}
          try { panel.remove(); } catch {}
          try { bgwrap.remove(); } catch {}
          try { style.remove(); } catch {}
          try { raised.forEach(el => el.classList.remove("jull-ui-raise")); } catch {}
        };
      }
    };

    window.BingoPluginRuntime?.initUserPlugin?.();
  });
})();
