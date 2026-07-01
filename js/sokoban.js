/**
 * 推箱子游戏 - Sokoban Game
 * 10个关卡，难度递增
 */
(function() {
    'use strict';

    // ===== 关卡定义 =====
    // 0=空地, 1=墙, 2=地板, 3=目标, 4=箱子, 5=玩家, 6=箱子在目标上, 7=玩家在目标上
    // 箱子数量: 2, 2, 3, 3, 4, 4, 5, 5, 6, 7
    // 所有关卡设计确保可通关，无死角
    var LEVELS = [
        // 关卡1: 入门 - 2个箱子
        {
            width: 6, height: 6,
            map: [
                1, 1, 1, 1, 1, 1,
                1, 2, 2, 2, 2, 1,
                1, 2, 4, 2, 5, 1,
                1, 2, 4, 2, 2, 1,
                1, 3, 3, 2, 2, 1,
                1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡2: 2个箱子
        {
            width: 7, height: 6,
            map: [
                1, 1, 1, 1, 1, 1, 1,
                1, 2, 2, 5, 2, 2, 1,
                1, 2, 2, 4, 2, 2, 1,
                1, 2, 2, 4, 2, 2, 1,
                1, 2, 3, 3, 2, 2, 1,
                1, 1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡3: 3个箱子
        {
            width: 8, height: 7,
            map: [
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 2, 2, 5, 2, 2, 2, 1,
                1, 2, 4, 2, 4, 2, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 4, 2, 2, 2, 2, 1,
                1, 2, 3, 3, 3, 2, 2, 1,
                1, 1, 1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡4: 3个箱子
        {
            width: 8, height: 7,
            map: [
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 2, 5, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 2, 2, 1,
                1, 2, 3, 3, 3, 2, 2, 1,
                1, 1, 1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡5: 4个箱子
        {
            width: 8, height: 7,
            map: [
                1, 1, 1, 1, 1, 1, 1, 1,
                1, 2, 5, 2, 2, 2, 2, 1,
                1, 2, 4, 2, 4, 2, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 4, 2, 4, 2, 2, 1,
                1, 2, 3, 3, 3, 3, 2, 1,
                1, 1, 1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡6: 4个箱子
        {
            width: 9, height: 7,
            map: [
                1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 2, 5, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 2, 1,
                1, 2, 3, 3, 3, 3, 2, 2, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡7: 5个箱子
        {
            width: 10, height: 8,
            map: [
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 2, 5, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 4, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 2, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 3, 3, 3, 3, 3, 2, 2, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡8: 5个箱子
        {
            width: 10, height: 8,
            map: [
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 2, 5, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 4, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 2, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 3, 3, 3, 3, 3, 2, 2, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡9: 6个箱子
        {
            width: 10, height: 8,
            map: [
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 2, 5, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 4, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 4, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 3, 3, 3, 3, 3, 3, 2, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1
            ]
        },
        // 关卡10: 7个箱子 - 终极挑战
        {
            width: 12, height: 9,
            map: [
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 2, 5, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 4, 2, 4, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 4, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 2, 4, 2, 2, 2, 2, 2, 2, 2, 1,
                1, 2, 3, 3, 3, 3, 3, 3, 3, 2, 2, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
            ]
        }
    ];

    // ===== 游戏状态 =====
    var currentLevel = 0;
    var map = [];
    var playerPos = { x: 0, y: 0 };
    var steps = 0;
    var pushes = 0;
    var history = [];
    var gameWon = false;

    // ===== 计时系统 =====
    var levelStartTime = 0;       // 当前关卡开始时间 (ms)
    var levelElapsed = 0;         // 当前关卡已用时间 (秒)
    var timerInterval = null;     // 计时器 interval ID
    var totalTime = 0;            // 所有关卡累计通关时间 (秒)
    var levelTimes = [];          // 每关通关用时记录

    // ===== DOM 元素 =====
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var levelDisplay = document.getElementById('levelDisplay');
    var stepsDisplay = document.getElementById('stepsDisplay');
    var pushesDisplay = document.getElementById('pushesDisplay');
    var timeDisplay = document.getElementById('timeDisplay');
    var totalTimeDisplay = document.getElementById('totalTimeDisplay');
    var prevLevelBtn = document.getElementById('prevLevelBtn');
    var nextLevelBtn = document.getElementById('nextLevelBtn');
    var undoBtn = document.getElementById('undoBtn');
    var resetBtn = document.getElementById('resetBtn');
    var upBtn = document.getElementById('upBtn');
    var downBtn = document.getElementById('downBtn');
    var leftBtn = document.getElementById('leftBtn');
    var rightBtn = document.getElementById('rightBtn');
    var winModal = document.getElementById('winModal');
    var winSteps = document.getElementById('winSteps');
    var winPushes = document.getElementById('winPushes');
    var winTime = document.getElementById('winTime');
    var winTotalTime = document.getElementById('winTotalTime');
    var replayBtn = document.getElementById('replayBtn');
    var nextLevelWinBtn = document.getElementById('nextLevelWinBtn');

    // ===== 游戏常量 =====
    var TILE_SIZE = 40;
    var COLORS = {
        floor: '#f5e6d3',
        wall: '#5d4037',
        wallTop: '#795548',
        target: '#ff7043',
        targetGlow: 'rgba(255, 112, 67, 0.3)',
        box: '#8d6e63',
        boxOnTarget: '#66bb6a',
        boxHighlight: '#a1887f',
        player: '#42a5f5',
        playerFace: '#fff',
        playerOnTarget: '#29b6f6'
    };

    // ===== 初始化 =====
    var animFrameId = null;

    function init() {
        loadLevel(currentLevel);
        bindEvents();
        startAnimLoop();
    }

    function startAnimLoop() {
        function loop() {
            if (!gameWon) render();
            animFrameId = requestAnimationFrame(loop);
        }
        loop();
    }

    function loadLevel(levelIndex) {
        if (levelIndex < 0 || levelIndex >= LEVELS.length) return;

        currentLevel = levelIndex;
        var level = LEVELS[levelIndex];

        // 复制地图
        map = level.map.slice();

        // 找到玩家位置
        for (var i = 0; i < map.length; i++) {
            if (map[i] === 5 || map[i] === 7) {
                playerPos.x = i % level.width;
                playerPos.y = Math.floor(i / level.width);
                break;
            }
        }

        steps = 0;
        pushes = 0;
        history = [];
        gameWon = false;

        // 启动计时
        startTimer();

        updateDisplay();
        resizeCanvas();
        render();
    }

    // ===== 计时系统 =====
    function formatTime(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        levelStartTime = Date.now();
        levelElapsed = 0;
        timeDisplay.textContent = '0:00';
        timerInterval = setInterval(function() {
            if (gameWon) return;
            levelElapsed = Math.floor((Date.now() - levelStartTime) / 1000);
            timeDisplay.textContent = formatTime(levelElapsed);
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        levelElapsed = Math.floor((Date.now() - levelStartTime) / 1000);
    }

    function resizeCanvas() {
        var level = LEVELS[currentLevel];
        canvas.width = level.width * TILE_SIZE;
        canvas.height = level.height * TILE_SIZE;
    }

    function updateDisplay() {
        levelDisplay.textContent = (currentLevel + 1) + ' / ' + LEVELS.length;
        stepsDisplay.textContent = steps;
        pushesDisplay.textContent = pushes;
        totalTimeDisplay.textContent = formatTime(totalTime);

        prevLevelBtn.disabled = currentLevel === 0;
        nextLevelBtn.disabled = currentLevel === LEVELS.length - 1;
    }

    // ===== 渲染 =====
    function render() {
        var level = LEVELS[currentLevel];
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (var y = 0; y < level.height; y++) {
            for (var x = 0; x < level.width; x++) {
                var idx = y * level.width + x;
                var tile = map[idx];
                var px = x * TILE_SIZE;
                var py = y * TILE_SIZE;

                // 绘制地板
                if (tile !== 1 && tile !== 0) {
                    drawFloor(px, py);
                }

                // 绘制目标
                if (tile === 3 || tile === 6 || tile === 7) {
                    drawTarget(px, py);
                }

                // 绘制墙
                if (tile === 1) {
                    drawWall(px, py);
                }

                // 绘制箱子
                if (tile === 4 || tile === 6) {
                    drawBox(px, py, tile === 6);
                }

                // 绘制玩家
                if (tile === 5 || tile === 7) {
                    drawPlayer(px, py, tile === 7);
                }
            }
        }
    }

    function drawFloor(x, y) {
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        
        // 添加地板纹理
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }

    function drawWall(x, y) {
        // 墙面主体
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        
        // 墙面高光
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE / 3);
        
        // 墙面边框
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }

    function drawTarget(x, y) {
        var cx = x + TILE_SIZE / 2;
        var cy = y + TILE_SIZE / 2;
        var s = TILE_SIZE * 0.35;
        var t = Date.now ? Date.now() / 800 : 0;
        var pulse = 1 + Math.sin(t) * 0.08;

        // 外层光晕
        var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE_SIZE * 0.48);
        glow.addColorStop(0, 'rgba(255, 80, 120, 0.35)');
        glow.addColorStop(0.6, 'rgba(255, 80, 120, 0.12)');
        glow.addColorStop(1, 'rgba(255, 80, 120, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE_SIZE * 0.48, 0, Math.PI * 2);
        ctx.fill();

        // 菱形底座
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(pulse, pulse);

        // 菱形阴影
        ctx.fillStyle = 'rgba(180, 40, 80, 0.25)';
        ctx.beginPath();
        ctx.moveTo(0, -s + 1); ctx.lineTo(s + 1, 0); ctx.lineTo(0, s + 1); ctx.lineTo(-s + 1, 0);
        ctx.closePath(); ctx.fill();

        // 菱形渐变
        var dGrad = ctx.createLinearGradient(-s, -s, s, s);
        dGrad.addColorStop(0, '#ff4081');
        dGrad.addColorStop(0.5, '#ff80ab');
        dGrad.addColorStop(1, '#f50057');
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
        ctx.closePath(); ctx.fill();

        // 菱形高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.5, -s * 0.25); ctx.lineTo(0, 0); ctx.lineTo(-s * 0.5, -s * 0.25);
        ctx.closePath(); ctx.fill();

        // 菱形边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
        ctx.closePath(); ctx.stroke();

        // 中心星星
        drawStar(ctx, 0, 0, 4, s * 0.35, s * 0.15, 'rgba(255, 255, 255, 0.9)');

        ctx.restore();
    }

    function drawStar(c, cx, cy, spikes, outerR, innerR, color) {
        var rot = Math.PI / 2 * 3;
        var step = Math.PI / spikes;
        c.fillStyle = color;
        c.beginPath();
        c.moveTo(cx, cy - outerR);
        for (var i = 0; i < spikes; i++) {
            c.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            rot += step;
            c.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
            rot += step;
        }
        c.lineTo(cx, cy - outerR);
        c.closePath();
        c.fill();
    }

    function drawBox(x, y, onTarget) {
        var padding = 3;
        var bx = x + padding;
        var by = y + padding;
        var bs = TILE_SIZE - padding * 2;
        var r = 4; // corner radius

        // 箱子阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        roundRect(ctx, bx + 2, by + 3, bs, bs, r, true, false);

        // 箱子主体渐变
        var bodyGrad = ctx.createLinearGradient(bx, by, bx, by + bs);
        if (onTarget) {
            bodyGrad.addColorStop(0, '#66bb6a');
            bodyGrad.addColorStop(0.5, '#43a047');
            bodyGrad.addColorStop(1, '#2e7d32');
        } else {
            bodyGrad.addColorStop(0, '#ffca28');
            bodyGrad.addColorStop(0.5, '#ffa000');
            bodyGrad.addColorStop(1, '#e65100');
        }
        ctx.fillStyle = bodyGrad;
        roundRect(ctx, bx, by, bs, bs, r, true, false);

        // 木板纹理 - 横线
        ctx.strokeStyle = onTarget ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        for (var i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(bx + 2, by + bs * i / 3);
            ctx.lineTo(bx + bs - 2, by + bs * i / 3);
            ctx.stroke();
        }

        // 交叉木板条
        ctx.strokeStyle = onTarget ? 'rgba(255,255,255,0.2)' : 'rgba(139, 90, 43, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bx + 3, by + 3); ctx.lineTo(bx + bs - 3, by + bs - 3);
        ctx.moveTo(bx + bs - 3, by + 3); ctx.lineTo(bx + 3, by + bs - 3);
        ctx.stroke();

        // 金属角钉
        var nailR = 2.5;
        var nailColor = onTarget ? '#a5d6a7' : '#ffe082';
        var nailBorder = onTarget ? '#388e3c' : '#bf360c';
        var nails = [
            [bx + 5, by + 5], [bx + bs - 5, by + 5],
            [bx + 5, by + bs - 5], [bx + bs - 5, by + bs - 5]
        ];
        for (var n = 0; n < nails.length; n++) {
            ctx.fillStyle = nailColor;
            ctx.beginPath();
            ctx.arc(nails[n][0], nails[n][1], nailR, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = nailBorder;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 箱子边框
        ctx.strokeStyle = onTarget ? '#1b5e20' : '#bf360c';
        ctx.lineWidth = 2;
        roundRect(ctx, bx, by, bs, bs, r, false, true);

        // 顶部高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        roundRect(ctx, bx + 1, by + 1, bs - 2, bs * 0.3, r, true, false);

        // 在目标上时显示对勾
        if (onTarget) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(bx + bs * 0.25, by + bs * 0.5);
            ctx.lineTo(bx + bs * 0.45, by + bs * 0.7);
            ctx.lineTo(bx + bs * 0.75, by + bs * 0.3);
            ctx.stroke();
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
        }
    }

    function roundRect(c, x, y, w, h, r, fill, stroke) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.quadraticCurveTo(x + w, y, x + w, y + r);
        c.lineTo(x + w, y + h - r);
        c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        c.lineTo(x + r, y + h);
        c.quadraticCurveTo(x, y + h, x, y + h - r);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.closePath();
        if (fill) c.fill();
        if (stroke) c.stroke();
    }

    function drawPlayer(x, y, onTarget) {
        var cx = x + TILE_SIZE / 2;
        var cy = y + TILE_SIZE / 2;
        var s = TILE_SIZE;
        var u = s / 16; // unit scale

        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(cx + 1, cy + s * 0.38, s * 0.28, s * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // === 身体（蓝色工装裤）===
        ctx.fillStyle = '#1565c0';
        roundRect(ctx, cx - u * 3.5, cy - u * 1, u * 7, u * 6, u * 1.5, true, false);

        // 工装裤吊带
        ctx.fillStyle = '#1565c0';
        ctx.fillRect(cx - u * 3, cy - u * 3, u * 2, u * 3);
        ctx.fillRect(cx + u * 1, cy - u * 3, u * 2, u * 3);

        // 工装裤纽扣
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(cx - u * 2, cy - u * 1.5, u * 0.7, 0, Math.PI * 2);
        ctx.arc(cx + u * 2, cy - u * 1.5, u * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // === 红色上衣/手臂 ===
        ctx.fillStyle = '#e53935';
        roundRect(ctx, cx - u * 4.5, cy - u * 4, u * 3, u * 5, u * 1, true, false);
        roundRect(ctx, cx + u * 1.5, cy - u * 4, u * 3, u * 5, u * 1, true, false);

        // === 头部（肤色）===
        var headR = u * 4;
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(cx, cy - u * 4, headR, 0, Math.PI * 2);
        ctx.fill();

        // === 红色帽子 ===
        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.ellipse(cx, cy - u * 6.5, u * 5, u * 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // 帽檐
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.ellipse(cx + u * 1, cy - u * 5, u * 5.5, u * 1.5, 0, 0, Math.PI);
        ctx.fill();

        // 帽子 M 标志 - 白色圆底
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx, cy - u * 6.5, u * 1.8, 0, Math.PI * 2);
        ctx.fill();
        // M 字母
        ctx.fillStyle = '#e53935';
        ctx.font = 'bold ' + (u * 2.5) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', cx, cy - u * 6.3);

        // === 眼睛 ===
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(cx - u * 1.5, cy - u * 4.5, u * 1.2, u * 1.4, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + u * 1.5, cy - u * 4.5, u * 1.2, u * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // 瞳孔
        ctx.fillStyle = '#1a237e';
        ctx.beginPath();
        ctx.arc(cx - u * 1.2, cy - u * 4.3, u * 0.7, 0, Math.PI * 2);
        ctx.arc(cx + u * 1.8, cy - u * 4.3, u * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // === 鼻子 ===
        ctx.fillStyle = '#ff8a65';
        ctx.beginPath();
        ctx.ellipse(cx + u * 0.5, cy - u * 3, u * 1.2, u * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // === 胡子 ===
        ctx.fillStyle = '#4e342e';
        ctx.beginPath();
        ctx.ellipse(cx - u * 1.5, cy - u * 2, u * 2, u * 0.8, -0.2, 0, Math.PI * 2);
        ctx.ellipse(cx + u * 1.5, cy - u * 2, u * 2, u * 0.8, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // === 鞋子 ===
        ctx.fillStyle = '#5d4037';
        roundRect(ctx, cx - u * 4, cy + u * 4.5, u * 3.5, u * 2, u * 1, true, false);
        roundRect(ctx, cx + u * 0.5, cy + u * 4.5, u * 3.5, u * 2, u * 1, true, false);
    }

    // ===== 游戏逻辑 =====
    function getTile(x, y) {
        var level = LEVELS[currentLevel];
        if (x < 0 || x >= level.width || y < 0 || y >= level.height) return 1;
        return map[y * level.width + x];
    }

    function setTile(x, y, value) {
        var level = LEVELS[currentLevel];
        if (x < 0 || x >= level.width || y < 0 || y >= level.height) return;
        map[y * level.width + x] = value;
    }

    function isWalkable(tile) {
        return tile === 2 || tile === 3 || tile === 7;
    }

    function isBox(tile) {
        return tile === 4 || tile === 6;
    }

    function move(dx, dy) {
        if (gameWon) return;

        var newX = playerPos.x + dx;
        var newY = playerPos.y + dy;
        var targetTile = getTile(newX, newY);

        // 保存状态用于撤销
        var prevState = {
            map: map.slice(),
            playerPos: { x: playerPos.x, y: playerPos.y },
            steps: steps,
            pushes: pushes
        };

        var moved = false;
        var pushed = false;

        if (isWalkable(targetTile)) {
            // 移动到空地或目标
            var currentTile = getTile(playerPos.x, playerPos.y);
            setTile(playerPos.x, playerPos.y, currentTile === 7 ? 3 : 2);
            setTile(newX, newY, targetTile === 3 ? 7 : 5);
            playerPos.x = newX;
            playerPos.y = newY;
            moved = true;
        } else if (isBox(targetTile)) {
            // 推箱子
            var boxNewX = newX + dx;
            var boxNewY = newY + dy;
            var boxTargetTile = getTile(boxNewX, boxNewY);

            if (isWalkable(boxTargetTile)) {
                // 移动玩家
                var currentTile = getTile(playerPos.x, playerPos.y);
                setTile(playerPos.x, playerPos.y, currentTile === 7 ? 3 : 2);
                setTile(newX, newY, targetTile === 6 ? 7 : 5);
                // 移动箱子
                setTile(boxNewX, boxNewY, boxTargetTile === 3 ? 6 : 4);
                playerPos.x = newX;
                playerPos.y = newY;
                moved = true;
                pushed = true;
            }
        }

        if (moved) {
            history.push(prevState);
            if (history.length > 100) history.shift(); // 限制历史记录长度

            steps++;
            if (pushed) pushes++;
            updateDisplay();
            render();
            checkWin();
        }
    }

    function undo() {
        if (history.length === 0 || gameWon) return;

        var prevState = history.pop();
        map = prevState.map;
        playerPos = prevState.playerPos;
        steps = prevState.steps;
        pushes = prevState.pushes;

        updateDisplay();
        render();
    }

    function reset() {
        loadLevel(currentLevel);
    }

    function checkWin() {
        // 检查是否所有目标上都有箱子
        for (var i = 0; i < map.length; i++) {
            if (map[i] === 3 || map[i] === 7) {
                return; // 还有空目标
            }
        }

        // 过关！停止计时并记录
        gameWon = true;
        stopTimer();

        // 记录当前关卡通关时间
        levelTimes[currentLevel] = levelElapsed;

        // 计算总用时（所有已通关关卡的时间总和）
        totalTime = 0;
        for (var t = 0; t <= currentLevel; t++) {
            totalTime += (levelTimes[t] || 0);
        }
        totalTimeDisplay.textContent = formatTime(totalTime);

        setTimeout(showWinModal, 300);
    }

    function showWinModal() {
        winSteps.textContent = steps;
        winPushes.textContent = pushes;
        winTime.textContent = formatTime(levelElapsed);
        winTotalTime.textContent = formatTime(totalTime);
        winModal.style.display = 'flex';

        // 如果是最后一关，禁用下一关按钮
        nextLevelWinBtn.disabled = currentLevel === LEVELS.length - 1;
        nextLevelWinBtn.textContent = currentLevel === LEVELS.length - 1 ? '已完成全部' : '下一关';
    }

    function hideWinModal() {
        winModal.style.display = 'none';
    }

    function nextLevel() {
        if (currentLevel < LEVELS.length - 1) {
            loadLevel(currentLevel + 1);
        }
    }

    function prevLevel() {
        if (currentLevel > 0) {
            loadLevel(currentLevel - 1);
        }
    }

    // ===== 事件绑定 =====
    function bindEvents() {
        // 键盘控制
        document.addEventListener('keydown', function(e) {
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    move(0, -1);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    move(0, 1);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    move(-1, 0);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    move(1, 0);
                    break;
                case 'z':
                case 'Z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        undo();
                    }
                    break;
                case 'r':
                case 'R':
                    e.preventDefault();
                    reset();
                    break;
            }
        });

        // 按钮控制
        upBtn.addEventListener('click', function() { move(0, -1); });
        downBtn.addEventListener('click', function() { move(0, 1); });
        leftBtn.addEventListener('click', function() { move(-1, 0); });
        rightBtn.addEventListener('click', function() { move(1, 0); });
        undoBtn.addEventListener('click', undo);
        resetBtn.addEventListener('click', reset);
        prevLevelBtn.addEventListener('click', prevLevel);
        nextLevelBtn.addEventListener('click', nextLevel);

        // 过关弹窗按钮
        replayBtn.addEventListener('click', function() {
            hideWinModal();
            reset();
        });
        nextLevelWinBtn.addEventListener('click', function() {
            hideWinModal();
            nextLevel();
        });

        // 触摸滑动控制
        var touchStartX = 0;
        var touchStartY = 0;
        var touchThreshold = 30;

        canvas.addEventListener('touchstart', function(e) {
            var touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        }, { passive: true });

        canvas.addEventListener('touchend', function(e) {
            var touch = e.changedTouches[0];
            var dx = touch.clientX - touchStartX;
            var dy = touch.clientY - touchStartY;

            if (Math.abs(dx) < touchThreshold && Math.abs(dy) < touchThreshold) {
                return; // 滑动距离太短
            }

            if (Math.abs(dx) > Math.abs(dy)) {
                // 水平滑动
                if (dx > 0) {
                    move(1, 0);
                } else {
                    move(-1, 0);
                }
            } else {
                // 垂直滑动
                if (dy > 0) {
                    move(0, 1);
                } else {
                    move(0, -1);
                }
            }
        }, { passive: true });
    }

    // 初始化游戏
    init();
})();
