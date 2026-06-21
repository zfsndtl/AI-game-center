(function() {
  // 原版羊了个羊风格 - 网格叠层
  const CARD_W = 52;      // 卡片宽度（含间距）
  const CARD_H = 52;      // 卡片高度
  const GRID_COLS = 6;    // 列数
  const GRID_ROWS = 5;    // 行数
  const LAYERS = 3;       // 层数
  const MATCH_COUNT = 3;  // 三消
  const SLOT_SIZE = 7;    // 槽位数

  // 原版风格的图案（与截图对应：花、树、蘑菇、苹果、苗、羊、瓢虫、毛毛虫、向日葵等）
  const PATTERNS = ["🌸", "🌳", "🍄", "🍎", "🌱", "🐑", "🐞", "🐛", "🌻"];

  let state = { cards: [], slotCards: [], totalCards: 0, gameActive: false, lastActions: [], level: 1 };

  function byId(id) { return document.getElementById(id); }
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function overlaps(a, b) {
    return !(a.x + CARD_W <= b.x + 4 || b.x + CARD_W <= a.x + 4 ||
             a.y + CARD_H <= b.y + 4 || b.y + CARD_H <= a.y + 4);
  }

  // 生成恰好 target 张卡片的位置；target 从 {69, 72, 75, 78, 81} 中随机
  function randomTarget() {
    var choices = [69, 72, 75, 78, 81];
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function genPositions(innerW, innerH, target) {
    // 让卡片居中放置
    var gridTotalW = GRID_COLS * CARD_W;
    var gridTotalH = GRID_ROWS * CARD_H;
    var offsetX = (innerW - gridTotalW) / 2;
    var offsetY = (innerH - gridTotalH) / 2;

    // 先把每层的所有网格位置全部生成出来，然后打乱截取前 target 个
    var positions = [];
    for (var layer = 0; layer < LAYERS; layer++) {
      var layerShiftX = layer % 2 === 1 ? CARD_W * 0.5 : 0;
      var layerShiftY = layer % 2 === 1 ? CARD_H * 0.5 : 0;
      for (var r = 0; r < GRID_ROWS; r++) {
        for (var c = 0; c < GRID_COLS; c++) {
          positions.push({
            x: offsetX + c * CARD_W + layerShiftX,
            y: offsetY + r * CARD_H + layerShiftY,
            layer: layer
          });
        }
      }
    }
    shuffleArr(positions);
    if (positions.length > target) positions.length = target;
    return positions;
  }

  // 生成图案池：保证恰好 count 张，且每种图案至少 3 张
  function genPool(count) {
    var types = PATTERNS.slice();
    shuffleArr(types);
    var activeTypes = types.slice(0, 8);
    // 为每种图案预分配 3 张基础量
    var counts = [];
    for (var u = 0; u < activeTypes.length; u++) counts.push(MATCH_COUNT);
    var used = activeTypes.length * MATCH_COUNT;
    // 剩下的位置每 3 张一组随机分给某一种图案
    while (used + MATCH_COUNT <= count) {
      var pickIdx = Math.floor(Math.random() * activeTypes.length);
      counts[pickIdx] += MATCH_COUNT;
      used += MATCH_COUNT;
    }
    // 还剩 0/1/2 张：全部给最后一个图案
    while (used < count) { counts[0]++; used++; }
    // 最终构造 pool
    var pool = [];
    for (var k = 0; k < activeTypes.length; k++) {
      for (var kk = 0; kk < counts[k]; kk++) pool.push(activeTypes[k]);
    }
    return shuffleArr(pool);
  }

  function buildCards() {
    var board = byId("sheep-simple-board");
    var rect = board.getBoundingClientRect();
    var target = randomTarget();
    var positions = genPositions(rect.width, rect.height, target);
    var pool = genPool(positions.length);
    var cards = [];
    for (var i = 0; i < positions.length; i++) {
      cards.push({
        id: "c" + i,
        x: positions[i].x,
        y: positions[i].y,
        layer: positions[i].layer,
        type: pool[i],
        removed: false,
        slot: false
      });
    }
    return cards;
  }

  function renderCards() {
    var board = byId("sheep-simple-board");
    board.innerHTML = "";
    for (var i = 0; i < state.cards.length; i++) {
      var c = state.cards[i];
      if (c.removed) continue;
      var el = document.createElement("div");
      el.className = "sheep-simple-card";
      el.id = "sheep-simple-card-" + c.id;
      el.style.left = c.x + "px";
      el.style.top = c.y + "px";
      el.style.zIndex = 10 + c.layer * 10;
      el.textContent = c.type || PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
      el.dataset.id = c.id;
      el.addEventListener("click", function(evt) { onClickCard(evt.currentTarget.dataset.id); });
      board.appendChild(el);
    }
    refreshLockState();
    updateInfo();
  }

  function isCardBlocked(card) {
    for (var i = 0; i < state.cards.length; i++) {
      var other = state.cards[i];
      if (other.removed || other.id === card.id || other.slot) continue;
      if (other.layer > card.layer && overlaps(other, card)) return true;
    }
    return false;
  }

  function refreshLockState() {
    for (var i = 0; i < state.cards.length; i++) {
      var c = state.cards[i];
      if (c.removed || c.slot) continue;
      var el = byId("sheep-simple-card-" + c.id);
      if (!el) continue;
      if (isCardBlocked(c)) el.classList.add("sheep-simple-locked");
      else el.classList.remove("sheep-simple-locked");
    }
  }

  function renderSlot() {
    var items = byId("sheep-simple-slot").children;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (i < state.slotCards.length) {
        item.textContent = state.slotCards[i].type;
        item.classList.add("sheep-simple-slot-filled");
      } else {
        item.textContent = "";
        item.classList.remove("sheep-simple-slot-filled");
      }
    }
  }

  function updateInfo() {
    var remaining = 0;
    for (var i = 0; i < state.cards.length; i++) {
      if (!state.cards[i].removed) remaining++;
    }
    byId("sheep-simple-level").textContent = state.level;
    byId("sheep-simple-remain").textContent = remaining;
    var progress = 0;
    if (state.totalCards > 0) progress = Math.round((1 - remaining / state.totalCards) * 100);
    if (progress < 0) progress = 0;
    byId("sheep-simple-progress").textContent = progress + "%";
  }

  function onClickCard(id) {
    if (!state.gameActive) return;
    var card = null;
    for (var i = 0; i < state.cards.length; i++) {
      if (state.cards[i].id === id && !state.cards[i].removed && !state.cards[i].slot) { card = state.cards[i]; break; }
    }
    if (!card) return;
    if (isCardBlocked(card)) return;
    if (state.slotCards.length >= SLOT_SIZE) return;
    card.slot = true;
    state.slotCards.push(card);
    var el = byId("sheep-simple-card-" + id);
    if (el) el.remove();
    renderSlot();
    state.lastActions.push({ cardId: id });
    checkMatch();
    refreshLockState();
    updateInfo();
    setTimeout(function() { checkEnd(); }, 180);
  }

  function checkMatch() {
    var typeCount = {};
    for (var i = 0; i < state.slotCards.length; i++) {
      var t = state.slotCards[i].type;
      typeCount[t] = (typeCount[t] || 0) + 1;
    }
    var removedAny = false;
    for (var t in typeCount) {
      if (typeCount[t] >= MATCH_COUNT) {
        var toRemove = MATCH_COUNT;
        var kept = [];
        for (var j = 0; j < state.slotCards.length; j++) {
          if (state.slotCards[j].type === t && toRemove > 0) {
            state.slotCards[j].removed = true;
            toRemove--;
            removedAny = true;
          } else {
            kept.push(state.slotCards[j]);
          }
        }
        state.slotCards = kept;
      }
    }
    if (removedAny) {
      renderSlot();
      var slotItems = byId("sheep-simple-slot").children;
      for (var k = 0; k < slotItems.length; k++) {
        slotItems[k].classList.add("sheep-simple-slot-pop");
        (function(idx) { setTimeout(function() { var it = byId("sheep-simple-slot").children[idx]; if (it) it.classList.remove("sheep-simple-slot-pop"); }, 400); })(k);
      }
    }
  }

  function checkEnd() {
    var remaining = 0;
    for (var i = 0; i < state.cards.length; i++) {
      if (!state.cards[i].removed) remaining++;
    }
    if (remaining === 0) {
      state.gameActive = false;
      showModal("🎉 通关成功", "恭喜完成全部消除！");
      return;
    }
    if (state.slotCards.length >= SLOT_SIZE) {
      var typeCount = {};
      for (var i = 0; i < state.slotCards.length; i++) {
        var t = state.slotCards[i].type;
        typeCount[t] = (typeCount[t] || 0) + 1;
      }
      var canElim = false;
      for (var tt in typeCount) { if (typeCount[tt] >= MATCH_COUNT) { canElim = true; break; } }
      if (!canElim) {
        state.gameActive = false;
        showModal("❌ 挑战失败", "槽位已满，点击重玩再试一次吧！");
      }
    }
  }

  function showModal(title, body) {
    byId("sheep-simple-modal-title").textContent = title;
    byId("sheep-simple-modal-body").textContent = body;
    var m = byId("sheep-simple-modal");
    m.classList.add("sheep-simple-modal-active");
  }
  function hideModal() {
    byId("sheep-simple-modal").classList.remove("sheep-simple-modal-active");
  }

  function doUndo() {
    if (!state.gameActive) return;
    if (state.lastActions.length === 0) return;
    state.lastActions.pop();
    if (state.slotCards.length === 0) return;
    var lastSlotCard = state.slotCards.pop();
    lastSlotCard.slot = false;
    renderSlot();
    var board = byId("sheep-simple-board");
    var el = document.createElement("div");
    el.className = "sheep-simple-card";
    el.id = "sheep-simple-card-" + lastSlotCard.id;
    el.style.left = lastSlotCard.x + "px";
    el.style.top = lastSlotCard.y + "px";
    el.style.zIndex = 10 + lastSlotCard.layer * 10;
    el.textContent = lastSlotCard.type;
    el.dataset.id = lastSlotCard.id;
    el.addEventListener("click", function(evt) { onClickCard(evt.currentTarget.dataset.id); });
    board.appendChild(el);
    refreshLockState();
  }

  function doShuffle() {
    if (!state.gameActive) return;
    var alive = [];
    for (var i = 0; i < state.cards.length; i++) {
      if (!state.cards[i].removed && !state.cards[i].slot) alive.push(state.cards[i]);
    }
    var types = [];
    for (var j = 0; j < alive.length; j++) types.push(alive[j].type);
    types = shuffleArr(types);
    for (var k = 0; k < alive.length; k++) {
      alive[k].type = types[k];
      var el = byId("sheep-simple-card-" + alive[k].id);
      if (el) el.textContent = types[k];
    }
    refreshLockState();
  }

  function startGame() {
    hideModal();
    state.cards = buildCards();
    state.totalCards = state.cards.length;
    state.slotCards = [];
    state.gameActive = true;
    state.lastActions = [];
    renderCards();
    renderSlot();
  }

  function init() {
    byId("sheep-simple-back").addEventListener("click", function() { window.location.href = "index.html"; });
    byId("sheep-simple-menu").addEventListener("click", function() { window.location.href = "index.html"; });
    byId("sheep-simple-undo-btn").addEventListener("click", doUndo);
    byId("sheep-simple-shuffle-btn").addEventListener("click", doShuffle);
    byId("sheep-simple-restart-btn").addEventListener("click", startGame);
    byId("sheep-simple-modal-restart").addEventListener("click", startGame);
    byId("sheep-simple-modal-back").addEventListener("click", function() { window.location.href = "index.html"; });
    setTimeout(startGame, 50);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();