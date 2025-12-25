window.BingoUserPlugin = window.BingoUserPlugin || {};

window.BingoUserPlugin.init = function (api) {
  const pick = (arr) => (Array.isArray(arr) && arr.length ? arr[(Math.random() * arr.length) | 0] : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ===== KONFIG (łatwo stroisz) =====
  const CFG = {
    vanishAnimMs: 1000,          // fade→gray
    floatLifeMs: 6000,           // ile siedzi poza tabelą
    tickEveryMs: 3500,           // co ile próbujemy wywołać zniknięcie
    chancePerTick: 0.55,         // szansa na prank w danym ticku
    maxFloating: 3,              // max kafelków poza tabelą jednocześnie
    sfxHideVol: 0.55,
    sfxRevealVol: 0.65,
    // jeśli true, próbujemy nie wrzucać floating nad tabelkę (preferujemy poza grid)
    preferOutsideGrid: true,
  };

  console.groupCollapsed("%c[Bingo Plugin] testinguser1 TwitchTiles init", "color:#2AFF8C;font-weight:bold");
  console.log("sfx:", api.sfx);
  console.groupEnd();

  // ===== TRACKING =====
  const activeTeleports = new Set(); // przechowujemy obiekty teleporta

  function tileFromActiveElement() {
    const ae = document.activeElement;
    return ae?.closest?.(".cell-wrapper") || null;
  }

  function floatingCount() {
    return activeTeleports.size;
  }

  function gridRect() {
    const t = document.querySelector(".grid-table");
    return t ? t.getBoundingClientRect() : null;
  }

  function randomPos() {
    const pad = 16;
    return {
      x: pad + Math.random() * (window.innerWidth - pad * 2),
      y: pad + Math.random() * (window.innerHeight - pad * 2),
    };
  }

  function randomPosPreferOutside() {
    const g = gridRect();
    if (!g) return randomPos();

    // spróbuj kilka razy znaleźć punkt poza gridem
    for (let i = 0; i < 18; i++) {
      const p = randomPos();
      const inside =
        p.x >= g.left && p.x <= g.right &&
        p.y >= g.top && p.y <= g.bottom;
      if (!inside) return p;
    }
    // fallback
    return randomPos();
  }

  function setFloatingPos(floatingEl) {
    const p = CFG.preferOutsideGrid ? randomPosPreferOutside() : randomPos();
    floatingEl.style.left = `${p.x}px`;
    floatingEl.style.top = `${p.y}px`;
  }

  function safePickVictim() {
    const focused = tileFromActiveElement();
    // nie bierzemy aktywnego tile w focusie
    const victim = api.tiles.pickRandom(focused);
    return victim;
  }

  function doVanishTeleportReturn() {
    if (floatingCount() >= CFG.maxFloating) return;

    const victim = safePickVictim();
    if (!victim) return;

    // 1) animacja fade→gray w miejscu
    victim.classList.add("plugin-vanish");

    // 2) hide SFX (losowy)
    api.playSfx(pick(api.sfx?.hide), { volume: CFG.sfxHideVol });

    // 3) po animacji teleport do overlay
    api.ctx.setTimeoutSafe(() => {
      victim.classList.remove("plugin-vanish");

      const tele = api.tiles.teleport(victim);
      if (!tele) return;

      activeTeleports.add(tele);

      // pozycja floating (prefer outside grid)
      setFloatingPos(tele.floating);

      // 4) po floatLifeMs wraca do tabeli i reveal SFX
      api.ctx.setTimeoutSafe(() => {
        // wybieramy target TD losowo (może być też ten sam co miał, jeśli null)
        const targetTile = api.tiles.pickRandom(null);
        const targetTd = targetTile ? targetTile.parentElement : null;

        api.tiles.return(tele, targetTd);
        activeTeleports.delete(tele);

        api.playSfx(pick(api.sfx?.reveal), { volume: CFG.sfxRevealVol });
      }, CFG.floatLifeMs);

    }, CFG.vanishAnimMs);
  }

  // ===== PĘTLA (periodycznie) =====
  const loopId = api.ctx.setIntervalSafe(() => {
    if (Math.random() > CFG.chancePerTick) return;
    doVanishTeleportReturn();
  }, CFG.tickEveryMs);

  // ===== MANUAL DEBUG =====
  // Ctrl+Alt+P -> natychmiast
  api.ctx.on(document, "keydown", (e) => {
    if (e.ctrlKey && e.altKey && (e.key === "p" || e.key === "P")) {
      doVanishTeleportReturn();
    }
  });

  // Podpięcie pod save (opcjonalne) — jeśli chcesz, odkomentuj:
  // api.hooks.on("save:ok", () => doVanishTeleportReturn());

  // ===== CLEANUP =====
  return () => {
    // jakby coś wisiało w overlay, spróbuj zwrócić
    try {
      activeTeleports.forEach((tele) => {
        try { api.tiles.return(tele, null); } catch {}
      });
      activeTeleports.clear();
    } catch {}
    api.ctx.destroy();
  };
};
