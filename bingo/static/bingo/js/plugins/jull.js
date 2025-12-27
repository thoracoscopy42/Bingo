(() => {
  const CFG = {
    // gdzie są obrazki
    BG_IMGS: [
      "/static/bingo/images/jull/bgkotek1.jpg",
      "/static/bingo/images/jull/bgkotek2.jpg",
      "/static/bingo/images/jull/bgkotek3.jpg",
      // future: dopisuj kolejne bgkotek*.jpg
    ],
    HAPPY_CAT: "/static/bingo/images/jull/happycat.jpg",
    SAD_CAT: "/static/bingo/images/jull/sadcat.jpg",

    // tło – układ
    ROWS: 6,                  // liczba rzędów kotków
    TILE_H: 160,              // wysokość kafla (px)
    TILE_GAP: 14,             // odstęp między kotkami
    SPEED_MIN: 18,            // sekundy (wolniej)
    SPEED_MAX: 36,            // sekundy (szybciej)

    // minigierka – tlen
    OXY_MAX: 1.0,
    OXY_START: 0.65,
    OXY_DECAY_PER_SEC: 0.055, // spadek / sek
    OXY_PUMP_ADD: 0.22,       // ile dodaje pompnięcie
    OXY_PUMP_CD_MS: 180,      // minimalny odstęp między pompnięciami

    // progi nastroju
    SAD_THRESHOLD: 0.30,      // poniżej = smutny
    FADE_MS: 280,             // crossfade kotka

    // UI
    PANEL_W: 240,
    PANEL_H: 180,             // trochę wyżej, bo dodajemy guzik
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

  // tworzy tyle kafli, żeby spokojnie wypełnić 2x szerokość (do płynnego przesuwu)
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
/* plugin nie ma dominować strony */
#plugin-root { position: relative; z-index: 0; }

/* tło dekoracyjne POD grą */
.jull-wrap{
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #000;
  pointer-events: none;           /* nie blokuje UI gry */
}

.jull-bg{
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-rows: repeat(${CFG.ROWS}, ${CFG.TILE_H}px);
  gap: ${CFG.TILE_GAP}px;
  padding: ${CFG.TILE_GAP}px;
  box-sizing: border-box;
  opacity: .35;                   /* delikatnie */
  pointer-events: none;
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
  filter: saturate(1.05) contrast(1.02);
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
}

/* animacja przesuwu */
@keyframes jull-marquee {
  0%   { transform: translateX(0); }
  100% { transform: translateX(calc(-50% - (${CFG.TILE_GAP}px / 2))); }
}

.jull-track.anim{
  animation: jull-marquee var(--jullDur, 26s) linear infinite;
}

.jull-track.reverse{
  animation-direction: reverse;
}

/* panel minigry — prawy dolny róg */
.jull-panel{
  position: fixed;
  right: 18px;
  bottom: 18px;
  left: auto;
  top: auto;
  transform: none;

  width: ${CFG.PANEL_W}px;
  height: ${CFG.PANEL_H}px;

  z-index: 3;                     /* nad tłem */
  pointer-events: auto;           /* panel klikalny */

  border-radius: 18px;
  background: rgba(0,0,0,.78);
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
`;
        document.head.appendChild(style);

        // ===== DOM =====
        const wrap = document.createElement("div");
        wrap.className = "jull-wrap";

        const bg = document.createElement("div");
        bg.className = "jull-bg";

        // rows
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
          rowEls.push({ row, track });
        }

        // panel
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
        hint.innerHTML = `Pompkuj tlen: <strong>klik</strong> / <strong>SPACJA</strong> / <strong>ENTER</strong> (gdy najedziesz na panel)`;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "jull-pumpbtn";
        btn.textContent = "POMPUJ";
        btn.addEventListener("click", (e) => { e.preventDefault(); pump(); });

        panel.appendChild(catbox);
        panel.appendChild(oxy);
        panel.appendChild(hint);
        panel.appendChild(btn);

        wrap.appendChild(bg);
        root.appendChild(wrap);
        root.appendChild(panel); // panel osobno, bo ma pointer-events i z-index

        // ===== layout fill =====
        function layoutFill() {
          const rowW = wrap.clientWidth || window.innerWidth || 1200;
          const tileW = (CFG.TILE_H * 1.35) + CFG.TILE_GAP;

          rowEls.forEach(({ track }) => {
            if (track.__filled) return;

            fillRow(track, rowW, tileW);

            // kopiujemy obrazki jeszcze raz do tego samego tracka, żeby -50% było płynne
            const imgs = Array.from(track.querySelectorAll("img"));
            imgs.forEach(img => track.appendChild(img.cloneNode(true)));

            track.__filled = true;
          });
        }

        layoutFill();

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

        // input: tylko panel (nie blokuje gry) + klawiatura tylko gdy panel "uzbrojony"
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
          try { wrap.remove(); } catch {}
          try { style.remove(); } catch {}
        };
      }
    };

    window.BingoPluginRuntime?.initUserPlugin?.();
  });
})();
