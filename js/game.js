/**
 * 五子棋 - 纯原生 HTML5 实现
 *
 * 游戏模式:
 *   1) 双人对战 (同屏轮流点击)
 *   2) 人机对战 (简单启发式 AI)
 *   3) 房间对战 (通过 BroadcastChannel 在不同浏览器标签页互通)
 *
 * 房间机制:
 *   - 创建房间时生成 4 位随机数字作为房间号
 *   - BroadcastChannel('gomoku-<4位数字>') 作为通信频道
 *   - 在不同标签页输入相同 4 位数字即可进入同一对局
 */
(function () {
    'use strict';

    // ============= 常量 =============
    var BOARD_SIZE = 15;
    var EMPTY = 0;
    var BLACK = 1;     // 房主 / 先手
    var WHITE = 2;     // 加入者 / 后手
    var CHANNEL_PREFIX = 'gomoku-room-';
    var LS_PREFIX = 'gomoku-ls-';
    var LS_ACK_PREFIX = 'gomoku-ack-';

    // 每个标签页的唯一身份（用于过滤自己发送的消息）
    // 使用时间戳 + 3 个随机数确保唯一性，避免两个标签页在几乎同时加载时产生相同的 ID
    var MY_ID = 'p_' + Date.now().toString(36) + '_' +
        Math.random().toString(36).slice(2, 8) +
        Math.random().toString(36).slice(2, 8);

    // 调试日志（在浏览器控制台查看）
    function log() {
        try {
            var args = Array.prototype.slice.call(arguments);
            console.log.apply(console, ['[gomoku ' + MY_ID.slice(0, 5) + ']'].concat(args));
        } catch (e) {}
    }

    // 方向（用于胜负判定）
    var DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

    // ============= 状态 =============
    var state = {
        board: [],
        currentPlayer: BLACK,
        gameOver: false,
        winner: null,
        history: [],
        moveCount: 0,
        // 模式： pvp | pve | online
        mode: 'pvp',
        // 联机模式下我自己的颜色
        myColor: BLACK,
        // 联机模式下的房间号
        roomCode: null
    };

    var channel = null;          // BroadcastChannel 实例
    var storageHandler = null;   // localStorage storage 事件处理函数
    var dom = {};                // DOM 引用

    // ============= 初始化 =============
    function init() {
        cacheDom();
        bindEvents();
    }

    function cacheDom() {
        // 页面
        dom.landingPage = document.getElementById('landing-page');
        dom.homePage = document.getElementById('home-page');
        dom.gamePage = document.getElementById('game-page');
        dom.roomPage = document.getElementById('room-page');
        dom.joinPage = document.getElementById('join-page');

        dom.pages = {
            landing: dom.landingPage,
            home: dom.homePage,
            game: dom.gamePage,
            room: dom.roomPage,
            join: dom.joinPage
        };

        // 模式按钮
        dom.modeBtns = document.querySelectorAll('.mode-btn');

        // 游戏页元素
        dom.board = document.getElementById('board');
        dom.boardLines = dom.board.querySelector('.board-lines');
        dom.boardOverlay = dom.board.querySelector('.board-overlay');
        dom.boardPieces = dom.board.querySelector('.board-pieces');
        dom.backBtn = document.getElementById('back-btn');
        dom.undoBtn = document.getElementById('undo-btn');
        dom.restartBtn = document.getElementById('restart-btn');
        dom.turnPiece = document.getElementById('turn-piece');
        dom.turnText = document.getElementById('turn-text');
        dom.playerBlack = document.getElementById('player-black');
        dom.playerWhite = document.getElementById('player-white');
        dom.playerBlackName = document.getElementById('player-black-name');
        dom.playerWhiteName = document.getElementById('player-white-name');

        // 执色提示（联机模式下显示）
        dom.myColorBanner = document.getElementById('my-color-banner');
        dom.myColorIndicator = document.getElementById('my-color-indicator');
        dom.myColorText = document.getElementById('my-color-text');

        // 胜负弹窗
        dom.resultModal = document.getElementById('result-modal');
        dom.resultPiece = document.getElementById('result-piece');
        dom.resultTitle = document.getElementById('result-title');
        dom.resultSubtitle = document.getElementById('result-subtitle');
        dom.modalHomeBtn = document.getElementById('modal-home-btn');
        dom.modalRestartBtn = document.getElementById('modal-restart-btn');

        // 房间页
        dom.roomCodeDisplay = document.getElementById('room-code-display');
        dom.roomTip = document.getElementById('room-tip');
        dom.roomStatus = document.getElementById('room-status');
        dom.copyCodeBtn = document.getElementById('copy-code-btn');

        // 加入房间页
        dom.codeInputRow = document.getElementById('code-input-row');
        dom.codeDigits = dom.codeInputRow.querySelectorAll('.code-digit');
        dom.joinStatus = document.getElementById('join-status');
        dom.joinStatusText = dom.joinStatus.querySelector('.status-text');
        dom.confirmJoinBtn = document.getElementById('confirm-join-btn');
    }

    function bindEvents() {
        // === 入口页：五子棋卡片点击
        var gomokuCard = document.querySelector('.landing-card-gomoku');
        if (gomokuCard) {
            gomokuCard.addEventListener('click', function (e) {
                if (e.target.closest('a') && e.currentTarget.getAttribute('href') === '#gomoku') {
                    // 阻止默认锚点跳转，走内部页面切换
                    e.preventDefault();
                }
                // 重置五子棋状态 + 进入五子棋首页
                resetGameState();
                showPage('home');
            });
        }

        // 返回首页 (从任意页面 -> landing)
        document.querySelectorAll('[data-action="back-landing"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                leaveRoom();
                showPage('landing');
            });
        });

        // 游戏页顶部"返回首页"按钮
        var backLandingBtn = document.getElementById('back-landing-btn');
        if (backLandingBtn) {
            backLandingBtn.addEventListener('click', function () {
                leaveRoom();
                showPage('landing');
            });
        }

        // 模式选择按钮
        dom.modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var mode = btn.getAttribute('data-mode');
                handleModeSelect(mode);
            });
        });

        // 房间 / 加入页的返回按钮
        document.querySelectorAll('[data-action="back-home"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                leaveRoom();
                showPage('home');
            });
        });

        // 游戏页返回
        dom.backBtn.addEventListener('click', function () {
            leaveRoom();
            showPage('home');
        });

        // 悔棋 / 重开
        dom.undoBtn.addEventListener('click', handleUndo);
        dom.restartBtn.addEventListener('click', handleRestart);
        dom.modalRestartBtn.addEventListener('click', handleRestart);
        dom.modalHomeBtn.addEventListener('click', function () {
            hideModal();
            leaveRoom();
            showPage('home');
        });

        // 复制房间号
        dom.copyCodeBtn.addEventListener('click', function () {
            if (!state.roomCode) return;
            var text = state.roomCode;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    var old = dom.copyCodeBtn.querySelector('.mode-title');
                    old.textContent = '✓ 已复制';
                    setTimeout(function () { old.textContent = '复制房间号'; }, 1500);
                }).catch(function () { fallbackCopy(text); });
            } else {
                fallbackCopy(text);
            }
        });

        // 4 位数字输入格自动跳焦
        dom.codeDigits.forEach(function (input, idx) {
            input.addEventListener('input', function () {
                var v = input.value.replace(/[^0-9]/g, '');
                input.value = v;
                if (v) {
                    input.classList.add('filled');
                    if (idx < dom.codeDigits.length - 1) {
                        dom.codeDigits[idx + 1].focus();
                    }
                } else {
                    input.classList.remove('filled');
                }
                dom.joinStatus.style.display = 'none';
            });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Backspace' && !input.value && idx > 0) {
                    dom.codeDigits[idx - 1].focus();
                } else if (e.key === 'Enter') {
                    handleJoinClick();
                }
            });
        });

        dom.confirmJoinBtn.addEventListener('click', handleJoinClick);

        // 关闭页面时通知对手
        window.addEventListener('beforeunload', function () {
            if (state.roomCode) {
                try {
                    // 双通道直接发送（走 sendMessage 也可以，但这里要在页面关闭前最快发出）
                    if (channel) channel.postMessage({ type: 'opponent-left', _sender: 'leaver' });
                    var key = LS_PREFIX + state.roomCode;
                    localStorage.setItem(key, JSON.stringify({ type: 'opponent-left', _sender: 'leaver', _ts: Date.now() }));
                } catch (e) {}
            }
        });
    }

    // 离开房间（回到首页时调用）
    function leaveRoom() {
        if (state.roomCode) {
            // 先通知对手
            try {
                if (channel) channel.postMessage({ type: 'opponent-left', _sender: 'leaver' });
                var key = LS_PREFIX + state.roomCode;
                localStorage.setItem(key, JSON.stringify({ type: 'opponent-left', _sender: 'leaver', _ts: Date.now() }));
            } catch (e) {}
        }
        closeChannel();
        if (state.mode === 'online') state.mode = 'pvp';
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(textarea);
        var old = dom.copyCodeBtn.querySelector('.mode-title');
        if (old) {
            var original = old.textContent;
            old.textContent = '✓ 已复制';
            setTimeout(function () { old.textContent = original; }, 1500);
        }
    }

    // ============= 页面切换 =============
    function showPage(name) {
        Object.keys(dom.pages).forEach(function (key) {
            dom.pages[key].classList.remove('page-active');
        });
        if (dom.pages[name]) {
            dom.pages[name].classList.add('page-active');
        }
    }

    // ============= 模式选择 =============
    function handleModeSelect(mode) {
        if (mode === 'pvp') {
            // 双人对战 - 本地
            state.mode = 'pvp';
            startLocalGame();
        } else if (mode === 'pve') {
            // 人机对战
            state.mode = 'pve';
            startLocalGame();
        } else if (mode === 'create-room') {
            handleCreateRoom();
        } else if (mode === 'join-room') {
            // 进入加入房间页，清空输入
            dom.codeDigits.forEach(function (d) {
                d.value = '';
                d.classList.remove('filled');
            });
            dom.joinStatus.style.display = 'none';
            showPage('join');
            setTimeout(function () { dom.codeDigits[0].focus(); }, 50);
        }
    }

    function startLocalGame() {
        resetGameState();
        renderBoard();
        updateStatusUI();
        updateUndoBtn();
        updatePlayerNames();
        showPage('game');
    }

    // ============= 房间创建 =============
    function handleCreateRoom() {
        // 生成 4 位随机数字
        var code = String(Math.floor(1000 + Math.random() * 9000));
        enterOnlineRoom(code, 'host');
    }

    // ============= 加入房间 =============
    function handleJoinClick() {
        var code = '';
        dom.codeDigits.forEach(function (d) { code += d.value; });
        if (!/^\d{4}$/.test(code)) {
            showJoinError('请输入完整的 4 位数字');
            return;
        }
        enterOnlineRoom(code, 'join');
    }

    // ============= 房间发现 + 执色协商 =============
    // 核心机制：
    //   1. 每个 peer 在 localStorage 写入独立的"声明 key"：
    //      gomoku-declare-{code}-{MY_ID} = { ts: Date.now() }
    //   2. 每个 peer 定期扫描所有 gomoku-declare-{code}-* 的 key，
    //      收集所有 peer ID（包括自己），然后按字符串排序：
    //      - 索引 0 → 黑棋（先手）
    //      - 索引 1 → 白棋（后手）
    //   3. 两端都能得到完全一致的排序结果，所以执色分配绝对一致
    //   4. 游戏消息 key：gomoku-msg-{code}-{senderId}-{type}-{seq} = { ... }
    function enterOnlineRoom(code, roleHint) {
        state.myColor = null;
        state.opponentId = null;
        state.mode = 'online';
        resetGameState();
        openChannel(code);

        dom.roomCodeDisplay.textContent = code;
        if (roleHint === 'host') {
            dom.roomTip.textContent = '请在另一个浏览器标签页输入此 4 位数字加入';
        } else {
            dom.roomTip.textContent = '已输入房间号，等待对手连接…';
        }
        setRoomStatus('等待对手连接…', true);
        showPage('room');
        log('ENTER room code=' + code + ' myID=' + MY_ID);

        // 先清理过期的声明 key（超过 15 秒视为无效，避免误伤刚加入的对手）
        cleanupDeclareKeys(code, 15000);
        // 立即写入自己的声明 key
        writeDeclare(code);

        var tick = 0;
        var timer = setInterval(function () {
            // 进入游戏页后，继续周期性写入声明，避免被对方误判为离线
            if (state.mode === 'online' && dom.gamePage.classList.contains('page-active')) {
                writeDeclare(code);
                if (tick++ > 60) clearInterval(timer);
                return;
            }
            if (tick++ > 150) {
                clearInterval(timer);
                return;
            }
            writeDeclare(code);
            // 扫描所有 peer 并尝试进入游戏
            var peerIds = collectAllPeerIds(code);
            if (peerIds.length >= 2) {
                // 收集到至少 2 个 peer，开始执色协商
                peerIds.sort(); // 字符串字典序排序
                var myIndex = peerIds.indexOf(MY_ID);
                if (myIndex === 0) {
                    state.myColor = BLACK;
                    state.opponentId = peerIds[1];
                } else if (myIndex === 1) {
                    state.myColor = WHITE;
                    state.opponentId = peerIds[0];
                } else {
                    // 超过 2 个 peer，取前两个有效对手中最新的一个
                    // 但这里我们只要前 2 个 peer 即可，索引 0 黑 1 白
                    state.myColor = MY_ID < peerIds[0] ? BLACK : WHITE;
                    state.opponentId = peerIds[0];
                }
                clearInterval(timer);
                log('JOIN GAME: myColor=' + state.myColor + ' peerIds=[' + peerIds.join(',') + '] myIndex=' + myIndex);
                enterOnlineGame();
            }
        }, 500);
    }

    // 写入自己的声明 key（让对手知道我的存在）
    function writeDeclare(code) {
        try {
            var key = 'gomoku-declare-' + code + '-' + MY_ID;
            localStorage.setItem(key, JSON.stringify({ ts: Date.now() }));
        } catch (e) {
            log('writeDeclare failed:', e);
        }
    }

    // 收集所有有效的 peer ID（包括自己的），按时间戳从新到旧排序
    function collectAllPeerIds(code) {
        var found = [];
        try {
            var prefix = 'gomoku-declare-' + code + '-';
            var now = Date.now();
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (!key || key.indexOf(prefix) !== 0) continue;
                var peerId = key.substring(prefix.length);
                var raw = localStorage.getItem(key);
                if (!raw) continue;
                try {
                    var data = JSON.parse(raw);
                    if (data.ts && now - data.ts < 10000) {
                        found.push({ id: peerId, ts: data.ts });
                    }
                } catch (e) {}
            }
        } catch (e) {
            log('collectAllPeerIds failed:', e);
        }
        // 按时间戳从新到旧排序（优先选择最近活跃的 peer）
        found.sort(function (a, b) { return b.ts - a.ts; });
        var ids = [];
        for (var j = 0; j < found.length; j++) ids.push(found[j].id);
        return ids;
    }

    // 清理过期的声明 key
    function cleanupDeclareKeys(code, olderThanMs) {
        try {
            var prefix = 'gomoku-declare-' + code + '-';
            var now = Date.now();
            var toRemove = [];
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (!key || key.indexOf(prefix) !== 0) continue;
                var peerId = key.substring(prefix.length);
                if (peerId === MY_ID) continue; // 自己的 key 不清理（会被自己覆盖）
                var raw = localStorage.getItem(key);
                try {
                    var data = JSON.parse(raw);
                    if (!data.ts || now - data.ts > olderThanMs) {
                        toRemove.push(key);
                    }
                } catch (ex) {
                    toRemove.push(key);
                }
            }
            for (var j = 0; j < toRemove.length; j++) {
                try { localStorage.removeItem(toRemove[j]); } catch (e) {}
            }
        } catch (e) {}
    }

    function showJoinError(msg) {
        dom.joinStatus.style.display = 'flex';
        dom.joinStatusText.textContent = msg;
    }

    // ============= 房间通信（使用独立 localStorage key） =============
    // 心跳：gomoku-room-{code}-{myId} = { ts }
    // 消息：gomoku-msg-{code}-{senderId}-{type}-{seq} = { payload }
    // 每个 peer 通过轮询来接收消息，不依赖 BroadcastChannel / storage event

    var pollTimer = null;
    var processedMsgKeys = {}; // 已处理消息去重

    function openChannel(code) {
        closeChannel();
        state.roomCode = code;
        log('connecting to room:', code);

        // 轮询：每 300ms 检查一次消息（游戏中的 move/undo/restart 等）
        try {
            pollTimer = setInterval(function () {
                scanMessages(code);
            }, 300);
        } catch (err) {
            log('pollTimer error:', err);
        }
    }

    // 扫描并处理来自对手的消息（游戏页中使用）
    function scanMessages(code) {
        try {
            var msgPrefix = 'gomoku-msg-' + code + '-';
            var msgKeysToRemove = [];
            var now = Date.now();

            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (!key || key.indexOf(msgPrefix) !== 0) continue;
                if (processedMsgKeys[key]) {
                    // 已处理过的消息，延迟清理
                    var rawData = localStorage.getItem(key);
                    try {
                        var parsed = JSON.parse(rawData);
                        if (parsed._ts && now - parsed._ts > 3000) {
                            msgKeysToRemove.push(key);
                        }
                    } catch (e) {
                        msgKeysToRemove.push(key);
                    }
                    continue;
                }

                var raw = localStorage.getItem(key);
                if (!raw) continue;

                try {
                    var msg = JSON.parse(raw);
                    if (!msg || !msg.type) continue;
                    if (msg._sender === MY_ID) {
                        processedMsgKeys[key] = true;
                        continue;
                    }
                    if (msg._ts && now - msg._ts > 5000) {
                        processedMsgKeys[key] = true;
                        continue;
                    }
                    processedMsgKeys[key] = true;
                    log('RECEIVED (poll):', msg.type, 'row=' + msg.row, 'col=' + msg.col, 'player=' + msg.player);
                    handleChannelMessage(msg);
                } catch (err) {}
            }

            for (var j = 0; j < msgKeysToRemove.length; j++) {
                try { localStorage.removeItem(msgKeysToRemove[j]); } catch (e) {}
            }
        } catch (err) {}
    }

    function sendMessage(obj) {
        if (!state.roomCode) return;

        var msg = Object.assign({}, obj, {
            _sender: MY_ID,
            _ts: Date.now(),
            _seq: Date.now() + '-' + Math.random().toString(36).slice(2, 7)
        });

        log('SENDING:', msg.type);

        try {
            var key = 'gomoku-msg-' + state.roomCode + '-' + MY_ID + '-' + msg.type + '-' + msg._seq;
            localStorage.setItem(key, JSON.stringify(msg));
        } catch (e) {
            log('localStorage send failed:', e);
        }
    }

    function closeChannel() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        // 清理与当前房间相关的所有 localStorage keys（声明 key + 消息 key + 旧格式 key）
        if (state.roomCode) {
            try {
                var code = state.roomCode;
                var declarePrefix = 'gomoku-declare-' + code + '-';
                var msgPrefix = 'gomoku-msg-' + code + '-';
                var oldHeartbeatPrefix = 'gomoku-room-' + code + '-';
                var oldPrefix = LS_PREFIX + code;
                var keysToRemove = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (!key) continue;
                    if (key.indexOf(declarePrefix) === 0 ||
                        key.indexOf(msgPrefix) === 0 ||
                        key.indexOf(oldHeartbeatPrefix) === 0 ||
                        key.indexOf(oldPrefix) === 0) {
                        keysToRemove.push(key);
                    }
                }
                for (var j = 0; j < keysToRemove.length; j++) {
                    try { localStorage.removeItem(keysToRemove[j]); } catch (e) {}
                }
            } catch (e) {}
            state.roomCode = null;
        }
        _enteredGame = false;
        processedMsgKeys = {};
    }

    var channel = null; // 保留变量（不再使用），避免其他地方报错
    var storageHandler = null; // 保留变量（不再使用）

    function setRoomStatus(text, pulse) {
        // 仅在房间页可见时更新
        if (!dom.roomStatus) return;
        dom.roomStatus.style.display = 'flex';
        dom.roomStatus.querySelector('.status-text').textContent = text;
        if (pulse) {
            dom.roomStatus.querySelector('.status-dot').style.animation = 'pulse 1.2s ease-in-out infinite';
        } else {
            dom.roomStatus.querySelector('.status-dot').style.animation = 'none';
        }
    }

    // ============= 消息处理 =============
    // 防重复进入：一旦进入游戏页，就不要再从消息触发逻辑里再次进入
    var _enteredGame = false;

    // 比较两个 peer 的 MY_ID 大小，决定谁先执黑（避免双方都认为自己是黑棋）
    function pickMyColorByPeerId(peerId) {
        if (!peerId) return BLACK;
        // 字符串比较：id 较小的一方执黑
        return MY_ID < peerId ? BLACK : WHITE;
    }

    function enterOnlineGame() {
        // 必须在协商完执色后才进入
        if (state.myColor !== BLACK && state.myColor !== WHITE) {
            log('enterOnlineGame IGNORED: myColor not negotiated');
            return;
        }
        if (_enteredGame && dom.gamePage.classList.contains('page-active')) {
            renderPieces();
            updateStatusUI();
            updateUndoBtn();
            return;
        }
        _enteredGame = true;
        log('ENTERING online game, myColor=' + state.myColor);
        state.mode = 'online';
        updatePlayerNames();
        renderBoard();
        renderPieces();
        updateStatusUI();
        updateUndoBtn();
        hideModal();
        showPage('game');
        log('online game page displayed, mode=' + state.mode + ' currentPlayer=' + state.currentPlayer);
    }

    function handleChannelMessage(msg) {
        if (!msg || !msg.type) return;
        log('RECEIVED:', msg.type, 'myColor=' + state.myColor, 'opponentId=' + (state.opponentId || '?'), 'sender=' + (msg._sender || '?'));

        try {
            switch (msg.type) {
                case 'move': {
                    if (state.mode !== 'online') return;
                    if (msg.row === undefined || msg.col === undefined || msg.player === undefined) return;
                    if (!state.board || !state.board[msg.row]) return;
                    if (state.board[msg.row][msg.col] !== EMPTY) return;

                    state.board[msg.row][msg.col] = msg.player;
                    state.history.push({ row: msg.row, col: msg.col, player: msg.player });
                    state.moveCount++;
                    state.currentPlayer = msg.player === BLACK ? WHITE : BLACK;

                    var result = checkWin(msg.row, msg.col, msg.player);
                    if (result.isWin) {
                        state.gameOver = true;
                        state.winner = msg.player;
                    } else if (state.moveCount >= BOARD_SIZE * BOARD_SIZE) {
                        state.gameOver = true;
                        state.winner = null;
                    }
                    renderPieces();
                    updateStatusUI();
                    updateUndoBtn();
                    if (state.gameOver) showResultModal();
                    break;
                }
                case 'undo': {
                    if (state.mode !== 'online') return;
                    if (state.history.length === 0) return;
                    var last = state.history.pop();
                    state.board[last.row][last.col] = EMPTY;
                    state.moveCount = Math.max(0, state.moveCount - 1);
                    state.currentPlayer = last.player;
                    state.gameOver = false;
                    state.winner = null;
                    hideModal();
                    renderPieces();
                    updateStatusUI();
                    updateUndoBtn();
                    break;
                }
                case 'restart': {
                    if (state.mode !== 'online') return;
                    resetGameState();
                    renderPieces();
                    updateStatusUI();
                    updateUndoBtn();
                    hideModal();
                    break;
                }
                case 'game-over': {
                    state.gameOver = true;
                    state.winner = msg.winner;
                    updateStatusUI();
                    updateUndoBtn();
                    showResultModal();
                    break;
                }
                case 'opponent-left': {
                    if (state.mode !== 'online') return;
                    showOpponentLeftBanner();
                    break;
                }
            }
        } catch (err) {
            log('handleChannelMessage ERROR:', err);
        }
    }

    function showOpponentLeftBanner() {
        // 简单方案：在页面顶部加一个 banner，提示对手离开
        var existing = document.querySelector('.opponent-left-banner');
        if (existing) existing.remove();
        var banner = document.createElement('div');
        banner.className = 'opponent-left-banner';
        banner.textContent = '对手已离开房间，可以关闭页面重新开始';
        var container = dom.gamePage.querySelector('.game-container');
        if (container) container.insertBefore(banner, dom.gamePage.querySelector('.game-header').nextSibling || container.firstChild);
    }

    // ============= 游戏状态初始化 =============
    function resetGameState() {
        state.board = [];
        for (var i = 0; i < BOARD_SIZE; i++) {
            var row = [];
            for (var j = 0; j < BOARD_SIZE; j++) row.push(EMPTY);
            state.board.push(row);
        }
        state.currentPlayer = BLACK;
        state.gameOver = false;
        state.winner = null;
        state.history = [];
        state.moveCount = 0;
        // 清 banner
        var b = document.querySelector('.opponent-left-banner');
        if (b) b.remove();
    }

    function updatePlayerNames() {
        if (state.mode === 'online') {
            dom.playerBlackName.textContent = state.myColor === BLACK ? '我（黑）' : '对手（黑）';
            dom.playerWhiteName.textContent = state.myColor === WHITE ? '我（白）' : '对手（白）';
            // 显示执色提示 banner
            if (dom.myColorBanner) {
                dom.myColorBanner.style.display = 'flex';
                if (state.myColor === BLACK) {
                    dom.myColorIndicator.className = 'my-color-indicator piece-black';
                    dom.myColorText.textContent = '我执黑棋（先手）';
                } else if (state.myColor === WHITE) {
                    dom.myColorIndicator.className = 'my-color-indicator piece-white';
                    dom.myColorText.textContent = '我执白棋（后手）';
                } else {
                    dom.myColorBanner.style.display = 'none';
                }
            }
        } else if (state.mode === 'pve') {
            dom.playerBlackName.textContent = '玩家';
            dom.playerWhiteName.textContent = '电脑 AI';
        } else {
            dom.playerBlackName.textContent = '玩家 1';
            dom.playerWhiteName.textContent = '玩家 2';
        }
    }

    // ============= 棋盘渲染 =============
    function renderBoard() {
        // 清空
        dom.boardLines.innerHTML = '';
        dom.boardOverlay.innerHTML = '';
        dom.boardPieces.innerHTML = '';

        // 横线
        for (var i = 0; i < BOARD_SIZE; i++) {
            var hl = document.createElement('div');
            hl.className = 'h-line';
            hl.style.top = (i / (BOARD_SIZE - 1) * 100) + '%';
            dom.boardLines.appendChild(hl);
        }
        // 竖线
        for (var j = 0; j < BOARD_SIZE; j++) {
            var vl = document.createElement('div');
            vl.className = 'v-line';
            vl.style.left = (j / (BOARD_SIZE - 1) * 100) + '%';
            dom.boardLines.appendChild(vl);
        }
        // 星位
        var stars = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];
        for (var s = 0; s < stars.length; s++) {
            var sp = document.createElement('div');
            sp.className = 'board-star';
            sp.style.top = (stars[s][0] / (BOARD_SIZE - 1) * 100) + '%';
            sp.style.left = (stars[s][1] / (BOARD_SIZE - 1) * 100) + '%';
            dom.boardLines.appendChild(sp);
        }

        // 点击层
        for (var r = 0; r < BOARD_SIZE; r++) {
            for (var c = 0; c < BOARD_SIZE; c++) {
                var cell = document.createElement('div');
                cell.className = 'cell';
                cell.setAttribute('data-row', r);
                cell.setAttribute('data-col', c);
                cell.addEventListener('click', handleCellClick);
                dom.boardOverlay.appendChild(cell);
            }
        }

        renderPieces();
    }

    function renderPieces() {
        // 用 CSS Grid 15x15 布局，让每格棋子对齐交叉点
        dom.boardPieces.innerHTML = '';
        var frag = document.createDocumentFragment();
        for (var r = 0; r < BOARD_SIZE; r++) {
            for (var c = 0; c < BOARD_SIZE; c++) {
                var pieceCell = document.createElement('div');
                if (state.board[r][c] === EMPTY) {
                    pieceCell.className = 'piece-cell piece-cell-empty';
                } else {
                    pieceCell.className = 'piece-cell';
                    pieceCell.setAttribute('data-row', r);
                    pieceCell.setAttribute('data-col', c);
                    var piece = document.createElement('span');
                    piece.className = 'piece-piece ' + (state.board[r][c] === BLACK ? 'piece-black' : 'piece-white');
                    pieceCell.appendChild(piece);
                }
                frag.appendChild(pieceCell);
            }
        }
        dom.boardPieces.appendChild(frag);

        // 标记最后一步
        if (state.history.length > 0) {
            var lastMove = state.history[state.history.length - 1];
            var sel = '[data-row="' + lastMove.row + '"][data-col="' + lastMove.col + '"]';
            var lastCell = dom.boardPieces.querySelector(sel);
            if (lastCell) lastCell.classList.add('last-move');
        }
    }

    // ============= 落子处理 =============
    function handleCellClick(e) {
        if (state.gameOver) return;
        var cell = e.currentTarget;
        var row = parseInt(cell.getAttribute('data-row'), 10);
        var col = parseInt(cell.getAttribute('data-col'), 10);
        if (state.board[row][col] !== EMPTY) return;

        // 联机模式下：只允许在"自己的回合"落子
        if (state.mode === 'online') {
            if (state.currentPlayer !== state.myColor) return;
        }

        placePiece(row, col, state.currentPlayer);

        // 联机模式：广播落子
        if (state.mode === 'online' && state.roomCode) {
            sendMessage({ type: 'move', row: row, col: col, player: state.currentPlayer });
            if (state.gameOver) {
                sendMessage({ type: 'game-over', winner: state.winner });
            }
        }

        // 人机模式：AI 行动
        if (state.mode === 'pve' && !state.gameOver && state.currentPlayer === WHITE) {
            setTimeout(function () {
                if (state.gameOver) return;
                var move = aiBestMove();
                if (move) {
                    placePiece(move.row, move.col, WHITE);
                }
            }, 350);
        }
    }

    function placePiece(row, col, player) {
        state.board[row][col] = player;
        state.history.push({ row: row, col: col, player: player });
        state.moveCount++;

        var result = checkWin(row, col, player);
        if (result.isWin) {
            state.gameOver = true;
            state.winner = player;
        } else if (state.moveCount >= BOARD_SIZE * BOARD_SIZE) {
            state.gameOver = true;
            state.winner = null;
        } else {
            state.currentPlayer = player === BLACK ? WHITE : BLACK;
        }

        renderPieces();
        updateStatusUI();
        updateUndoBtn();
        if (state.gameOver) showResultModal();
    }

    // ============= 胜负判定 =============
    function checkWin(row, col, player) {
        for (var d = 0; d < DIRECTIONS.length; d++) {
            var dx = DIRECTIONS[d][0];
            var dy = DIRECTIONS[d][1];
            var count = 1;
            // 正向
            for (var i = 1; i < 5; i++) {
                var nr = row + dx * i, nc = col + dy * i;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
                if (state.board[nr][nc] !== player) break;
                count++;
            }
            // 反向
            for (var j = 1; j < 5; j++) {
                var pr = row - dx * j, pc = col - dy * j;
                if (pr < 0 || pr >= BOARD_SIZE || pc < 0 || pc >= BOARD_SIZE) break;
                if (state.board[pr][pc] !== player) break;
                count++;
            }
            if (count >= 5) return { isWin: true };
        }
        return { isWin: false };
    }

    // ============= 悔棋 / 重开 =============
    function handleUndo() {
        if (state.gameOver) return;
        if (state.history.length === 0) return;

        // 本地双人：回退一步
        // 本地人机：回退两步（玩家 + AI）
        // 联机：回退一步并广播
        var steps = 1;
        if (state.mode === 'pve' && state.history.length >= 2) {
            steps = 2;
        } else if (state.mode === 'online') {
            steps = 1;
        }

        for (var i = 0; i < steps; i++) {
            if (state.history.length === 0) break;
            var last = state.history.pop();
            state.board[last.row][last.col] = EMPTY;
            state.moveCount = Math.max(0, state.moveCount - 1);
            state.currentPlayer = last.player;
        }
        renderPieces();
        updateStatusUI();
        updateUndoBtn();

        if (state.mode === 'online' && state.roomCode) {
            sendMessage({ type: 'undo' });
        }
    }

    function handleRestart() {
        resetGameState();
        renderPieces();
        updateStatusUI();
        updateUndoBtn();
        hideModal();
        if (state.mode === 'online' && state.roomCode) {
            sendMessage({ type: 'restart' });
        }
    }

    function updateUndoBtn() {
        dom.undoBtn.disabled = state.gameOver || state.history.length === 0;
    }

    // ============= UI: 回合指示 =============
    function updateStatusUI() {
        if (state.gameOver) {
            if (state.winner === BLACK) {
                dom.turnPiece.className = 'turn-piece piece-piece piece-black';
                dom.turnText.textContent = '黑棋获胜';
            } else if (state.winner === WHITE) {
                dom.turnPiece.className = 'turn-piece piece-piece piece-white';
                dom.turnText.textContent = '白棋获胜';
            } else {
                dom.turnPiece.className = 'turn-piece piece-piece piece-black';
                dom.turnText.textContent = '平局';
            }
            dom.playerBlack.classList.remove('player-active');
            dom.playerWhite.classList.remove('player-active');
        } else {
            if (state.currentPlayer === BLACK) {
                dom.turnPiece.className = 'turn-piece piece-piece piece-black';
                dom.turnText.textContent = state.mode === 'online' && state.myColor !== BLACK ? '对手回合' : '黑棋回合';
                dom.playerBlack.classList.add('player-active');
                dom.playerWhite.classList.remove('player-active');
            } else {
                dom.turnPiece.className = 'turn-piece piece-piece piece-white';
                if (state.mode === 'pve') {
                    dom.turnText.textContent = '电脑思考中…';
                } else if (state.mode === 'online' && state.myColor !== WHITE) {
                    dom.turnText.textContent = '对手回合';
                } else {
                    dom.turnText.textContent = '白棋回合';
                }
                dom.playerWhite.classList.add('player-active');
                dom.playerBlack.classList.remove('player-active');
            }
        }
    }

    // ============= 胜负弹窗 =============
    function showResultModal() {
        if (state.winner === BLACK) {
            dom.resultPiece.className = 'piece-piece piece-black';
            dom.resultTitle.textContent = '黑棋获胜！';
            if (state.mode === 'online') {
                dom.resultSubtitle.textContent = state.myColor === BLACK ? '你赢了！' : '对手获胜';
            } else if (state.mode === 'pve') {
                dom.resultSubtitle.textContent = '恭喜你战胜了电脑';
            } else {
                dom.resultSubtitle.textContent = '恭喜黑棋率先连成五子';
            }
        } else if (state.winner === WHITE) {
            dom.resultPiece.className = 'piece-piece piece-white';
            dom.resultTitle.textContent = '白棋获胜！';
            if (state.mode === 'online') {
                dom.resultSubtitle.textContent = state.myColor === WHITE ? '你赢了！' : '对手获胜';
            } else if (state.mode === 'pve') {
                dom.resultSubtitle.textContent = '电脑获胜，再接再厉！';
            } else {
                dom.resultSubtitle.textContent = '恭喜白棋率先连成五子';
            }
        } else {
            dom.resultPiece.className = 'piece-piece piece-black';
            dom.resultTitle.textContent = '平局';
            dom.resultSubtitle.textContent = '棋盘已满，双方战平';
        }
        dom.resultModal.classList.add('modal-active');
    }

    function hideModal() {
        dom.resultModal.classList.remove('modal-active');
    }

    // ============= AI (启发式评分) =============
    // 对每个空位计算：如果我下在这里的得分 + 如果对手下在这里的威胁得分
    // 取总评分最高的位置
    function aiBestMove() {
        var aiPlayer = WHITE;
        var human = BLACK;

        if (state.history.length === 0) {
            return { row: 7, col: 7 };
        }

        var bestScore = -Infinity;
        var bestMoves = [];

        // 搜索范围：已有棋子周围 2 格内的空位
        var candidates = getCandidatePositions();

        for (var i = 0; i < candidates.length; i++) {
            var row = candidates[i].row;
            var col = candidates[i].col;

            var attack = evaluatePoint(row, col, aiPlayer);
            var defense = evaluatePoint(row, col, human);

            // 直接成五
            if (attack >= 100000) {
                return { row: row, col: col };
            }
            // 必须封堵的活四 / 冲四
            if (defense >= 100000) {
                defense = 90000;
            }

            var score = attack + defense;
            // 轻微偏好靠中间
            var centerBonus = 5 - (Math.abs(row - 7) + Math.abs(col - 7)) * 0.3;
            score += Math.max(0, centerBonus);

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [{ row: row, col: col }];
            } else if (score === bestScore) {
                bestMoves.push({ row: row, col: col });
            }
        }

        if (bestMoves.length === 0) return { row: 7, col: 7 };
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    function getCandidatePositions() {
        var list = [];
        var seen = {};
        for (var r = 0; r < BOARD_SIZE; r++) {
            for (var c = 0; c < BOARD_SIZE; c++) {
                if (state.board[r][c] !== EMPTY) {
                    for (var dr = -2; dr <= 2; dr++) {
                        for (var dc = -2; dc <= 2; dc++) {
                            var nr = r + dr, nc = c + dc;
                            if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
                            if (state.board[nr][nc] !== EMPTY) continue;
                            var key = nr + '_' + nc;
                            if (seen[key]) continue;
                            seen[key] = true;
                            list.push({ row: nr, col: nc });
                        }
                    }
                }
            }
        }
        return list;
    }

    function evaluateLine(row, col, player, dx, dy) {
        var count = 1;
        var openEnds = 0;
        // 正方向
        var i = 1;
        while (i < 5) {
            var nr = row + dx * i, nc = col + dy * i;
            if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) break;
            if (state.board[nr][nc] === player) count++;
            else if (state.board[nr][nc] === EMPTY) { openEnds++; break; }
            else break;
            i++;
        }
        // 反方向
        var j = 1;
        while (j < 5) {
            var pr = row - dx * j, pc = col - dy * j;
            if (pr < 0 || pr >= BOARD_SIZE || pc < 0 || pc >= BOARD_SIZE) break;
            if (state.board[pr][pc] === player) count++;
            else if (state.board[pr][pc] === EMPTY) { openEnds++; break; }
            else break;
            j++;
        }
        return scoreByCountAndOpen(count, openEnds);
    }

    function scoreByCountAndOpen(count, open) {
        if (count >= 5) return 100000;           // 五子连珠
        if (open === 2) {
            if (count === 4) return 10000;        // 活四
            if (count === 3) return 1000;         // 活三
            if (count === 2) return 100;          // 活二
            if (count === 1) return 10;
        } else if (open === 1) {
            if (count === 4) return 1000;         // 冲四
            if (count === 3) return 100;          // 眠三
            if (count === 2) return 10;
            if (count === 1) return 1;
        }
        return 0;
    }

    function evaluatePoint(row, col, player) {
        var total = 0;
        for (var d = 0; d < DIRECTIONS.length; d++) {
            total += evaluateLine(row, col, player, DIRECTIONS[d][0], DIRECTIONS[d][1]);
        }
        return total;
    }

    // ============= 启动 =============
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
