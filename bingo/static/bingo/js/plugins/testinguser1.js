console.log("[testinguser1] plugin file LOADED");

window.BingoUserPlugin = window.BingoUserPlugin || {};

window.BingoUserPlugin.init = function (api) {
  const pick = (arr) => (Array.isArray(arr) && arr.length ? arr[(Math.random() * arr.length) | 0] : null);

  console.groupCollapsed(
    "%c[Bingo Plugin] testinguser1 – init OK",
    "color:#2AFF8C;font-weight:bold"
  );

  if (!api || !api.sfx || Object.keys(api.sfx).length === 0) {
    console.warn("❌ No SFX provided for this user");
  } else {
    console.log("✅ SFX loaded");
    const table = [];
    for (const [type, list] of Object.entries(api.sfx)) {
      if (!Array.isArray(list)) continue;
      list.forEach((url, i) => table.push({ type, index: i, file: String(url).split("/").pop(), url }));
    }
    console.table(table);
  }
  console.groupEnd();

  // TEST: ctrl+alt+1 -> zagra losowy HIDE
  //       ctrl+alt+2 -> zagra losowy REVEAL
  api.ctx.on(document, "keydown", (e) => {
    if (!e.ctrlKey || !e.altKey) return;

    if (e.key === "1") {
      const url = pick(api.sfx?.hide);
      console.log("[testinguser1] play HIDE:", url);
      api.playSfx(url, { volume: 0.55 });
    }

    if (e.key === "2") {
      const url = pick(api.sfx?.reveal);
      console.log("[testinguser1] play REVEAL:", url);
      api.playSfx(url, { volume: 0.65 });
    }
  });

  // ===== DEV CONSOLE COMMANDS =====
  // Użycie w konsoli:
  //   testinguser1.playRandom()          // losowo hide albo reveal
  //   testinguser1.playHide()            // losowy hide
  //   testinguser1.playReveal()          // losowy reveal
  //   testinguser1.listSfx()             // tabelka
  //   testinguser1.setVolume(0.2)        // ustawia domyślną głośność
  //   testinguser1.unlock()              // spróbuj "odblokować" audio po kliknięciu na stronie

  const state = {
    volume: 0.6,
  };

  function listSfx() {
    const table = [];
    for (const [type, list] of Object.entries(api.sfx || {})) {
      if (!Array.isArray(list)) continue;
      list.forEach((url, i) => table.push({ type, index: i, file: String(url).split("/").pop(), url }));
    }
    console.table(table);
    return table;
  }

  function playUrl(url, volOverride = null) {
    const v = (typeof volOverride === "number") ? volOverride : state.volume;
    console.log("[testinguser1] play:", url, "vol=", v);
    api.playSfx(url, { volume: v });
    return url;
  }

  function playHide(vol) {
    const url = pick(api.sfx?.hide);
    if (!url) { console.warn("[testinguser1] no hide sfx"); return null; }
    return playUrl(url, vol);
  }

  function playReveal(vol) {
    const url = pick(api.sfx?.reveal);
    if (!url) { console.warn("[testinguser1] no reveal sfx"); return null; }
    return playUrl(url, vol);
  }

  function playRandom(vol) {
    // 50/50 hide/reveal
    return (Math.random() < 0.5) ? playHide(vol) : playReveal(vol);
  }

  function setVolume(v) {
    const clamped = Math.max(0, Math.min(1, Number(v)));
    state.volume = isNaN(clamped) ? state.volume : clamped;
    console.log("[testinguser1] volume set to", state.volume);
    return state.volume;
  }

  // "unlock" – pomaga w przypadku restrykcji autoplay:
  // kliknij raz w stronę, potem w konsoli testinguser1.unlock()
  function unlock() {
    // próbujemy zagrać bardzo cicho cokolwiek dostępnego
    const url = pick([...(api.sfx?.hide || []), ...(api.sfx?.reveal || [])]);
    if (!url) { console.warn("[testinguser1] no sfx to unlock"); return false; }
    api.playSfx(url, { volume: 0.001 });
    console.log("[testinguser1] unlock attempted (requires prior user gesture in many browsers)");
    return true;
  }

  // eksport do globala:
  window.testinguser1 = {
    playRandom,
    playHide,
    playReveal,
    listSfx,
    setVolume,
    unlock,
  };

  console.log("[testinguser1] console commands ready: window.testinguser1");
  // ===== END DEV CONSOLE COMMANDS =====

  return () => {
    try { delete window.testinguser1; } catch {}
    api.ctx.destroy();
  };
};
