(function() {
  const CARD_W = 52;
  const CARD_H = 62;
  const GAP = 8;
  const CELL_W = CARD_W + GAP;
  const CELL_H = CARD_H + GAP;
  const SLOT_SIZE = 7;
  const TYPES_L1 = ["🐑","🌱","🍎","🍄","🐛","🌸"];
  const TYPES_L2 = ["🐑","🌱","🍎","🍄","🐛","🌸","🌳","🌼","🐞"];
  const $ = (id) => document.getElementById(id);
  const boardEl = $("sheep-board");
  const slotEl = $("sheep-slot");
  const modal = $("sheep-result-modal");
  let currentLevel = 1;
  let cards = [];
  let slotCards = [];
  let undoStack = [];
  let totalCards = 0;
  let gameActive = false;
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      let t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function genPositions(level) {
    const list = [];
    if (level === 1) {
      for (let r=0;r<3;r++) for (let c=0;c<4;c++) list.push({x:c*CELL_W,y:r*CELL_H,layer:1});
      for (let r=0;r<2;r++) for (let c=0;c<3;c++) list.push({x:c*CELL_W+CELL_W/2,y:r*CELL_H+CELL_H/2,layer:2});
    } else {
      for (let r=0;r<4;r++) for (let c=0;c<6;c++) list.push({x:c*CELL_W,y:r*CELL_H,layer:1});
      for (let r=0;r<3;r++) for (let c=0;c<6;c++) list.push({x:c*CELL_W+CELL_W/2,y:r*CELL_H+CELL_H/2,layer:2});
      for (let r=0;r<2;r++) for (let c=0;c<6;c++) list.push({x:c*CELL_W+CELL_W,y:r*CELL_H+CELL_H,layer:3});
    }
    return list;
  }
  function genPool(level, count) {
    const types = level === 1 ? TYPES_L1 : TYPES_L2;
    const perType = Math.floor(count / types.length);
    const pool = [];
    for (let k=0;k<types.length;k++) for (let i=0;i<perType;i++) pool.push(types[k]);
    while (pool.length < count) pool.push(types[pool.length % types.length]);
    return shuffle(pool);
  }
  function getBoardSize(level) {
    if (level === 1) return {w: 4*CELL_W, h: 3*CELL_H};
    return {w: 7*CELL_W, h: 4*CELL_H};
  }
  function isTop(card) {
    if (card.removed) return false;
    const cx = card.x + CARD_W/2, cy = card.y + CARD_H/2;
    for (let i=0;i<cards.length;i++) {
      const o = cards[i];
      if (o === card || o.removed) continue;
      if (o.layer <= card.layer) continue;
      if (cx >= o.x && cx <= o.x + CARD_W && cy >= o.y && cy <= o.y + CARD_H) return false;
    }
    return true;
  }
  function refreshLock() {
    for (let i=0;i<cards.length;i++) {
      const c = cards[i];
      if (!c.el) continue;
      if (c.removed) { c.el.style.display = "none"; continue; }
      if (isTop(c)) c.el.classList.remove("sheep-card-locked");
      else c.el.classList.add("sheep-card-locked");
    }
  }
  function refreshInfo() {
    $("sheep-info-level").textContent = currentLevel;
    let remain = 0;
    for (let i=0;i<cards.length;i++) if (!cards[i].removed) remain++;
    $("sheep-info-remain").textContent = remain;
    $("sheep-info-progress").textContent = Math.round((1-remain/totalCards)*100)+"%";
  }  function renderBoard() {
    boardEl.innerHTML = "";
    const size = getBoardSize(currentLevel);
    boardEl.style.width = size.w + "px";
    boardEl.style.height = size.h + "px";
    for (let i=0;i<cards.length;i++) {
      const c = cards[i];
      const el = document.createElement("div");
      el.className = "sheep-card";
      el.style.position = "absolute";
      el.style.left = c.x + "px";
      el.style.top = c.y + "px";
      el.style.width = CARD_W + "px";
      el.style.height = CARD_H + "px";
      el.style.zIndex = c.layer * 10;
      el.textContent = c.type;
      el.addEventListener("click", () => onClickCard(c));
      c.el = el;
      boardEl.appendChild(el);
    }
    refreshLock();
  }
  function renderSlot() {
    slotEl.innerHTML = "";
    for (let i=0;i<SLOT_SIZE;i++) {
      const cell = document.createElement("div");
      cell.className = "sheep-slot-cell";
      if (slotCards[i]) {
        const cardEl = document.createElement("div");
        cardEl.className = "sheep-slot-card";
        cardEl.textContent = slotCards[i].type;
        cell.appendChild(cardEl);
      }
      slotEl.appendChild(cell);
    }
  }
  function onClickCard(card) {
    if (!gameActive) return;
    if (card.removed || !isTop(card)) return;
    card.removed = true;
    card.el.style.display = "none";
    slotCards.push({type: card.type});
    undoStack.push(card.id);
    renderSlot();
    refreshLock();
    refreshInfo();
    checkMatch();
    setTimeout(checkGameState, 180);
  }
  function checkMatch() {
    const counts = {};
    for (let i=0;i<slotCards.length;i++) counts[slotCards[i].type] = (counts[slotCards[i].type]||0)+1;
    let matched = null;
    for (const t in counts) if (counts[t] >= 3) { matched = t; break; }
    if (matched) {
      const idx = [];
      for (let i=0;i<slotCards.length && idx.length<3;i++) if (slotCards[i].type === matched) idx.push(i);
      for (let i=idx.length-1;i>=0;i--) slotCards.splice(idx[i],1);
      undoStack = [];
      renderSlot();
    }
  }
  function checkGameState() {
    const remaining = cards.filter(c => !c.removed).length;
    if (remaining === 0 && slotCards.length === 0) { showResult(true); return; }
    if (slotCards.length >= SLOT_SIZE) {
      const counts = {};
      for (let i=0;i<slotCards.length;i++) counts[slotCards[i].type] = (counts[slotCards[i].type]||0)+1;
      let canMatch = false;
      for (const t in counts) if (counts[t] >= 3) canMatch = true;
      if (!canMatch) showResult(false);
    }
  }
  function showResult(win) {
    gameActive = false;
    modal.style.display = "flex";
    modal.classList.add("sheep-modal-active");
    $("sheep-modal-emoji").textContent = win ? "🎉" : "😵";
    $("sheep-modal-title").textContent = win ? "恭喜通关！" : "挑战失败";
    $("sheep-modal-subtitle").textContent = win ? "成功消除所有牌" : "卡槽已满，再试一次吧";
  }
  function hideResult() {
    modal.style.display = "none";
    modal.classList.remove("sheep-modal-active");
  }  function startGame(level) {
    currentLevel = level;
    const positions = genPositions(level);
    const pool = genPool(level, positions.length);
    cards = [];
    for (let i=0;i<positions.length;i++) {
      cards.push({id:"c"+i, type:pool[i], x:positions[i].x, y:positions[i].y, layer:positions[i].layer, removed:false, el:null});
    }
    totalCards = cards.length;
    slotCards = [];
    undoStack = [];
    gameActive = true;
    $("sheep-level-panel").style.display = "none";
    $("sheep-game-panel").style.display = "block";
    $("sheep-level-text").textContent = level === 1 ? "第1关" : "第2关";
    hideResult();
    renderBoard();
    renderSlot();
    refreshInfo();
  }
  function backToLevels() {
    // 返回主导航页
    window.location.href = "index.html";
  }
  function showLevels() {
    $("sheep-game-panel").style.display = "none";
    $("sheep-level-panel").style.display = "block";
    $("sheep-level-text").textContent = "羊了个羊";
    hideResult();
  }
  function doUndo() {
    if (!gameActive || undoStack.length === 0) return;
    const lastId = undoStack.pop();
    const card = null;
    for (let i=0;i<cards.length;i++) if (cards[i].id === lastId) { cards[i].removed = false; if (cards[i].el) cards[i].el.style.display = "flex"; break; }
    if (slotCards.length > 0) slotCards.pop();
    renderSlot();
    refreshLock();
    refreshInfo();
  }
  function doShuffle() {
    if (!gameActive) return;
    const actives = cards.filter(c => !c.removed);
    const types = actives.map(c => c.type);
    shuffle(types);
    for (let i=0;i<actives.length;i++) actives[i].type = types[i];
    renderBoard();
  }
  document.querySelectorAll(".sheep-level-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lv = parseInt(btn.getAttribute("data-level") || "1", 10);
      startGame(lv);
    });
  });
  $("sheep-undo-btn").addEventListener("click", doUndo);
  $("sheep-shuffle-btn").addEventListener("click", doShuffle);
  $("sheep-restart-btn").addEventListener("click", () => startGame(currentLevel));
  $("sheep-modal-back-btn").addEventListener("click", backToLevels);
  $("sheep-modal-again-btn").addEventListener("click", () => startGame(currentLevel));
  const bk = $("back-btn"); if (bk) bk.addEventListener("click", backToLevels);
  const mn = $("sheep-menu"); if (mn) mn.addEventListener("click", backToLevels);
})();