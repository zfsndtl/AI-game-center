/**
 * 桌上足球 - 11人制人机对战
 * 支持4种阵容: 442, 4231, 433, 4132
 */
(function() {
    'use strict';

    // ===== 游戏常量 =====
    var BALL_RADIUS = 10;
    var PLAYER_RADIUS = 14;
    var GOAL_HEIGHT_RATIO = 0.35;

    // 时间配置（实际秒数 / 显示分钟数）
    // 无论实际时长多少，都显示90分钟（足球比赛标准时长）
    var DURATION_CONFIG = {
        '1': { real: 60, display: 90 },   // 1分钟实际 = 90分钟显示
        '3': { real: 180, display: 90 },  // 3分钟实际 = 90分钟显示
        '5': { real: 300, display: 90 }   // 5分钟实际 = 90分钟显示
    };
    var GAME_DURATION_REAL = 180; // 默认3分钟
    var GAME_DURATION_DISPLAY = 90;
    var TIME_RATIO = GAME_DURATION_DISPLAY / GAME_DURATION_REAL;
    
    // ===== 阵容配置 =====
    // 每个阵容定义11人的位置 [守门员, 后卫, 中场, 前锋]
    var FORMATIONS = {
        '442': {
            name: '4-4-2',
            rods: [
                { count: 1, x: 0.08, type: 'GK' },    // 守门员
                { count: 4, x: 0.22, type: 'DEF' },   // 后卫
                { count: 4, x: 0.42, type: 'MID' },   // 中场
                { count: 2, x: 0.62, type: 'FWD' }    // 前锋
            ]
        },
        '4231': {
            name: '4-2-3-1',
            rods: [
                { count: 1, x: 0.08, type: 'GK' },
                { count: 4, x: 0.22, type: 'DEF' },
                { count: 2, x: 0.38, type: 'MID' },
                { count: 3, x: 0.52, type: 'MID' },
                { count: 1, x: 0.68, type: 'FWD' }
            ]
        },
        '433': {
            name: '4-3-3',
            rods: [
                { count: 1, x: 0.08, type: 'GK' },
                { count: 4, x: 0.22, type: 'DEF' },
                { count: 3, x: 0.44, type: 'MID' },
                { count: 3, x: 0.62, type: 'FWD' }
            ]
        },
        '4132': {
            name: '4-1-3-2',
            rods: [
                { count: 1, x: 0.08, type: 'GK' },
                { count: 4, x: 0.22, type: 'DEF' },
                { count: 1, x: 0.36, type: 'MID' },
                { count: 3, x: 0.50, type: 'MID' },
                { count: 2, x: 0.66, type: 'FWD' }
            ]
        }
    };
    
    // 球员类型样式配置
    var PLAYER_STYLES = {
        'GK': { color: '#FFD700', width: 18, height: 26 }, // 守门员 - 金色
        'DEF': { color: '#E74C3C', width: 14, height: 22 }, // 后卫 - 红色（队伍颜色）
        'MID': { color: '#E74C3C', width: 14, height: 22 }, // 中场 - 红色（队伍颜色）
        'FWD': { color: '#E74C3C', width: 15, height: 24 }  // 前锋 - 红色（队伍颜色）
    };
    
    // AI队伍颜色（蓝色）
    var AI_PLAYER_STYLES = {
        'GK': { color: '#FFD700', width: 18, height: 26 }, // 守门员 - 金色
        'DEF': { color: '#3498DB', width: 14, height: 22 }, // 后卫 - 蓝色
        'MID': { color: '#3498DB', width: 14, height: 22 }, // 中场 - 蓝色
        'FWD': { color: '#3498DB', width: 15, height: 24 }  // 前锋 - 蓝色
    };

    // ===== 游戏状态 =====
    var canvas, ctx;
    var gameWidth, gameHeight;
    var gameState = 'menu'; // menu, playing, paused, ended
    var soundEnabled = true;
    var score1 = 0;
    var score2 = 0;
    var gameTime = 0;
    var lastTime = 0;
    var animationId = null;
    var goalPending = false; // 防止进球重复计分

    // ===== 阵容选择 =====
    var playerFormation = '442';
    var aiFormation = '442';

    // ===== 物理对象 =====
    var ball = { x: 0, y: 0, vx: 0, vy: 0 };
    var playerRods = [];
    var aiRods = [];

    // ===== 控制 =====
    var keys = {};
    var touchDirection = 0;

    // ===== DOM 元素 =====
    var elements = {};

    // ===== 初始化 =====
    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');

        elements = {
            overlay: document.getElementById('gameOverlay'),
            goalOverlay: document.getElementById('goalOverlay'),
            score1: document.getElementById('score1'),
            score2: document.getElementById('score2'),
            timer: document.getElementById('gameTimer'),
            pauseBtn: document.getElementById('pauseBtn'),
            restartBtn: document.getElementById('restartBtn'),
            startBtn: document.getElementById('startBtn'),
            soundBtn: document.getElementById('soundBtn'),
            difficultyLevel: document.getElementById('difficultyLevel'),
            touchControls: document.getElementById('touchControls'),
            touchUp: document.getElementById('touchUp'),
            touchDown: document.getElementById('touchDown'),
            formation1: document.getElementById('formation1'),
            formation2: document.getElementById('formation2'),
            durationSelect: document.getElementById('durationSelect')
        };

        setupCanvas();
        bindEvents();
        render();
    }

    // ===== 设置画布 =====
    function setupCanvas() {
        var container = document.getElementById('gameContainer');
        var containerWidth = container.clientWidth - 20;
        var containerHeight = container.clientHeight - 20;
        
        var aspectRatio = 1.6; // 横向比例
        
        if (containerWidth / containerHeight > aspectRatio) {
            gameHeight = containerHeight;
            gameWidth = gameHeight * aspectRatio;
        } else {
            gameWidth = containerWidth;
            gameHeight = gameWidth / aspectRatio;
        }
        
        canvas.width = gameWidth;
        canvas.height = gameHeight;
    }

    // ===== 绑定事件 =====
    function bindEvents() {
        // 阵容选择
        document.querySelectorAll('.formation-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.formation-btn').forEach(function(b) {
                    b.classList.remove('active');
                });
                this.classList.add('active');
                playerFormation = this.dataset.formation;
            });
        });

        // 开始游戏
        elements.startBtn.addEventListener('click', startGame);

        // 控制按钮
        elements.pauseBtn.addEventListener('click', togglePause);
        elements.restartBtn.addEventListener('click', restartGame);

        // 音效
        elements.soundBtn.addEventListener('click', function() {
            soundEnabled = !soundEnabled;
            this.classList.toggle('muted', !soundEnabled);
            this.textContent = soundEnabled ? '🔊' : '🔇';
        });

        // 键盘控制
        document.addEventListener('keydown', function(e) {
            keys[e.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', function(e) {
            keys[e.key.toLowerCase()] = false;
        });

        // 触摸控制
        setupTouchControls();

        // 窗口大小变化
        window.addEventListener('resize', function() {
            setupCanvas();
            if (gameState === 'playing') {
                setupRods();
            }
            render();
        });
    }

    // ===== 触摸控制 =====
    function setupTouchControls() {
        var touchUp = elements.touchUp;
        var touchDown = elements.touchDown;

        touchUp.addEventListener('touchstart', function(e) {
            e.preventDefault();
            touchDirection = -1;
        }, { passive: false });

        touchUp.addEventListener('touchend', function() {
            touchDirection = 0;
        });

        touchDown.addEventListener('touchstart', function(e) {
            e.preventDefault();
            touchDirection = 1;
        }, { passive: false });

        touchDown.addEventListener('touchend', function() {
            touchDirection = 0;
        });
    }

    // ===== 开始游戏 =====
    function startGame() {
        score1 = 0;
        score2 = 0;
        gameTime = 0;

        // 根据选择设置游戏时长
        var durationKey = elements.durationSelect ? elements.durationSelect.value : '3';
        var durationConfig = DURATION_CONFIG[durationKey] || DURATION_CONFIG['3'];
        GAME_DURATION_REAL = durationConfig.real;
        GAME_DURATION_DISPLAY = durationConfig.display;
        TIME_RATIO = GAME_DURATION_DISPLAY / GAME_DURATION_REAL;

        elements.score1.textContent = '0';
        elements.score2.textContent = '0';

        // AI随机阵容
        var formations = ['442', '4231', '433', '4132'];
        aiFormation = formations[Math.floor(Math.random() * formations.length)];
        
        // 显示阵容
        elements.formation1.textContent = FORMATIONS[playerFormation].name;
        elements.formation2.textContent = FORMATIONS[aiFormation].name;
        
        // 隐藏覆盖层
        elements.overlay.classList.add('hidden');
        
        // 移动端显示触摸控制
        if (window.innerWidth <= 768) {
            elements.touchControls.style.display = 'flex';
        }
        
        setupRods();
        resetBall();
        gameState = 'playing';
        goalPending = false;
        lastTime = performance.now();
        animationId = requestAnimationFrame(gameLoop);
    }

    // ===== 设置球员杆 =====
    function setupRods() {
        playerRods = [];
        aiRods = [];
        
        // 创建玩家的杆（左侧）
        FORMATIONS[playerFormation].rods.forEach(function(rodConfig) {
            playerRods.push(createRod(rodConfig, 1));
        });
        
        // 创建AI的杆（右侧）
        FORMATIONS[aiFormation].rods.forEach(function(rodConfig) {
            aiRods.push(createRod(rodConfig, 2));
        });
    }

    // ===== 创建杆 =====
    function createRod(config, team) {
        var x = team === 1 ? config.x * gameWidth : (1 - config.x) * gameWidth;
        var playerSpacing = gameHeight / (config.count + 1);
        
        var players = [];
        for (var i = 0; i < config.count; i++) {
            players.push({
                y: playerSpacing * (i + 1),
                type: config.type
            });
        }
        
        return {
            x: x,
            y: gameHeight / 2,
            players: players,
            type: config.type,
            targetY: gameHeight / 2
        };
    }

    // ===== 重置球 =====
    function resetBall() {
        ball.x = gameWidth / 2;
        ball.y = gameHeight / 2;
        
        var angle = (Math.random() - 0.5) * Math.PI / 3;
        var speed = 4;
        var direction = Math.random() > 0.5 ? 1 : -1;
        
        ball.vx = Math.cos(angle) * speed * direction;
        ball.vy = Math.sin(angle) * speed;
    }

    // ===== 游戏循环 =====
    function gameLoop(timestamp) {
        if (gameState !== 'playing') return;

        // 确保时间戳有效
        if (!timestamp) timestamp = performance.now();

        var deltaTime = (timestamp - lastTime) / 1000;
        // 防止第一帧或异常情况产生过大的deltaTime
        if (deltaTime < 0 || deltaTime > 0.1) {
            deltaTime = 0.016; // 默认约60fps
        }
        lastTime = timestamp;

        gameTime += deltaTime;
        updateTimer();
        update(deltaTime);
        render();

        animationId = requestAnimationFrame(gameLoop);
    }

    // ===== 更新游戏状态 =====
    function update(dt) {
        handleInput();
        updateAI(dt);
        updateBall();
        checkCollisions();
        checkGoal();
    }

    // ===== 处理输入 =====
    function handleInput() {
        var moveSpeed = 6;
        var dy = 0;
        
        // 键盘输入
        if (keys['w'] || keys['arrowup']) dy -= moveSpeed;
        if (keys['s'] || keys['arrowdown']) dy += moveSpeed;
        
        // 触摸输入
        dy += touchDirection * moveSpeed;
        
        // 移动所有玩家的杆
        playerRods.forEach(function(rod) {
            rod.targetY += dy;
            rod.targetY = Math.max(PLAYER_RADIUS * 2, Math.min(gameHeight - PLAYER_RADIUS * 2, rod.targetY));
            rod.y += (rod.targetY - rod.y) * 0.25;
        });
    }

    // ===== AI控制 =====
    function updateAI(dt) {
        var difficulty = elements.difficultyLevel.value;
        var speeds = { easy: 0.03, medium: 0.06, hard: 0.12 };
        var speed = speeds[difficulty];
        
        // 根据球的位置决定激活哪个杆
        var ballRatio = ball.x / gameWidth;
        
        aiRods.forEach(function(rod) {
            // 如果球在AI半场，追球
            if (ballRatio > 0.5) {
                var targetY = ball.y;
                rod.targetY += (targetY - rod.targetY) * speed;
            } else {
                // 球在对方半场，回到中间
                rod.targetY += (gameHeight / 2 - rod.targetY) * 0.02;
            }
            
            rod.targetY = Math.max(PLAYER_RADIUS * 2, Math.min(gameHeight - PLAYER_RADIUS * 2, rod.targetY));
            rod.y += (rod.targetY - rod.y) * 0.2;
        });
    }

    // ===== 更新球 =====
    function updateBall() {
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // 上下边界反弹
        if (ball.y - BALL_RADIUS < 0 || ball.y + BALL_RADIUS > gameHeight) {
            ball.vy *= -0.95;
            ball.y = Math.max(BALL_RADIUS, Math.min(gameHeight - BALL_RADIUS, ball.y));
            playSound('bounce');
        }
        
        // 左右边界（非球门区域）反弹
        var goalTop = (gameHeight - gameHeight * GOAL_HEIGHT_RATIO) / 2;
        var goalBottom = goalTop + gameHeight * GOAL_HEIGHT_RATIO;
        
        if (ball.x - BALL_RADIUS < 0) {
            if (ball.y < goalTop || ball.y > goalBottom) {
                ball.vx = Math.abs(ball.vx) * 0.8;
                ball.x = BALL_RADIUS;
                playSound('bounce');
            }
        }
        
        if (ball.x + BALL_RADIUS > gameWidth) {
            if (ball.y < goalTop || ball.y > goalBottom) {
                ball.vx = -Math.abs(ball.vx) * 0.8;
                ball.x = gameWidth - BALL_RADIUS;
                playSound('bounce');
            }
        }
        
        // 速度限制
        var maxSpeed = 12;
        var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed > maxSpeed) {
            ball.vx = (ball.vx / speed) * maxSpeed;
            ball.vy = (ball.vy / speed) * maxSpeed;
        }
        
        // 摩擦力
        ball.vx *= 0.998;
        ball.vy *= 0.998;
    }

    // ===== 碰撞检测 =====
    function checkCollisions() {
        var allRods = playerRods.concat(aiRods);
        
        allRods.forEach(function(rod) {
            rod.players.forEach(function(player) {
                var py = rod.y + player.y - gameHeight / 2;
                var style = PLAYER_STYLES[player.type];
                var halfW = style.width / 2;
                var halfH = style.height / 2;
                
                // 简化碰撞检测
                if (Math.abs(ball.x - rod.x) < BALL_RADIUS + halfW &&
                    Math.abs(ball.y - py) < BALL_RADIUS + halfH) {
                    
                    // 计算反弹方向
                    var dx = ball.x - rod.x;
                    var dy = ball.y - py;
                    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    // 根据杆的位置决定击球力度和方向
                    var isPlayer = rod.x < gameWidth / 2;
                    var kickPower = player.type === 'FWD' ? 12 : player.type === 'GK' ? 8 : 10;
                    
                    ball.vx = (dx / dist) * kickPower;
                    ball.vy = (dy / dist) * 8;
                    
                    // 确保球朝正确方向
                    if (isPlayer) {
                        ball.vx = Math.max(3, ball.vx);
                    } else {
                        ball.vx = Math.min(-3, ball.vx);
                    }
                    
                    // 防止球卡在杆里
                    ball.x = rod.x + (isPlayer ? halfW + BALL_RADIUS + 2 : -halfW - BALL_RADIUS - 2);
                    
                    playSound('hit');
                }
            });
        });
    }

    // ===== 检查进球 =====
    function checkGoal() {
        // 如果正在处理进球，跳过检测
        if (goalPending) return;

        var goalTop = (gameHeight - gameHeight * GOAL_HEIGHT_RATIO) / 2;
        var goalBottom = goalTop + gameHeight * GOAL_HEIGHT_RATIO;

        // 球进入左侧球门（玩家方）-> AI得分
        if (ball.x < 0 && ball.y > goalTop && ball.y < goalBottom) {
            goalPending = true;
            score2++; // AI得分
            elements.score2.textContent = score2;
            showGoal();
            setTimeout(function() {
                resetBall();
                goalPending = false;
            }, 1000);
        }

        // 球进入右侧球门（AI方）-> 玩家得分
        if (ball.x > gameWidth && ball.y > goalTop && ball.y < goalBottom) {
            goalPending = true;
            score1++; // 玩家得分
            elements.score1.textContent = score1;
            showGoal();
            setTimeout(function() {
                resetBall();
                goalPending = false;
            }, 1000);
        }
    }

    // ===== 显示进球 =====
    function showGoal() {
        elements.goalOverlay.classList.add('show');
        playSound('goal');
        setTimeout(function() {
            elements.goalOverlay.classList.remove('show');
        }, 1000);
    }

    // ===== 显示游戏结束 =====
    function showGameOver(winner) {
        elements.overlay.classList.remove('hidden');
        document.querySelector('.overlay-title').textContent = winner;
        document.querySelector('.overlay-subtitle').textContent = '最终比分: ' + score1 + ' - ' + score2;
        document.querySelector('.formation-select').style.display = 'none';
        elements.startBtn.textContent = '再来一局';
        elements.touchControls.style.display = 'none';
    }

    // ===== 暂停/继续 =====
    function togglePause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            elements.pauseBtn.textContent = '▶️ 继续';
            cancelAnimationFrame(animationId);
        } else if (gameState === 'paused') {
            gameState = 'playing';
            elements.pauseBtn.textContent = '⏸️ 暂停';
            lastTime = performance.now();
            animationId = requestAnimationFrame(gameLoop);
        }
    }

    // ===== 重新开始 =====
    function restartGame() {
        cancelAnimationFrame(animationId);
        gameState = 'menu';
        score1 = 0;
        score2 = 0;
        gameTime = 0;
        
        elements.score1.textContent = '0';
        elements.score2.textContent = '0';
        elements.timer.textContent = '00:00 / 90:00';
        elements.overlay.classList.remove('hidden');
        document.querySelector('.overlay-title').textContent = '⚽ 桌上足球';
        document.querySelector('.overlay-subtitle').textContent = '人机对战 · 11人制';
        document.querySelector('.formation-select').style.display = 'block';
        elements.startBtn.textContent = '开始比赛';
        elements.touchControls.style.display = 'none';
        elements.pauseBtn.textContent = '⏸️ 暂停';
        
        render();
    }

    // ===== 更新计时器 =====
    function updateTimer() {
        // gameTime 是实际时间（秒）
        // 显示时间（分钟）= 实际时间 * TIME_RATIO
        // TIME_RATIO = 90/180 = 0.5，所以1秒实际时间 = 0.5分钟显示时间

        var displayMinutes = gameTime * TIME_RATIO; // 显示分钟数（可以是小数）
        var minutes = Math.floor(displayMinutes);
        var seconds = Math.floor((displayMinutes - minutes) * 60);

        // 确保时间有效
        if (isNaN(minutes) || isNaN(seconds)) {
            minutes = 0;
            seconds = 0;
        }

        // 显示当前时间 / 总时长（固定显示90分钟）
        var currentTime = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        elements.timer.textContent = currentTime + ' / 90:00';

        // 检查比赛是否结束（实际时间达到180秒）
        if (gameTime >= GAME_DURATION_REAL) {
            endGame();
        }
    }
    
    // ===== 比赛结束 =====
    function endGame() {
        gameState = 'ended';
        cancelAnimationFrame(animationId);
        
        var winner;
        if (score1 > score2) {
            winner = '🎉 你赢了!';
        } else if (score2 > score1) {
            winner = '😔 AI获胜';
        } else {
            winner = '🤝 平局';
        }
        
        showGameOver(winner);
    }

    // ===== 渲染 =====
    function render() {
        drawField();
        drawGoals();
        drawRods(playerRods, 1);
        drawRods(aiRods, 2);
        drawBall();
    }

    // ===== 绘制球场 =====
    function drawField() {
        // 草坪背景
        var gradient = ctx.createLinearGradient(0, 0, 0, gameHeight);
        gradient.addColorStop(0, '#2d5a3d');
        gradient.addColorStop(0.5, '#3a7d44');
        gradient.addColorStop(1, '#2d5a3d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, gameWidth, gameHeight);

        // 草坪条纹
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        var stripeWidth = gameWidth / 12;
        for (var i = 0; i < 12; i += 2) {
            ctx.fillRect(i * stripeWidth, 0, stripeWidth, gameHeight);
        }

        // 边线
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, gameWidth - 8, gameHeight - 8);

        // 中线
        ctx.beginPath();
        ctx.moveTo(gameWidth / 2, 0);
        ctx.lineTo(gameWidth / 2, gameHeight);
        ctx.stroke();

        // 中圈
        ctx.beginPath();
        ctx.arc(gameWidth / 2, gameHeight / 2, 50, 0, Math.PI * 2);
        ctx.stroke();

        // 中点
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(gameWidth / 2, gameHeight / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // 禁区线
        drawPenaltyAreas();
    }

    // ===== 绘制禁区线 =====
    function drawPenaltyAreas() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;

        var goalHeight = gameHeight * GOAL_HEIGHT_RATIO;
        var goalCenterY = gameHeight / 2;

        // 小禁区尺寸
        var smallBoxWidth = gameWidth * 0.08;
        var smallBoxHeight = goalHeight * 1.4;

        // 大禁区尺寸
        var bigBoxWidth = gameWidth * 0.18;
        var bigBoxHeight = goalHeight * 2.2;

        // 左侧小禁区（玩家方）
        ctx.beginPath();
        ctx.moveTo(4, goalCenterY - smallBoxHeight / 2);
        ctx.lineTo(smallBoxWidth, goalCenterY - smallBoxHeight / 2);
        ctx.lineTo(smallBoxWidth, goalCenterY + smallBoxHeight / 2);
        ctx.lineTo(4, goalCenterY + smallBoxHeight / 2);
        ctx.stroke();

        // 左侧大禁区（玩家方）
        ctx.beginPath();
        ctx.moveTo(4, goalCenterY - bigBoxHeight / 2);
        ctx.lineTo(bigBoxWidth, goalCenterY - bigBoxHeight / 2);
        ctx.lineTo(bigBoxWidth, goalCenterY + bigBoxHeight / 2);
        ctx.lineTo(4, goalCenterY + bigBoxHeight / 2);
        ctx.stroke();

        // 右侧小禁区（AI方）
        ctx.beginPath();
        ctx.moveTo(gameWidth - 4, goalCenterY - smallBoxHeight / 2);
        ctx.lineTo(gameWidth - smallBoxWidth, goalCenterY - smallBoxHeight / 2);
        ctx.lineTo(gameWidth - smallBoxWidth, goalCenterY + smallBoxHeight / 2);
        ctx.lineTo(gameWidth - 4, goalCenterY + smallBoxHeight / 2);
        ctx.stroke();

        // 右侧大禁区（AI方）
        ctx.beginPath();
        ctx.moveTo(gameWidth - 4, goalCenterY - bigBoxHeight / 2);
        ctx.lineTo(gameWidth - bigBoxWidth, goalCenterY - bigBoxHeight / 2);
        ctx.lineTo(gameWidth - bigBoxWidth, goalCenterY + bigBoxHeight / 2);
        ctx.lineTo(gameWidth - 4, goalCenterY + bigBoxHeight / 2);
        ctx.stroke();

        // 点球点
        var penaltySpotX = gameWidth * 0.12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(penaltySpotX, goalCenterY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gameWidth - penaltySpotX, goalCenterY, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // ===== 绘制球门 =====
    function drawGoals() {
        var goalHeight = gameHeight * GOAL_HEIGHT_RATIO;
        var goalTop = (gameHeight - goalHeight) / 2;
        var goalWidth = 8;
        
        // 左侧球门（玩家方）
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, goalTop, goalWidth, goalHeight);
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, goalTop, goalWidth, goalHeight);
        
        // 右侧球门（AI方）
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(gameWidth - goalWidth, goalTop, goalWidth, goalHeight);
        ctx.strokeStyle = '#E74C3C';
        ctx.strokeRect(gameWidth - goalWidth, goalTop, goalWidth, goalHeight);
    }

    // ===== 绘制球员杆 =====
    function drawRods(rods, team) {
        rods.forEach(function(rod) {
            rod.players.forEach(function(player) {
                var py = rod.y + player.y - gameHeight / 2;
                var isGK = player.type === 'GK';
                var isAI = team === 2;
                
                // 杆线
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(rod.x, 0);
                ctx.lineTo(rod.x, gameHeight);
                ctx.stroke();
                
                // 绘制超级玛丽风格的球员
                drawMarioStylePlayer(rod.x, py, isGK, isAI);
            });
        });
    }
    
    // ===== 绘制超级玛丽风格球员 =====
    function drawMarioStylePlayer(x, y, isGK, isAI) {
        var scale = isGK ? 1.3 : 1;
        var headRadius = 8 * scale;
        var bodyWidth = 12 * scale;
        var bodyHeight = 14 * scale;
        
        // 队伍颜色
        var teamColor = isAI ? '#3498DB' : '#E74C3C'; // AI蓝色，玩家红色
        if (isGK) teamColor = '#FFD700'; // 守门员金色
        
        var skinColor = '#FFDAB9'; // 皮肤颜色
        var shortsColor = isAI ? '#1a5276' : '#922b21'; // 短裤颜色
        
        ctx.save();
        ctx.translate(x, y);
        
        // === 阴影 ===
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 10 * scale, bodyWidth / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // === 腿 ===
        ctx.fillStyle = skinColor;
        // 左腿
        ctx.beginPath();
        ctx.ellipse(-3 * scale, 8 * scale, 3 * scale, 5 * scale, 0.2, 0, Math.PI * 2);
        ctx.fill();
        // 右腿
        ctx.beginPath();
        ctx.ellipse(3 * scale, 8 * scale, 3 * scale, 5 * scale, -0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // === 短裤 ===
        ctx.fillStyle = shortsColor;
        ctx.beginPath();
        ctx.roundRect(-5 * scale, 2 * scale, 10 * scale, 6 * scale, 2);
        ctx.fill();
        
        // === 身体（球衣） ===
        var gradient = ctx.createLinearGradient(0, -8 * scale, 0, 4 * scale);
        gradient.addColorStop(0, lightenColor(teamColor, 20));
        gradient.addColorStop(1, teamColor);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(-6 * scale, -6 * scale, 12 * scale, 10 * scale, 3);
        ctx.fill();
        
        // 球衣条纹
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-5 * scale, -2 * scale);
        ctx.lineTo(5 * scale, -2 * scale);
        ctx.stroke();
        
        // === 手臂 ===
        ctx.fillStyle = skinColor;
        // 左臂
        ctx.beginPath();
        ctx.ellipse(-7 * scale, -2 * scale, 3 * scale, 4 * scale, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // 右臂
        ctx.beginPath();
        ctx.ellipse(7 * scale, -2 * scale, 3 * scale, 4 * scale, -0.3, 0, Math.PI * 2);
        ctx.fill();
        
        // === 头部 ===
        var headGradient = ctx.createRadialGradient(-2, -12 * scale, 0, 0, -10 * scale, headRadius);
        headGradient.addColorStop(0, lightenColor(skinColor, 20));
        headGradient.addColorStop(1, skinColor);
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.arc(0, -10 * scale, headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 头发
        ctx.fillStyle = '#4a3728';
        ctx.beginPath();
        ctx.arc(0, -12 * scale, headRadius, Math.PI, 2 * Math.PI);
        ctx.fill();
        
        // === 眼睛 ===
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(-3 * scale, -11 * scale, 2.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(3 * scale, -11 * scale, 2.5 * scale, 3 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼珠
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-2 * scale, -10 * scale, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4 * scale, -10 * scale, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // 眼睛高光
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2.5 * scale, -11 * scale, 0.8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3.5 * scale, -11 * scale, 0.8 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        // === 嘴巴（微笑） ===
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -7 * scale, 3 * scale, 0.2, Math.PI - 0.2);
        ctx.stroke();
        
        ctx.restore();
    }

    // ===== 绘制球 =====
    function drawBall() {
        // 球阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(ball.x + 2, ball.y + 2, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        
        // 球体
        var gradient = ctx.createRadialGradient(
            ball.x - 3, ball.y - 3, 0,
            ball.x, ball.y, BALL_RADIUS
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.8, '#f0f0f0');
        gradient.addColorStop(1, '#d0d0d0');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        
        // 足球纹理
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS * 0.6, 0, Math.PI * 2);
        ctx.stroke();
    }

    // ===== 颜色工具函数 =====
    function lightenColor(color, percent) {
        var num = parseInt(color.replace('#', ''), 16);
        var amt = Math.round(2.55 * percent);
        var R = Math.min(255, (num >> 16) + amt);
        var G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        var B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // ===== 音效 =====
    function playSound(type) {
        if (!soundEnabled) return;
        try {
            var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            var osc = audioCtx.createOscillator();
            var gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = { bounce: 180, hit: 250, goal: 400 }[type] || 200;
            gain.gain.value = 0.08;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        } catch (e) {}
    }

    init();
})();