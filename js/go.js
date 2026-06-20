/**
 * 围棋 (Go / Weiqi) - 原生 HTML5 实现
 *
 * 核心规则:
 *   1) 黑棋先行，双方轮流在交叉点落子
 *   2) 棋子无气（被完全包围）时被提掉
 *   3) 禁止自杀（落子后己方无气且不能提对方子）
 *   4) 禁止打劫（不可立即提回刚被提的单子造成局面循环）
 *   5) 双方连续 Pass 即终局
 *   6) 中国规则数子法：己方活子 + 己方围住的空点
 *   7) 黑棋贴 3.75 子 (相当于 7.5 目)
 *
 * 模式: 双人对战 / 人机对战
 */
(function () {
    'use strict';

    // ============= 常量 =============
    var EMPTY = 0;
    var BLACK = 1;
    var WHITE = 2;
    var KOMI = 3.75; // 中国规则：黑贴 3.75 子

    // 可选棋盘尺寸
    var SIZES = [9, 13, 19];

    // ============= 状态 =============
    var state = {
        size: 13,
        board: [],
        currentPlayer: BLACK,
        history: [],           // 每步记录 {row, col, player, captured: [...], prevKo, isPass}
        capturedBlack: 0,      // 黑方被提子数
        capturedWhite: 0,      // 白方被提子数
        koPoint: null,         // 打劫禁入点 {row, col} 只允许禁入单颗子的劫
        passCount: 0,          // 连续 Pass 次数
        gameOver: false,
        winner: null,
        mode: 'pvp',           // pvp | pve
        moveCount: 0
    };

    var dom = {};

    // ============= 初始化 =============
    function init() {
        cacheDom();
        bindEvents();
    }

    function cacheDom() {
        // 页面
        dom.homePage = document.getElementById('go-home-page');
        dom.gamePage = document.getElementById('go-game-page');
        dom.pages = { home: dom.homePage, game: dom.gamePage };

        // 棋盘尺寸按钮
        dom.sizeBtns = document.querySelectorAll('.go-size-btn');

        // 模式按钮
        dom.modeBtns = document.querySelectorAll('.go-mode-btn');

        // 游戏页元素
        dom.board = document.getElementById('go-board');
        dom.boardLines = dom.board.querySelector('.go-board-lines');
        dom.boardOverlay = dom.board.querySelector('.go-board-overlay');
        dom.boardPieces = dom.board.querySelector('.go-board-pieces');

        dom.turnPiece = document.getElementById('go-turn-piece');
        dom.turnText = document.getElementById('go-turn-text');
        dom.playerBlack = document.getElementById('go-player-black');
        dom.playerWhite = document.getElementById('go-player-white');
        dom.playerBlackName = document.getElementById('go-player-black-name');
        dom.playerWhiteName = document.getElementById('go-player-white-name');
        dom.capturedBlackEl = document.getElementById('go-captured-black');
        dom.capturedWhiteEl = document.getElementById('go-captured-white');
        dom.moveCountEl = document.getElementById('go-move-count');
        dom.komiInfo = document.getElementById('go-komi-info');

        dom.passBtn = document.getElementById('go-pass-btn');
        dom.undoBtn = document.getElementById('go-undo-btn');
        dom.resignBtn = document.getElementById('go-resign-btn');
        dom.restartBtn = document.getElementById('go-restart-btn');
        dom.backBtn = document.getElementById('go-back-btn');
        dom.homeBtn = document.getElementById('go-home-btn');

        dom.captureToast = document.getElementById('go-capture-toast');

        // 结果弹窗
        dom.resultModal = document.getElementById('go-result-modal');
        dom.resultPiece = document.getElementById('go-result-piece');
        dom.resultTitle = document.getElementById('go-result-title');
        dom.scoreDetail = document.getElementById('go-score-detail');
        dom.modalRestartBtn = document.getElementById('go-modal-restart-btn');
        dom.modalHomeBtn = document.getElementById('go-modal-home-btn');
    }

    function bindEvents() {
        // 棋盘尺寸切换
        dom.sizeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var sz = parseInt(btn.getAttribute('data-size'), 10);
                if (SIZES.indexOf(sz) === -1) return;
                state.size = sz;
                dom.sizeBtns.forEach(function (b) { b.classList.remove('go-size-active'); });
                btn.classList.add('go-size-active');
            });
        });

        // 模式选择
        dom.modeBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var mode = btn.getAttribute('data-mode');
                state.mode = mode;
                startGame();
            });
        });

        // 返回首页 / 返回选择页
        dom.backBtn.addEventListener('click', function () {
            hideModal();
            showPage('home');
        });
        dom.homeBtn.addEventListener('click', function () {
            hideModal();
            showPage('home');
        });

        // 游戏页按钮
        dom.passBtn.addEventListener('click', handlePass);
        dom.undoBtn.addEventListener('click', handleUndo);
        dom.resignBtn.addEventListener('click', handleResign);
        dom.restartBtn.addEventListener('click', handleRestart);
        dom.modalRestartBtn.addEventListener('click', handleRestart);
        dom.modalHomeBtn.addEventListener('click', function () {
            hideModal();
            showPage('home');
        });

        // 顶部"返回首页"（landing）按钮
        document.querySelectorAll('[data-action="back-landing"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (window.location.href.indexOf('index.html') !== -1) {
                    window.location.href = 'index.html';
                } else {
                    window.location.href = 'index.html';
                }
            });
        });
    }

    function showPage(name) {
        Object.keys(dom.pages).forEach(function (key) {
            dom.pages[key].classList.remove('page-active');
        });
        if (dom.pages[name]) {
            dom.pages[name].classList.add('page-active');
        }
    }

    // ============= 游戏启动 =============
    function startGame() {
        resetGameState();
        // 人机模式下：白方是电脑
        if (state.mode === 'pve') {
            dom.playerBlackName.textContent = '玩家（执黑）';
            dom.playerWhiteName.textContent = '电脑 AI';
        } else {
            dom.playerBlackName.textContent = '黑方';
            dom.playerWhiteName.textContent = '白方';
        }
        renderBoard();
        updateStatusUI();
        showPage('game');
    }

    function resetGameState() {
        var N = state.size;
        state.board = [];
        for (var i = 0; i < N; i++) {
            var row = [];
            for (var j = 0; j < N; j++) row.push(EMPTY);
            state.board.push(row);
        }
        state.currentPlayer = BLACK;
        state.history = [];
        state.capturedBlack = 0;
        state.capturedWhite = 0;
        state.koPoint = null;
        state.passCount = 0;
        state.gameOver = false;
        state.winner = null;
        state.moveCount = 0;
        state.earlyEnd = false;
        state.earlyReason = null;
        state.score = null;
        state.resigned = false;
    }

    // ============= 棋盘渲染 =============
    // 生成 SVG 棋盘 DOM（线条+星位）。
    // 坐标系：viewBox "0 0 N-1 N-1"，线条端点与棋子落点坐标一一对应。
    function renderBoardLinesSVG(N) {
        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('xmlns', svgNS);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        // N-1 个间隔（即 N 条线），线条从 0 到 N-1
        svg.setAttribute('viewBox', '0 0 ' + (N - 1) + ' ' + (N - 1));
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';

        // 线条样式：vector-effect 保证线宽以像素为单位不随 SVG 缩放
        var lineColor = '#1a0f05';
        var lineWidth = 1;

        // 横线：N 条，y = 0, 1, 2, ..., N-1
        for (var i = 0; i < N; i++) {
            var y = i;
            var line = document.createElementNS(svgNS, 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', y.toString());
            line.setAttribute('x2', (N - 1).toString());
            line.setAttribute('y2', y.toString());
            line.setAttribute('stroke', lineColor);
            line.setAttribute('stroke-width', lineWidth.toString());
            line.setAttribute('stroke-linecap', 'square');
            line.setAttribute('vector-effect', 'non-scaling-stroke');
            svg.appendChild(line);
        }

        // 竖线：N 条，x = 0, 1, 2, ..., N-1
        for (var j = 0; j < N; j++) {
            var x = j;
            var line2 = document.createElementNS(svgNS, 'line');
            line2.setAttribute('x1', x.toString());
            line2.setAttribute('y1', '0');
            line2.setAttribute('x2', x.toString());
            line2.setAttribute('y2', (N - 1).toString());
            line2.setAttribute('stroke', lineColor);
            line2.setAttribute('stroke-width', lineWidth.toString());
            line2.setAttribute('stroke-linecap', 'square');
            line2.setAttribute('vector-effect', 'non-scaling-stroke');
            svg.appendChild(line2);
        }

        // 星位：与棋子同一坐标
        var starPts = getStarPoints(N);
        var starColor = '#1a0f05';
        // 星位半径按棋盘大小的相对比例（相对于 viewBox 的一小部分）
        var starRadius = 0.15;
        for (var s = 0; s < starPts.length; s++) {
            var sx = starPts[s][1];
            var sy = starPts[s][0];
            var circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', sx.toString());
            circle.setAttribute('cy', sy.toString());
            circle.setAttribute('r', starRadius.toString());
            circle.setAttribute('fill', starColor);
            svg.appendChild(circle);
        }

        return svg;
    }

    function renderBoard() {
        var N = state.size;
        dom.board.classList.remove('size-9', 'size-13', 'size-19');
        dom.board.classList.add('size-' + N);

        // 每个交叉点占格的相对大小（N-1 个间隔）
        var cellPercent = (100 / (N - 1)).toFixed(4);
        dom.board.style.setProperty('--go-cell-percent', cellPercent + '%');
        // 棋子大小上限（像素），随 N 增大减小
        var maxPiecePx = N === 9 ? 30 : (N === 13 ? 26 : 22);
        dom.board.style.setProperty('--go-piece-max', maxPiecePx + 'px');

        // 清空
        dom.boardLines.innerHTML = '';
        dom.boardOverlay.innerHTML = '';
        dom.boardPieces.innerHTML = '';

        // 清除 CSS Grid 残留样式
        dom.boardOverlay.style.gridTemplateColumns = '';
        dom.boardOverlay.style.gridTemplateRows = '';
        dom.boardPieces.style.gridTemplateColumns = '';
        dom.boardPieces.style.gridTemplateRows = '';

        // ====================================
        // 用 SVG DOM 元素绘制棋盘网格线
        // ====================================
        var boardSVG = renderBoardLinesSVG(N);
        dom.boardLines.appendChild(boardSVG);

        // 点击层 - N x N 个绝对定位的交叉点
        var cellSizeStr = cellPercent + '%';
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                var cell = document.createElement('div');
                cell.className = 'go-cell';
                cell.setAttribute('data-row', r);
                cell.setAttribute('data-col', c);
                cell.style.left = ((c * 100) / (N - 1)).toFixed(4) + '%';
                cell.style.top = ((r * 100) / (N - 1)).toFixed(4) + '%';
                cell.style.width = cellSizeStr;
                cell.style.height = cellSizeStr;
                cell.addEventListener('click', handleCellClick);
                dom.boardOverlay.appendChild(cell);
            }
        }

        renderPieces();
    }

    // 星位：按传统围棋
    function getStarPoints(N) {
        if (N === 9) {
            return [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];
        } else if (N === 13) {
            return [[3, 3], [3, 9], [6, 6], [9, 3], [9, 9]];
        } else if (N === 19) {
            return [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
        }
        return [];
    }

    function renderPieces() {
        var N = state.size;
        dom.boardPieces.innerHTML = '';
        var frag = document.createDocumentFragment();
        var cellPercent = (100 / (N - 1)).toFixed(4);
        var cellSizeStr = cellPercent + '%';
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                var pc = document.createElement('div');
                pc.className = 'go-piece-cell';
                pc.setAttribute('data-row', r);
                pc.setAttribute('data-col', c);
                pc.style.left = ((c * 100) / (N - 1)).toFixed(4) + '%';
                pc.style.top = ((r * 100) / (N - 1)).toFixed(4) + '%';
                pc.style.width = cellSizeStr;
                pc.style.height = cellSizeStr;
                if (state.board[r][c] !== EMPTY) {
                    var piece = document.createElement('span');
                    piece.className = 'piece-piece ' + (state.board[r][c] === BLACK ? 'piece-black' : 'piece-white');
                    pc.appendChild(piece);
                }
                frag.appendChild(pc);
            }
        }
        dom.boardPieces.appendChild(frag);

        // 标记最后一手
        if (state.history.length > 0) {
            var last = state.history[state.history.length - 1];
            if (!last.isPass) {
                var sel = '.go-piece-cell[data-row="' + last.row + '"][data-col="' + last.col + '"]';
                var lastCell = dom.boardPieces.querySelector(sel);
                if (lastCell) {
                    lastCell.classList.add('last-move');
                    if (state.board[last.row][last.col] === WHITE) {
                        lastCell.classList.add('last-move-white');
                    }
                }
            }
        }

        // 标记打劫禁入点
        if (state.koPoint) {
            var kr = state.koPoint.row, kc = state.koPoint.col;
            var forbiddenCell = dom.boardOverlay.querySelector('.go-cell[data-row="' + kr + '"][data-col="' + kc + '"]');
            if (forbiddenCell) forbiddenCell.classList.add('ko-forbidden');
        }
    }

    // ============= 落子处理 =============
    function handleCellClick(e) {
        if (state.gameOver) return;
        // 人机模式：只有当前是玩家回合（执黑）才响应
        if (state.mode === 'pve' && state.currentPlayer !== BLACK) return;

        var cell = e.currentTarget;
        var row = parseInt(cell.getAttribute('data-row'), 10);
        var col = parseInt(cell.getAttribute('data-col'), 10);

        if (state.board[row][col] !== EMPTY) return;
        if (state.koPoint && state.koPoint.row === row && state.koPoint.col === col) return;

        // 尝试落子（模拟并验证合法性）
        var move = tryMove(row, col, state.currentPlayer);
        if (!move) return; // 非法（自杀等）

        applyMove(row, col, state.currentPlayer, move);
        renderPieces();
        updateStatusUI();

        // 提前判胜检查（刚落子，如发生提子则放宽阈值）
        if (!state.gameOver && state.moveCount > state.size * 2) {
            var early = checkEarlyEnd(move.captured.length > 0);
            if (early) {
                state.gameOver = true;
                state.winner = early.winner;
                state.score = early.score;
                state.earlyReason = early.reason;
                state.earlyEnd = true;
                updateStatusUI();
            }
        }

        if (state.gameOver) {
            setTimeout(showResultModal, 300);
            return;
        }

        // 人机模式下：AI 走棋
        if (state.mode === 'pve' && state.currentPlayer === WHITE) {
            setTimeout(function () {
                if (state.gameOver) return;
                var aiMove = aiBestMove();
                if (aiMove && aiMove.isPass) {
                    handlePass();
                    return;
                }
                if (aiMove) {
                    var m = tryMove(aiMove.row, aiMove.col, WHITE);
                    if (m) {
                        applyMove(aiMove.row, aiMove.col, WHITE, m);
                        renderPieces();
                        updateStatusUI();

                        // AI 落子后提前判胜检查
                        if (!state.gameOver && state.moveCount > state.size * 2) {
                            var earlyAI = checkEarlyEnd(m.captured.length > 0);
                            if (earlyAI) {
                                state.gameOver = true;
                                state.winner = earlyAI.winner;
                                state.score = earlyAI.score;
                                state.earlyReason = earlyAI.reason;
                                state.earlyEnd = true;
                                updateStatusUI();
                            }
                        }

                        if (state.gameOver) {
                            setTimeout(showResultModal, 300);
                        }
                    }
                }
            }, 450);
        }
    }

    // 尝试在 (row, col) 落子，返回 {captured: [...], liberties, wouldBeKo: bool}
    // 若自杀则返回 null
    function tryMove(row, col, player) {
        var N = state.size;
        var opponent = player === BLACK ? WHITE : BLACK;

        // 临时落子
        var board = cloneBoard(state.board);
        board[row][col] = player;

        // 1) 检查四邻是否有对方棋子，收集要提的棋串
        var captured = [];
        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (var d = 0; d < 4; d++) {
            var nr = row + dirs[d][0], nc = col + dirs[d][1];
            if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
            if (board[nr][nc] === opponent) {
                var groupInfo = findGroup(board, nr, nc);
                if (groupInfo.liberties === 0) {
                    // 提掉
                    for (var k = 0; k < groupInfo.stones.length; k++) {
                        var s = groupInfo.stones[k];
                        if (!containsStone(captured, s)) captured.push(s);
                        board[s.row][s.col] = EMPTY;
                    }
                }
            }
        }

        // 2) 检查自己的气
        var ownGroup = findGroup(board, row, col);
        if (ownGroup.liberties === 0) {
            // 自杀：若无提子，则非法
            return null;
        }

        // 3) 检查打劫：若本手仅提了一颗对方子，且该子落回后能提掉自己整个新子串（自己仅1颗子），则构成劫
        var wouldBeKo = false;
        if (captured.length === 1 && ownGroup.stones.length === 1) {
            // 新落的子是孤立的，且只提了一颗子，这构成简单劫
            wouldBeKo = true;
        }

        return {
            captured: captured,
            liberties: ownGroup.liberties,
            wouldBeKo: wouldBeKo
        };
    }

    // 真正执行落子（更新状态）
    function applyMove(row, col, player, moveInfo) {
        var N = state.size;
        var opponent = player === BLACK ? WHITE : BLACK;
        state.board[row][col] = player;

        // 提子
        var captured = moveInfo.captured;
        for (var k = 0; k < captured.length; k++) {
            state.board[captured[k].row][captured[k].col] = EMPTY;
        }
        if (player === BLACK) {
            state.capturedWhite += captured.length;
        } else {
            state.capturedBlack += captured.length;
        }

        // 打劫状态更新
        var prevKo = state.koPoint;
        if (moveInfo.wouldBeKo && captured.length === 1) {
            // 被提的那个位置成为下一回合的禁入点
            state.koPoint = { row: captured[0].row, col: captured[0].col };
        } else {
            state.koPoint = null;
        }

        // 记录历史
        state.history.push({
            row: row,
            col: col,
            player: player,
            captured: captured,
            prevKo: prevKo,
            isPass: false
        });
        state.moveCount++;
        state.passCount = 0;
        state.currentPlayer = opponent;

        if (captured.length > 0) {
            showCaptureToast((player === BLACK ? '黑' : '白') + '方提子 ' + captured.length + ' 颗');
        }
    }

    // ============= 棋串/气 计算 =============
    function findGroup(board, row, col) {
        var N = state.size;
        var color = board[row][col];
        if (color === EMPTY) return { stones: [], liberties: 0 };

        var visited = {};
        var key = function (r, c) { return r + '_' + c; };
        var stones = [];
        var libertySet = {};
        var queue = [{ row: row, col: col }];
        visited[key(row, col)] = true;
        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        while (queue.length > 0) {
            var cur = queue.shift();
            stones.push({ row: cur.row, col: cur.col });
            for (var d = 0; d < 4; d++) {
                var nr = cur.row + dirs[d][0], nc = cur.col + dirs[d][1];
                if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
                var k = key(nr, nc);
                if (board[nr][nc] === EMPTY) {
                    libertySet[k] = true;
                } else if (board[nr][nc] === color && !visited[k]) {
                    visited[k] = true;
                    queue.push({ row: nr, col: nc });
                }
            }
        }
        return { stones: stones, liberties: Object.keys(libertySet).length };
    }

    function containsStone(arr, s) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].row === s.row && arr[i].col === s.col) return true;
        }
        return false;
    }

    function cloneBoard(board) {
        var N = board.length;
        var out = [];
        for (var i = 0; i < N; i++) {
            var row = [];
            for (var j = 0; j < N; j++) row.push(board[i][j]);
            out.push(row);
        }
        return out;
    }

    // ============= Pass / 悔棋 / 认输 / 重启 =============
    function handlePass() {
        if (state.gameOver) return;
        if (state.mode === 'pve' && state.currentPlayer !== BLACK) return;

        var prevKo = state.koPoint;
        state.history.push({
            player: state.currentPlayer,
            isPass: true,
            captured: [],
            prevKo: prevKo
        });
        state.passCount++;
        state.koPoint = null; // Pass 后劫材消失
        state.moveCount++;
        state.currentPlayer = state.currentPlayer === BLACK ? WHITE : BLACK;

        renderPieces();
        updateStatusUI();

        // 双方连续 Pass => 终局
        if (state.passCount >= 2) {
            endGameByScore();
            setTimeout(showResultModal, 300);
            return;
        }

        // Pass 后也检查提前终局（分数差距足够大时）
        if (!state.gameOver && state.moveCount > state.size * 2) {
            var earlyPass = checkEarlyEnd(false);
            if (earlyPass) {
                state.gameOver = true;
                state.winner = earlyPass.winner;
                state.score = earlyPass.score;
                state.earlyReason = earlyPass.reason;
                state.earlyEnd = true;
                updateStatusUI();
                setTimeout(showResultModal, 300);
                return;
            }
        }

        showCaptureToast((state.currentPlayer === WHITE ? '黑' : '白') + '方 Pass');

        // 人机模式：若玩家 Pass 后轮到 AI，则 AI 继续走
        if (state.mode === 'pve' && state.currentPlayer === WHITE && !state.gameOver) {
            setTimeout(function () {
                var aiMove = aiBestMove();
                if (!aiMove || aiMove.isPass) {
                    handlePass();
                    return;
                }
                var m = tryMove(aiMove.row, aiMove.col, WHITE);
                if (m) {
                    applyMove(aiMove.row, aiMove.col, WHITE, m);
                    renderPieces();
                    updateStatusUI();
                    if (state.gameOver) setTimeout(showResultModal, 300);
                }
            }, 500);
        }
    }

    function handleUndo() {
        if (state.gameOver) return;
        if (state.history.length === 0) return;

        // 人机模式：一次悔两步（玩家 + AI）
        var steps = state.mode === 'pve' ? Math.min(2, state.history.length) : 1;
        for (var i = 0; i < steps; i++) {
            if (state.history.length === 0) break;
            var last = state.history.pop();
            if (!last.isPass) {
                // 移除所落的子
                state.board[last.row][last.col] = EMPTY;
                // 恢复被提的子（原对手的棋子）
                var opponent = last.player === BLACK ? WHITE : BLACK;
                for (var k = 0; k < last.captured.length; k++) {
                    state.board[last.captured[k].row][last.captured[k].col] = opponent;
                }
                if (last.player === BLACK) {
                    state.capturedWhite = Math.max(0, state.capturedWhite - last.captured.length);
                } else {
                    state.capturedBlack = Math.max(0, state.capturedBlack - last.captured.length);
                }
            }
            state.koPoint = last.prevKo;
            state.currentPlayer = last.player;
            state.moveCount = Math.max(0, state.moveCount - 1);
        }
        state.passCount = 0;
        state.gameOver = false;
        state.winner = null;
        state.earlyEnd = false;
        state.earlyReason = null;
        state.score = null;
        state.resigned = false;

        renderPieces();
        updateStatusUI();
        hideModal();
    }

    function handleResign() {
        if (state.gameOver) return;
        state.gameOver = true;
        // 认输者 = 当前回合的对方
        state.winner = state.currentPlayer === BLACK ? WHITE : BLACK;
        state.resigned = true;
        updateStatusUI();
        showResultModal();
    }

    function handleRestart() {
        startGame();
        hideModal();
    }

    // ============= 终局计分 =============
    // 中国规则（数子法）：己方活子 + 己方围住的空点
    // 简化实现：用洪水填充找出每块空地属于谁（仅被一方包围的空点计入该方）
    function endGameByScore() {
        var N = state.size;
        var board = state.board;
        var visitedTerritory = {};
        var key = function (r, c) { return r + '_' + c; };

        var blackStones = 0, whiteStones = 0;
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                if (board[r][c] === BLACK) blackStones++;
                else if (board[r][c] === WHITE) whiteStones++;
            }
        }

        var blackTerritory = 0, whiteTerritory = 0;
        var neutral = 0;
        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (var r2 = 0; r2 < N; r2++) {
            for (var c2 = 0; c2 < N; c2++) {
                if (board[r2][c2] !== EMPTY) continue;
                if (visitedTerritory[key(r2, c2)]) continue;
                // BFS 找出这整块空地
                var region = [];
                var borders = {};
                var q = [{ row: r2, col: c2 }];
                visitedTerritory[key(r2, c2)] = true;
                while (q.length > 0) {
                    var cur = q.shift();
                    region.push(cur);
                    for (var d = 0; d < 4; d++) {
                        var nr = cur.row + dirs[d][0], nc = cur.col + dirs[d][1];
                        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
                        var k2 = key(nr, nc);
                        if (board[nr][nc] === EMPTY) {
                            if (!visitedTerritory[k2]) {
                                visitedTerritory[k2] = true;
                                q.push({ row: nr, col: nc });
                            }
                        } else {
                            borders[board[nr][nc]] = true;
                        }
                    }
                }
                var touchesBlack = !!borders[BLACK];
                var touchesWhite = !!borders[WHITE];
                if (touchesBlack && !touchesWhite) blackTerritory += region.length;
                else if (touchesWhite && !touchesBlack) whiteTerritory += region.length;
                else neutral += region.length;
            }
        }

        // 中国规则：子 + 空
        var blackScore = blackStones + blackTerritory;
        var whiteScore = whiteStones + whiteTerritory + KOMI; // 白加贴目

        state.score = {
            blackStones: blackStones,
            whiteStones: whiteStones,
            blackTerritory: blackTerritory,
            whiteTerritory: whiteTerritory,
            neutral: neutral,
            blackScore: blackScore,
            whiteScore: whiteScore
        };

        state.gameOver = true;
        state.winner = blackScore > whiteScore ? BLACK : WHITE;
    }

    // ============= UI 更新 =============
    function updateStatusUI() {
        // 实时分数
        var live = calcCurrentScore();
        var blackScoreEl = document.getElementById('go-score-black');
        var whiteScoreEl = document.getElementById('go-score-white');
        if (blackScoreEl) blackScoreEl.textContent = live.blackScore.toFixed(2);
        if (whiteScoreEl) whiteScoreEl.textContent = live.whiteScore.toFixed(2);
        var remEl = document.getElementById('go-remaining-empty');
        if (remEl) remEl.textContent = live.remainingEmpty;
        var comeEl = document.getElementById('go-comeback-limit');
        if (comeEl) comeEl.textContent = Math.abs(live.blackScore - live.whiteScore).toFixed(2) + ' vs ' + live.remainingEmpty;

        // 提子数显示
        dom.capturedBlackEl.textContent = '提子 ' + state.capturedWhite; // 黑方提掉的白子
        dom.capturedWhiteEl.textContent = '提子 ' + state.capturedBlack; // 白方提掉的黑子
        dom.moveCountEl.textContent = '第 ' + (state.moveCount + 1) + ' 手';
        dom.komiInfo.textContent = '黑贴 ' + KOMI + ' 子';

        // 玩家卡激活状态
        if (state.gameOver) {
            dom.playerBlack.classList.remove('player-active');
            dom.playerWhite.classList.remove('player-active');
        } else {
            if (state.currentPlayer === BLACK) {
                dom.playerBlack.classList.add('player-active');
                dom.playerWhite.classList.remove('player-active');
            } else {
                dom.playerWhite.classList.add('player-active');
                dom.playerBlack.classList.remove('player-active');
            }
        }

        // 顶部回合指示
        if (state.gameOver) {
            if (state.winner === BLACK) {
                dom.turnPiece.className = 'turn-piece piece-piece piece-black';
                dom.turnText.textContent = '黑方胜出';
            } else if (state.winner === WHITE) {
                dom.turnPiece.className = 'turn-piece piece-piece piece-white';
                dom.turnText.textContent = '白方胜出';
            }
        } else {
            if (state.currentPlayer === BLACK) {
                dom.turnPiece.className = 'turn-piece piece-piece piece-black';
                dom.turnText.textContent = (state.mode === 'pve' ? '你的回合' : '黑方回合');
            } else {
                dom.turnPiece.className = 'turn-piece piece-piece piece-white';
                dom.turnText.textContent = (state.mode === 'pve' ? '电脑思考中…' : '白方回合');
            }
        }

        // 按钮可用性
        dom.undoBtn.disabled = state.gameOver || state.history.length === 0;
        dom.passBtn.disabled = state.gameOver;
        dom.resignBtn.disabled = state.gameOver;
    }

    // ============= 提子 Toast =============
    var toastTimer = null;
    function showCaptureToast(msg) {
        dom.captureToast.textContent = msg;
        dom.captureToast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            dom.captureToast.classList.remove('show');
        }, 1400);
    }

    // ============= 结果弹窗 =============
    function showResultModal() {
        if (state.winner === BLACK) {
            dom.resultPiece.className = 'piece-piece piece-black';
            dom.resultTitle.textContent = '黑方胜出！';
        } else if (state.winner === WHITE) {
            dom.resultPiece.className = 'piece-piece piece-white';
            dom.resultTitle.textContent = '白方胜出！';
        }

        var html = '';
        if (state.resigned) {
            html += '<div class="score-row"><span class="score-label">结果</span><span class="score-value">'
                + (state.winner === BLACK ? '白方认输' : '黑方认输') + '</span></div>';
        } else if (state.earlyEnd && state.earlyReason) {
            html += '<div class="score-row score-reason-early"><span class="score-label">提前判胜</span><span class="score-value">' + state.earlyReason + '</span></div>';
        }
        if (state.score) {
            var s = state.score;
            html += '<div class="score-row"><span class="score-label">黑 · 活子</span><span class="score-value">' + s.blackStones + '</span></div>';
            html += '<div class="score-row"><span class="score-label">黑 · 领地</span><span class="score-value">' + s.blackTerritory + '</span></div>';
            html += '<div class="score-row"><span class="score-label">白 · 活子</span><span class="score-value">' + s.whiteStones + '</span></div>';
            html += '<div class="score-row"><span class="score-label">白 · 领地</span><span class="score-value">' + s.whiteTerritory + '</span></div>';
            html += '<div class="score-row"><span class="score-label">贴目（白）</span><span class="score-value">+' + KOMI + '</span></div>';
            html += '<div class="score-divider"></div>';
            html += '<div class="score-row score-total"><span class="score-label">黑总分</span><span class="score-value">' + s.blackScore.toFixed(2) + '</span></div>';
            html += '<div class="score-row score-total"><span class="score-label">白总分</span><span class="score-value">' + s.whiteScore.toFixed(2) + '</span></div>';
            var diff = Math.abs(s.blackScore - s.whiteScore);
            html += '<div class="score-row score-total"><span class="score-label">胜出</span><span class="score-value">' + diff.toFixed(2) + ' 子</span></div>';
        }
        dom.scoreDetail.innerHTML = html;
        dom.resultModal.classList.add('modal-active');
    }

    function hideModal() {
        dom.resultModal.classList.remove('modal-active');
        state.resigned = false;
    }

    // ============= 实时计分 & 提前终局 ============
    // 按中国规则实时计算：黑/白 活子 + 己方围住的空点（仅被一方包围）
    // 返回 {blackStones, whiteStones, blackTerritory, whiteTerritory, blackScore, whiteScore, remainingEmpty}
    function calcCurrentScore() {
        var N = state.size;
        var board = state.board;
        var key = function (r, c) { return r + '_' + c; };

        var blackStones = 0, whiteStones = 0, totalEmpty = 0;
        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                if (board[r][c] === BLACK) blackStones++;
                else if (board[r][c] === WHITE) whiteStones++;
                else totalEmpty++;
            }
        }

        var blackTerritory = 0, whiteTerritory = 0;
        var visited = {};
        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (var r2 = 0; r2 < N; r2++) {
            for (var c2 = 0; c2 < N; c2++) {
                if (board[r2][c2] !== EMPTY) continue;
                if (visited[key(r2, c2)]) continue;
                var region = [];
                var borders = {};
                var q = [{ row: r2, col: c2 }];
                visited[key(r2, c2)] = true;
                while (q.length > 0) {
                    var cur = q.shift();
                    region.push(cur);
                    for (var d = 0; d < 4; d++) {
                        var nr = cur.row + dirs[d][0], nc = cur.col + dirs[d][1];
                        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
                        var k2 = key(nr, nc);
                        if (board[nr][nc] === EMPTY) {
                            if (!visited[k2]) {
                                visited[k2] = true;
                                q.push({ row: nr, col: nc });
                            }
                        } else {
                            borders[board[nr][nc]] = true;
                        }
                    }
                }
                var b = !!borders[BLACK], w = !!borders[WHITE];
                if (b && !w) blackTerritory += region.length;
                else if (w && !b) whiteTerritory += region.length;
            }
        }

        return {
            blackStones: blackStones,
            whiteStones: whiteStones,
            blackTerritory: blackTerritory,
            whiteTerritory: whiteTerritory,
            blackScore: blackStones + blackTerritory,
            whiteScore: whiteStones + whiteTerritory + KOMI,
            remainingEmpty: totalEmpty
        };
    }

    // 检查是否可以提前判定胜负：
    // 条件 A: 对方"理论最高可能"分数 < 当前我方分数
    //   - 对方理论最高 = 当前对方分 + 所有剩余空点全部归对方
    //   - 这是一个保守阈值，几乎不会误判
    // 条件 B: 若本轮发生提子，额外用"提子导致对方分数无望"的放宽条件再判一次
    // 返回 null 或 {winner: BLACK/WHITE, reason: '...', scoreDiff: x, remainingEmpty: x}
    function checkEarlyEnd(justCaptured) {
        var N = state.size;
        var s = calcCurrentScore();

        // 计算保守阈值：对方即使拿到所有剩余空点，分数仍然低
        var blackMax = s.blackScore + s.remainingEmpty; // 黑如果拿到所有剩余
        var whiteMax = s.whiteScore + s.remainingEmpty;

        // 若白的当前分 > 黑的理论最高 -> 白必胜
        if (s.whiteScore > blackMax) {
            return { winner: WHITE, reason: '白方已锁定胜局（白 ' + s.whiteScore.toFixed(2) + ' > 黑理论最高 ' + blackMax.toFixed(2) + '）', score: s };
        }
        // 若黑的当前分 > 白的理论最高 -> 黑必胜
        if (s.blackScore > whiteMax) {
            return { winner: BLACK, reason: '黑方已锁定胜局（黑 ' + s.blackScore.toFixed(2) + ' > 白理论最高 ' + whiteMax.toFixed(2) + '）', score: s };
        }

        // 有提子时额外放宽：若领先方分数优势 > 剩余空点的 85%，则判提前胜
        // 目的：避免人机模式下 AI 明知赢了却一直走到底
        if (justCaptured) {
            var diff = Math.abs(s.blackScore - s.whiteScore);
            var threshold = s.remainingEmpty * 0.85;
            if (diff > threshold && diff > KOMI * 1.5) {
                var w = s.blackScore > s.whiteScore ? BLACK : WHITE;
                return { winner: w, reason: (w === BLACK ? '黑' : '白') + '方大幅领先，剩余空点不足以翻盘（领先 ' + diff.toFixed(2) + '，剩余空点 ' + s.remainingEmpty + '）', score: s };
            }
        }

        // 棋盘已填满或剩余极少（<= 1 且落子方无意义）
        if (s.remainingEmpty <= 1 && state.passCount >= 1) {
            var w2 = s.blackScore > s.whiteScore ? BLACK : WHITE;
            return { winner: w2, reason: '棋盘已几乎填满，按当前分数判定（' + (w2 === BLACK ? '黑' : '白') + ' ' + Math.abs(s.blackScore - s.whiteScore).toFixed(2) + ' 子优势）', score: s };
        }

        return null;
    }

    // ============= AI（启发式） =============
    // 策略:
    //   1) 能提对方子 > 优先
    //   2) 能解救己方危子（气少）> 次优先
    //   3) 能在对方棋串附近压缩 > 加分
    //   4) 靠近天元 / 已有棋子集中区
    //   5) 避免送吃（自己落子后气少）
    function aiBestMove() {
        var N = state.size;
        var ai = WHITE;
        var human = BLACK;

        if (state.moveCount === 0) {
            // 首手靠近天元
            return { row: Math.floor(N / 2), col: Math.floor(N / 2) };
        }

        // 若棋盘大部分为空且没有可下的有意义的点，则考虑 Pass
        // 不过围棋 AI 一般不轻易 Pass，只在临近终局时
        var candidates = [];
        var consider = {};
        var key = function (r, c) { return r + '_' + c; };

        // 收集候选：所有已有棋子的两格邻居（空点）
        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        var extendedDirs = [];
        for (var dr = -2; dr <= 2; dr++) {
            for (var dc = -2; dc <= 2; dc++) {
                if (dr === 0 && dc === 0) continue;
                extendedDirs.push([dr, dc]);
            }
        }

        for (var r = 0; r < N; r++) {
            for (var c = 0; c < N; c++) {
                if (state.board[r][c] === EMPTY) continue;
                for (var d = 0; d < extendedDirs.length; d++) {
                    var nr = r + extendedDirs[d][0], nc = c + extendedDirs[d][1];
                    if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
                    if (state.board[nr][nc] !== EMPTY) continue;
                    if (state.koPoint && state.koPoint.row === nr && state.koPoint.col === nc) continue;
                    var k2 = key(nr, nc);
                    if (consider[k2]) continue;
                    consider[k2] = true;
                    candidates.push({ row: nr, col: nc });
                }
            }
        }

        if (candidates.length === 0) {
            // 棋盘满或无候选，尝试全盘所有空点
            for (var r2 = 0; r2 < N; r2++) {
                for (var c2 = 0; c2 < N; c2++) {
                    if (state.board[r2][c2] === EMPTY) candidates.push({ row: r2, col: c2 });
                }
            }
        }

        var bestScore = -Infinity;
        var bestMoves = [];
        var center = Math.floor(N / 2);

        for (var i = 0; i < candidates.length; i++) {
            var cand = candidates[i];
            var move = tryMove(cand.row, cand.col, ai);
            if (!move) continue; // 自杀或非法

            // 评分
            var score = 0;

            // 提子加分 (非常重要)
            score += move.captured.length * 50;

            // 自己落子后的气
            score += move.liberties * 2;

            // 威胁对方气少的棋
            for (var d2 = 0; d2 < 4; d2++) {
                var nr2 = cand.row + dirs[d2][0], nc2 = cand.col + dirs[d2][1];
                if (nr2 < 0 || nr2 >= N || nc2 < 0 || nc2 >= N) continue;
                if (state.board[nr2][nc2] === human) {
                    var g = findGroup(state.board, nr2, nc2);
                    if (g.liberties <= 1) score += 40;  // 打吃
                    else if (g.liberties <= 2) score += 15;
                }
            }

            // 解救自己危子
            for (var d3 = 0; d3 < 4; d3++) {
                var nr3 = cand.row + dirs[d3][0], nc3 = cand.col + dirs[d3][1];
                if (nr3 < 0 || nr3 >= N || nc3 < 0 || nc3 >= N) continue;
                if (state.board[nr3][nc3] === ai) {
                    var g2 = findGroup(state.board, nr3, nc3);
                    if (g2.liberties <= 1) score += 60;  // 自己被打吃 - 极高优先
                    else if (g2.liberties <= 2) score += 20;
                }
            }

            // 靠近中央（轻微）
            var distToCenter = Math.abs(cand.row - center) + Math.abs(cand.col - center);
            score += Math.max(0, 8 - distToCenter) * 0.3;

            // 避免边缘（轻微）
            var edgeDist = Math.min(cand.row, cand.col, N - 1 - cand.row, N - 1 - cand.col);
            if (edgeDist === 0) score -= 3;

            // 避免自杀性送吃（落子后仅1气且没提子）
            if (move.liberties === 1 && move.captured.length === 0) score -= 15;

            // 轻微随机化避免重复
            score += Math.random() * 0.5;

            if (score > bestScore) {
                bestScore = score;
                bestMoves = [cand];
            } else if (score === bestScore) {
                bestMoves.push(cand);
            }
        }

        if (bestMoves.length === 0) {
            return { isPass: true };
        }

        // 若最高得分非常低（纯送吃可能），考虑 Pass
        if (bestScore < -5 && state.moveCount > N * 2) {
            // 简单策略：继续下，但排除最坏
            return bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }

        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // ============= 启动 =============
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
