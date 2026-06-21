(function() {
  const CARD_W = 52;
  const CARD_H = 62;
  const GAP = 8;
  const CELL_W = CARD_W + GAP;
  const CELL_H = CARD_H + GAP;

  const LEVELS = [
    { name: "第 1 关", layers: 3, cols: 3, rows: 3, matchCount: 3, slotSize: 7, types: ["🐑","🐂","🐄","🐖","🐗","🐏","🐓","🐔","🦃"] },
    { name: "第 2 关", layers: 3, cols: 3, rows: 3, matchCount: 3, slotSize: 7, types: ["🍎","🍊","🍋","🍌","🍉","🍇","🍓","🍒","🥝"] },
    { name: "第 3 关", layers: 5, cols: 4, rows: 3, matchCount: 3, slotSize: 7, types: ["⭐","🌟","✨","💫","🌙","☀","🌞","🌈","🌠","💡"] },
    { name: "第 4 关", layers: 5, cols: 4, rows: 3, matchCount: 3, slotSize: 7, types: ["🌸","🌺","🌼","🌻","🌹","🌷","🍀","🌿","🍄","🌴"] },
    { name: "第 5 关", layers: 7, cols: 4, rows: 3, matchCount: 3, slotSize: 7, types: ["🎈","🎁","🎀","🎂","🎉","🎊","🎆"] },
    { name: "第 6 关", layers: 7, cols: 4, rows: 3, matchCount: 3, slotSize: 7, types: ["🔵","🔴","🟡","🟢","🟣","🟠","⚫"] },
    { name: "第 7 关 · 终极挑战", layers: 9, cols: 5, rows: 2, matchCount: 5, slotSize: 10, types: ["🐑","🍎","🌸","⭐","🎁","🌺"] }
  ];

  let state = { level: 0, cards: [], slotCards: [], totalCards: 0, gameActive: false, matchCount: 3, slotSize: 7, undoUsed: false, startTimestamp: null, totalSeconds: 0 };
  function byId(id) { return document.getElementById(id); }
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function formatDuration(total) {
    var s = Math.max(0, Math.floor(total));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    if (h > 0) return h + " 小时 " + m + " 分 " + ss + " 秒";
    if (m > 0) return m + " 分 " + ss + " 秒";
    return ss + " 秒";
  }
  function formatClock(total) {
    var s = Math.max(0, Math.floor(total));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    if (h > 0) return pad2(h) + ":" + pad2(m) + ":" + pad2(ss);
    return pad2(m) + ":" + pad2(ss);
  }
  function formatToday() {
    var d = new Date();
    return d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
  }
  var sheepTimerHandle = null;
  function startGlobalTimer() {
    if (state.startTimestamp == null) state.startTimestamp = Date.now();
    if (sheepTimerHandle) return;
    sheepTimerHandle = setInterval(function() { refreshTimer(); }, 1000);
    refreshTimer();
  }
  function stopGlobalTimer() {
    if (sheepTimerHandle) { clearInterval(sheepTimerHandle); sheepTimerHandle = null; }
  }
  function refreshTimer() {
    var el = byId("sheep-info-timer");
    if (!el) return;
    if (state.startTimestamp == null) { el.textContent = "00:00"; return; }
    var sec = Math.floor((Date.now() - state.startTimestamp) / 1000);
    state.totalSeconds = sec;
    el.textContent = formatClock(sec);
  }
  function showCertificate() {
    var total = state.totalSeconds;
    if (!total && state.startTimestamp) total = Math.floor((Date.now() - state.startTimestamp) / 1000);
    var dateEl = byId("sheep-cert-date");
    if (dateEl) dateEl.textContent = formatToday();
    var durEl = byId("sheep-cert-duration");
    if (durEl) durEl.textContent = formatDuration(total);
    byId("sheep-result-modal").style.display = "none";
    var modal = byId("sheep-certificate-modal");
    modal.style.display = "flex";
    modal.classList.add("sheep-modal-active");
  }
  function hideCertificate() {
    var modal = byId("sheep-certificate-modal");
    modal.style.display = "none";
    modal.classList.remove("sheep-modal-active");
  }

  function getHighestUnlocked() {
    try { var v = parseInt(localStorage.getItem("sheep_highest_level"), 10); if (v >= 1 && v <= LEVELS.length) return v; } catch (e) {}
    return 1;
  }
  function setHighestUnlocked(n) {
    try { localStorage.setItem("sheep_highest_level", String(n)); } catch (e) {}
  }
  function getPassedSet() {
    try {
      var raw = localStorage.getItem("sheep_passed");
      var arr = JSON.parse(raw || "[]");
      var set = {};
      for (var i = 0; i < arr.length; i++) set[arr[i]] = true;
      return set;
    } catch (e) { return {}; }
  }
  function markPassed(lvl) {
    try {
      var set = getPassedSet();
      set[lvl] = true;
      var arr = [];
      for (var k in set) arr.push(parseInt(k, 10));
      localStorage.setItem("sheep_passed", JSON.stringify(arr));
    } catch (e) {}
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function genPositions(cfg) {
    // 候选槽位池：比每层实际牌数多出一些槽位，让不同层能在不同"池子"里取
    var gridCols = cfg.cols + 2;
    var gridRows = cfg.rows + 1;
    var cellW = CARD_W + GAP * 0.6;
    var cellH = CARD_H + GAP * 0.6;
    var baseStartX = GAP;
    var baseStartY = GAP;
    var list = [];
    for (var l = 0; l < cfg.layers; l++) {
      // 每层整体做不同的偏移，让层与层错开
      var globalOffX = (l % 2 === 0 ? 1 : -1) * (GAP * 0.6 + l * 1.5) + GAP * (l % 3);
      var globalOffY = l * GAP * 0.4;
      var slots = [];
      for (var rr = 0; rr < gridRows; rr++) {
        for (var cc = 0; cc < gridCols; cc++) {
          slots.push({ c: cc, r: rr });
        }
      }
      shuffle(slots);
      var count = cfg.cols * cfg.rows;
      for (var i = 0; i < count && i < slots.length; i++) {
        var s = slots[i];
        // 单张牌的大随机偏移：± 0.35 格宽 / ± 0.25 格高，使牌不再严格对齐
        var jitterX = (Math.random() - 0.5) * cellW * 0.7;
        var jitterY = (Math.random() - 0.5) * cellH * 0.5;
        // 整层轻微的方向摆动，视觉上更像"乱堆"
        var swingX = Math.cos(l * 1.3) * GAP * 0.35;
        var swingY = Math.sin(l * 1.3) * GAP * 0.35;
        var x = baseStartX + s.c * cellW + jitterX + globalOffX + swingX;
        var y = baseStartY + s.r * cellH + jitterY + globalOffY + swingY;
        if (x < 0) x = Math.random() * GAP;
        if (y < 0) y = Math.random() * GAP;
        list.push({ x: x, y: y, layer: l + 1 });
      }
    }
    return list;
  }
  function genPool(cfg, count) {
    var types = cfg.types;
    var perType = Math.floor(count / types.length);
    var pool = [];
    for (var k = 0; k < types.length; k++) {
      for (var i = 0; i < perType; i++) pool.push(types[k]);
    }
    while (pool.length < count) pool.push(types[pool.length % types.length]);
    return shuffle(pool);
  }
  function getBoardSize(cfg) {
    return { w: (cfg.cols + 2) * (CARD_W + GAP * 0.6) + cfg.layers * GAP * 1.2 + GAP * 2, h: (cfg.rows + 1) * (CARD_H + GAP * 0.6) + cfg.layers * GAP * 1.2 + GAP * 2 };
  }
  function renderLevelSelect() {
    var highest = getHighestUnlocked();
    var passed = getPassedSet();
    var total = LEVELS.length;
    var bar = byId("sheep-progress-bar");
    bar.innerHTML = "";
    for (var i = 1; i <= total; i++) {
      var dot = document.createElement("div");
      dot.className = "sheep-progress-dot";
      if (passed[i]) dot.classList.add("sheep-progress-done");
      else if (i <= highest) dot.classList.add("sheep-progress-current");
      else dot.classList.add("sheep-progress-locked");
      var num = document.createElement("div");
      num.className = "sheep-progress-num";
      num.textContent = passed[i] ? "✓" : String(i);
      dot.appendChild(num);
      bar.appendChild(dot);
      if (i < total) {
        var line = document.createElement("div");
        line.className = "sheep-progress-line";
        if (passed[i] || i < highest) line.classList.add("sheep-progress-line-done");
        bar.appendChild(line);
      }
    }
    byId("sheep-progress-label").textContent = "第 " + highest + " / " + total + " 关";

    var cardWrap = byId("sheep-current-card");
    cardWrap.innerHTML = "";
    var card = document.createElement("button");
    card.className = "sheep-current-card-inner sheep-lvl-" + highest;
    if (highest === total) card.classList.add("sheep-lvl-final");
    var cfg = LEVELS[highest - 1];
    var preview = cfg.types.slice(0, 5).join(" ");
    card.innerHTML = '<div class="sheep-current-badge">当前</div>' +
      '<div class="sheep-current-num">' + highest + '</div>' +
      '<div class="sheep-current-name">' + cfg.name + '</div>' +
      '<div class="sheep-current-desc">' + cfg.layers + ' 层 · ' + cfg.matchCount + ' 消 · ' + cfg.slotSize + ' 槽位</div>' +
      '<div class="sheep-current-preview">' + preview + '</div>' +
      '<div class="sheep-current-btn">开始挑战</div>';
    (function(lvl) {
      card.addEventListener("click", function() { startGame(lvl); });
    })(highest - 1);
    cardWrap.appendChild(card);
  }

  function isTop(card) {
    if (card.removed) return false;
    var cx = card.x + CARD_W / 2;
    var cy = card.y + CARD_H / 2;
    for (var i = 0; i < state.cards.length; i++) {
      var other = state.cards[i];
      if (other === card || other.removed) continue;
      if (other.layer <= card.layer) continue;
      if (cx >= other.x && cx <= other.x + CARD_W && cy >= other.y && cy <= other.y + CARD_H) return false;
    }
    return true;
  }
  function refreshLock() {
    for (var i = 0; i < state.cards.length; i++) {
      var c = state.cards[i];
      if (!c.el) continue;
      if (c.removed) { c.el.style.display = "none"; continue; }
      if (isTop(c)) c.el.classList.remove("sheep-card-locked");
      else c.el.classList.add("sheep-card-locked");
    }
  }
  function refreshInfo() {
    byId("sheep-info-level").textContent = state.level + 1;
    var remain = 0;
    for (var i = 0; i < state.cards.length; i++) if (!state.cards[i].removed) remain++;
    byId("sheep-info-remain").textContent = remain;
    byId("sheep-info-progress").textContent = Math.round((1 - remain / state.totalCards) * 100) + "%";
  }
  function renderBoard() {
    var boardEl = byId("sheep-board");
    boardEl.innerHTML = "";
    var cfg = LEVELS[state.level];
    var size = getBoardSize(cfg);
    boardEl.style.width = size.w + "px";
    boardEl.style.height = size.h + "px";
    for (var i = 0; i < state.cards.length; i++) {
      var c = state.cards[i];
      var el = document.createElement("div");
      el.className = "sheep-card";
      el.style.position = "absolute";
      el.style.left = c.x + "px";
      el.style.top = c.y + "px";
      el.style.width = CARD_W + "px";
      el.style.height = CARD_H + "px";
      el.style.zIndex = c.layer * 10;
      el.textContent = c.type;
      // 按层显示不同阴影/边框，层次更明显
      var depth = c.layer;
      var shadowOffset = depth * 2;
      var shadowBlur = depth * 2 + 4;
      el.style.boxShadow = shadowOffset + "px " + shadowOffset + "px " + shadowBlur + "px rgba(46,125,50,0.25)";
      // 不同层的边框颜色，从深到浅，表示在上面
      var borderShade = Math.min(200, 120 + depth * 12);
      el.style.borderColor = "rgb(" + borderShade + "," + (borderShade + 10) + "," + (borderShade - 10) + ")";
      el.style.borderWidth = "2px";
      (function(card) {
        el.addEventListener("click", function() { onClickCard(card); });
      })(c);
      c.el = el;
      boardEl.appendChild(el);
    }
    refreshLock();
  }
  function renderSlot() {
    var slotEl = byId("sheep-slot");
    slotEl.innerHTML = "";
    for (var i = 0; i < state.slotSize; i++) {
      var cell = document.createElement("div");
      cell.className = "sheep-slot-cell";
      if (state.slotCards[i]) {
        var cardEl = document.createElement("div");
        cardEl.className = "sheep-slot-card";
        cardEl.textContent = state.slotCards[i].type;
        cell.appendChild(cardEl);
      }
      slotEl.appendChild(cell);
    }
  }
  function refreshUndoBtn() {
    var btn = byId("sheep-undo-btn");
    var label = byId("sheep-undo-label");
    if (state.undoUsed) {
      btn.classList.add("sheep-action-btn-used");
      label.textContent = "已使用";
    } else {
      btn.classList.remove("sheep-action-btn-used");
      label.textContent = "撤回";
    }
  }
  function onClickCard(card) {
    if (!state.gameActive) return;
    if (card.removed || !isTop(card)) return;
    if (state.slotCards.length >= state.slotSize) return;
    card.removed = true;
    if (card.el) card.el.style.display = "none";
    state.slotCards.push({ type: card.type });
    renderSlot();
    refreshLock();
    refreshInfo();
    checkMatch();
    setTimeout(checkGameState, 200);
  }
  function checkMatch() {
    var counts = {};
    for (var i = 0; i < state.slotCards.length; i++) {
      var t = state.slotCards[i].type;
      counts[t] = (counts[t] || 0) + 1;
    }
    var matchedType = null;
    for (var tt in counts) {
      if (counts[tt] >= state.matchCount) { matchedType = tt; break; }
    }
    if (matchedType) {
      var idxToRemove = [];
      for (var j = state.slotCards.length - 1; j >= 0 && idxToRemove.length < state.matchCount; j--) {
        if (state.slotCards[j].type === matchedType) idxToRemove.push(j);
      }
      idxToRemove.sort(function(a, b) { return b - a; });
      for (var k = 0; k < idxToRemove.length; k++) {
        state.slotCards.splice(idxToRemove[k], 1);
      }
      renderSlot();
      setTimeout(checkMatch, 100);
    }
  }
  function checkGameState() {
    var remaining = 0;
    for (var i = 0; i < state.cards.length; i++) if (!state.cards[i].removed) remaining++;
    if (remaining === 0 && state.slotCards.length === 0) { showResult(true); return; }
    if (state.slotCards.length >= state.slotSize) showResult(false);
  }
  function showResult(win) {
    state.gameActive = false;
    var level1Based = state.level + 1;
    var total = LEVELS.length;
    if (win) {
      markPassed(level1Based);
      if (level1Based >= total) {
        stopGlobalTimer();
        showCertificate();
        return;
      }
      var nextLevel = level1Based + 1;
      if (nextLevel > getHighestUnlocked()) setHighestUnlocked(nextLevel);
      var modal = byId("sheep-result-modal");
      modal.style.display = "flex";
      modal.classList.add("sheep-modal-active");
      byId("sheep-modal-emoji").textContent = "🎉";
      byId("sheep-modal-title").textContent = "恭喜通关！";
      byId("sheep-modal-subtitle").textContent = "已解锁第 " + nextLevel + " 关";
      byId("sheep-modal-main-btn").textContent = "挑战下一关";
    } else {
      var modal = byId("sheep-result-modal");
      modal.style.display = "flex";
      modal.classList.add("sheep-modal-active");
      byId("sheep-modal-emoji").textContent = "😵";
      byId("sheep-modal-title").textContent = "挑战失败";
      byId("sheep-modal-subtitle").textContent = "槽位已满，再试一次吧";
      byId("sheep-modal-main-btn").textContent = "再来一次";
    }
  }
  function hideResult() {
    var modal = byId("sheep-result-modal");
    modal.style.display = "none";
    modal.classList.remove("sheep-modal-active");
  }
  function startGame(levelIdx) {
    state.level = levelIdx;
    var cfg = LEVELS[levelIdx];
    state.matchCount = cfg.matchCount;
    state.slotSize = cfg.slotSize;
    state.undoUsed = false;
    var positions = genPositions(cfg);
    var pool = genPool(cfg, positions.length);
    state.cards = [];
    for (var i = 0; i < positions.length; i++) {
      state.cards.push({
        id: "c" + i, type: pool[i],
        x: positions[i].x, y: positions[i].y, layer: positions[i].layer,
        removed: false, el: null
      });
    }
    state.totalCards = state.cards.length;
    state.slotCards = [];
    state.gameActive = true;
    if (state.startTimestamp == null) startGlobalTimer();
    byId("sheep-level-panel").style.display = "none";
    byId("sheep-game-panel").style.display = "block";
    byId("sheep-level-text").textContent = cfg.name;
    hideResult();
    renderBoard();
    renderSlot();
    refreshInfo();
    refreshUndoBtn();
    var slotEl = byId("sheep-slot");
    slotEl.style.gridTemplateColumns = "repeat(" + state.slotSize + ", 1fr)";
  }

  function showLevelsPage() {
    byId("sheep-game-panel").style.display = "none";
    byId("sheep-level-panel").style.display = "block";
    byId("sheep-level-text").textContent = "羊了个羊";
    hideResult();
    renderLevelSelect();
  }

  function doUndo() {
    if (!state.gameActive || state.slotCards.length === 0) return;
    if (state.undoUsed) return;
    var removed = [];
    for (var i = 0; i < state.cards.length; i++) if (state.cards[i].removed) removed.push(state.cards[i]);
    if (removed.length === 0) return;
    var last = removed[removed.length - 1];
    last.removed = false;
    if (last.el) last.el.style.display = "flex";
    state.slotCards.pop();
    state.undoUsed = true;
    renderSlot();
    refreshLock();
    refreshInfo();
    refreshUndoBtn();
  }

  function doShuffle() {
    if (!state.gameActive) return;
    var actives = [];
    for (var i = 0; i < state.cards.length; i++) if (!state.cards[i].removed) actives.push(state.cards[i]);
    var types = [];
    for (var j = 0; j < actives.length; j++) types.push(actives[j].type);
    shuffle(types);
    for (var k = 0; k < actives.length; k++) actives[k].type = types[k];
    renderBoard();
  }

  function onModalMainClick() {
    var title = byId("sheep-modal-title").textContent;
    if (title === "全部通关！") {
      window.location.href = "index.html";
    } else if (title === "恭喜通关！") {
      var next = state.level + 1;
      if (next < LEVELS.length) startGame(next);
      else showLevelsPage();
    } else {
      startGame(state.level);
    }
  }

  function setupEvents() {
    var bk = byId("back-btn");
    if (bk) bk.addEventListener("click", function() { window.location.href = "index.html"; });
    var mn = byId("sheep-menu");
    if (mn) mn.addEventListener("click", function() { window.location.href = "index.html"; });
    byId("sheep-undo-btn").addEventListener("click", doUndo);
    byId("sheep-shuffle-btn").addEventListener("click", doShuffle);
    byId("sheep-restart-btn").addEventListener("click", function() { startGame(state.level); });
    byId("sheep-modal-back-btn").addEventListener("click", showLevelsPage);
    var cBack = byId("sheep-cert-back-btn");
    if (cBack) cBack.addEventListener("click", function() { window.location.href = "index.html"; });
    var cSave = byId("sheep-cert-save-btn");
    if (cSave) cSave.addEventListener("click", function() { alert("长按奖状可保存到相册，或使用系统截图保存"); });
    byId("sheep-modal-main-btn").addEventListener("click", onModalMainClick);
  }

  function init() {
    setupEvents();
    renderLevelSelect();
    // 调试入口：访问 sheep.html#cert 可直接预览奖状（用于演示）
    if (location.hash.indexOf("cert") >= 0) {
      state.startTimestamp = Date.now() - 15 * 60 * 1000 - 23 * 1000;
      state.totalSeconds = 15 * 60 + 23;
      setTimeout(function() { showCertificate(); }, 300);
    }
    // 连点 3 下标题也可触发演示
    var title = byId("sheep-level-text");
    if (title) {
      var sheepTapCount = 0;
      var sheepTapTimer = null;
      title.addEventListener("click", function() {
        sheepTapCount++;
        if (sheepTapTimer) clearTimeout(sheepTapTimer);
        if (sheepTapCount >= 3) {
          sheepTapCount = 0;
          state.startTimestamp = Date.now() - 8 * 60 * 1000 - 42 * 1000;
          state.totalSeconds = 8 * 60 + 42;
          showCertificate();
        } else {
          sheepTapTimer = setTimeout(function() { sheepTapCount = 0; }, 800);
        }
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();