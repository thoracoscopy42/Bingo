// bingo/static/bingo/js/plugins/<username>.js
(() => {
  // Jeśli plugin ładuje się przed runtime, poczekaj.
  function whenReady(fn) {
    if (window.BingoPluginRuntime?.initUserPlugin) return fn();
    const t = setInterval(() => {
      if (window.BingoPluginRuntime?.initUserPlugin) {
        clearInterval(t);
        fn();
      }
    }, 40);
  }

  whenReady(() => {
    window.BingoUserPlugin = {
      init(api) {
        const { ctx, tiles, playSfx, sfx } = api;
        const root = document.getElementById("plugin-root");
        if (!root) return;

        // ====== Styles injected by plugin ======
        const style = document.createElement("style");
        style.textContent = `
#plugin-root { position: relative; z-index: 50; }
.plugin-overlay {
  position: fixed; inset: 0;
  pointer-events: none;
}
.plugin-plane {
  position: fixed;
  font-size: 44px;
  transform: translate(-120px, 20vh) rotate(8deg);
  will-change: transform, opacity, filter;
  filter: drop-shadow(0 10px 18px rgba(0,0,0,.35));
}
.plugin-flash {
  position: fixed; inset: 0;
  background: rgba(255,255,255,0);
  pointer-events: none;
}
.plugin-flash.is-on {
  animation: pluginFlash 240ms ease-out 1;
}
@keyframes pluginFlash {
  0% { background: rgba(255,255,255,0); }
  30% { background: rgba(255,255,255,.92); }
  100% { background: rgba(255,255,255,0); }
}
@keyframes pluginShake {
  0% { transform: translate(0,0) rotate(0deg); }
  10% { transform: translate(-8px, 3px) rotate(-.4deg); }
  25% { transform: translate(10px,-6px) rotate(.6deg); }
  40% { transform: translate(-9px, 7px) rotate(-.5deg); }
  55% { transform: translate(7px,-4px) rotate(.4deg); }
  70% { transform: translate(-5px, 3px) rotate(-.2deg); }
  100% { transform: translate(0,0) rotate(0deg); }
}
.plugin-shake-target.is-shaking {
  animation: pluginShake 520ms cubic-bezier(.2,.9,.2,1) 1;
}

.plugin-hole {
  position: fixed;
  width: 10px; height: 10px;
  border-radius: 999px;
  transform: translate(-50%, -50%) scale(0.2);
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.18), rgba(0,0,0,1) 60%);
  box-shadow: 0 0 60px rgba(0,0,0,.65);
  opacity: 0;
  will-change: transform, opacity;
}
.plugin-hole.is-on {
  opacity: 1;
  animation: holeGrow 900ms cubic-bezier(.2,.9,.2,1) 1 forwards;
}
@keyframes holeGrow {
  0% { transform: translate(-50%, -50%) scale(0.2); }
  100% { transform: translate(-50%, -50%) scale(18); }
}

.plugin-floating {
  position: fixed;
  left: 0; top: 0;
  transform: translate(0,0);
  will-change: transform, opacity, filter;
  pointer-events: none;
}
.plugin-floating .cell-wrapper {
  pointer-events: auto; /* textarea nadal klikalna, jak chcesz */
}
        `;
        document.head.appendChild(style);

        // ====== Overlay nodes ======
        const overlay = document.createElement("div");
        overlay.className = "plugin-overlay";
        root.appendChild(overlay);

        const plane = document.createElement("div");
        plane.className = "plugin-plane";
        plane.textContent = "✈️";
        overlay.appendChild(plane);

        const flash = document.createElement("div");
        flash.className = "plugin-flash";
        overlay.appendChild(flash);

        const hole = document.createElement("div");
        hole.className = "plugin-hole";
        overlay.appendChild(hole);

        // ====== Helpers ======
        function sfxTry(key, fallbackUrl = null, volume = 0.35) {
          // sfx to JSON z backendu: np. {"boom": ".../boom.mp3"}
          const url = (sfx && sfx[key]) || fallbackUrl;
          if (!url) return;
          playSfx(url, { volume });
        }

        function shakePanel() {
          const target = document.querySelector(".panel") || document.body;
          target.classList.add("plugin-shake-target", "is-shaking");
          ctx.setTimeoutSafe(() => target.classList.remove("is-shaking"), 620);
        }

        function doFlash() {
          flash.classList.remove("is-on");
          // wymuś reflow dla restartu animacji
          void flash.offsetWidth;
          flash.classList.add("is-on");
        }

        // ====== Main sequence ======
        let running = false;

        async function runSequence() {
          if (running) return;
          running = true;

          // 1) Plane fly across
          const startY = Math.max(80, Math.min(window.innerHeight - 120, window.innerHeight * (0.18 + Math.random() * 0.35)));
          const endX = window.innerWidth + 140;
          const startX = -140;

          plane.style.opacity = "1";
          plane.style.transform = `translate(${startX}px, ${startY}px) rotate(10deg)`;

          sfxTry("plane", null, 0.25);

          const fly = plane.animate(
            [
              { transform: `translate(${startX}px, ${startY}px) rotate(10deg)` },
              { transform: `translate(${endX}px, ${startY - 40}px) rotate(6deg)` },
            ],
            { duration: 1300, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
          );

          await fly.finished.catch(() => {});
          fly.cancel();

          // 2) Explosion moment
          doFlash();
          shakePanel();
          sfxTry("boom", null, 0.35);

          // 3) Throw some tiles into "space"
          const all = tiles.all();
          const pickCount = Math.min(7, Math.max(3, Math.floor(all.length * 0.22)));
          const picked = [];
          const used = new Set();

          for (let i = 0; i < pickCount; i++) {
            let t = null;
            for (let tries = 0; tries < 20; tries++) {
              const cand = all[(Math.random() * all.length) | 0];
              if (!used.has(cand)) { t = cand; break; }
            }
            if (!t) break;
            used.add(t);
            picked.push(t);
          }

          const teles = picked.map(t => tiles.teleport(t)).filter(Boolean);

          // rozrzuć po ekranie
          teles.forEach((tele, idx) => {
            const r = tiles.focusRect();
            const pos = tiles.randomPosNear(r);
            tele.floating.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${(Math.random()*40-20)}deg) scale(${0.96 + Math.random()*0.10})`;
            tele.floating.style.opacity = "1";
            tele.floating.animate(
              [
                { filter: "blur(0px)" },
                { filter: "blur(0.6px)" },
              ],
              { duration: 320, fill: "forwards", easing: "ease-out" }
            ).finished.catch(() => {});
          });

          // 4) Black hole appears
          const holeX = Math.max(80, Math.min(window.innerWidth - 80, window.innerWidth * (0.45 + Math.random() * 0.25)));
          const holeY = Math.max(80, Math.min(window.innerHeight - 80, window.innerHeight * (0.35 + Math.random() * 0.25)));
          hole.style.left = holeX + "px";
          hole.style.top = holeY + "px";
          hole.classList.remove("is-on");
          void hole.offsetWidth;
          hole.classList.add("is-on");

          sfxTry("hole", null, 0.22);

          // 5) Suck tiles into the hole, then return
          await new Promise(res => ctx.setTimeoutSafe(res, 520));

          const suckAnims = teles.map((tele) => {
            const el = tele.floating;
            // koniec w środku dziury
            const to = { x: holeX, y: holeY };
            return el.animate(
              [
                { transform: el.style.transform, opacity: 1 },
                { transform: `translate(${to.x}px, ${to.y}px) rotate(220deg) scale(0.15)`, opacity: 0.05 },
              ],
              { duration: 820, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
            );
          });

          await Promise.allSettled(suckAnims.map(a => a.finished));

          // zdejmij animacje i odłóż tile na miejsce
          teles.forEach((tele) => {
            try { tele.floating.style.opacity = "0"; } catch {}
            tiles.return(tele);
          });

          // sprzątnij dziurę
          ctx.setTimeoutSafe(() => {
            hole.classList.remove("is-on");
            plane.style.opacity = "0";
          }, 260);

          running = false;
        }

        // ====== Trigger rules ======
        // 1) odpal raz po wejściu (po krótkim delayu, żeby UI zdążył się wyrenderować)
        ctx.setTimeoutSafe(() => runSequence(), 650);

        // 2) odpal też po kliknięciu "Zapisz" (efekt “wybuchającej strony” jako celebracja)
        const saveBtn = document.getElementById("save-btn");
        if (saveBtn) {
          ctx.on(saveBtn, "click", () => {
            // odpal po chwili, żeby nie przeszkadzać w fetchu
            ctx.setTimeoutSafe(() => runSequence(), 160);
          });
        }

        // cleanup
        return () => {
          try { overlay.remove(); } catch {}
          try { style.remove(); } catch {}
        };
      }
    };

    // runtime sam wywoła initUserPlugin() z game.js
  });
})();
