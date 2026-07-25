/**
 * 下班跑酷 - 第一人称跑酷闯关游戏
 * 面向下班路上需要休息的打工人
 */
(function() {
    'use strict';

    // ===== 游戏配置 =====
    var LEVELS = [
        { name: '下班起步', target: 100, speed: 1.5, obstacles: ['cone', 'box'], background: 'grassland' },
        { name: '小试牛刀', target: 150, speed: 2, obstacles: ['cone', 'box', 'barrel'], background: 'grassland' },
        { name: '车水马龙', target: 200, speed: 2.5, obstacles: ['cone', 'barrel', 'car'], background: 'grassland' },
        { name: '高峰时刻', target: 250, speed: 3, obstacles: ['box', 'barrel', 'car'], background: 'city' },
        { name: '急速冲刺', target: 300, speed: 3.5, obstacles: ['cone', 'box', 'barrel', 'car'], background: 'city' },
        { name: '险象环生', target: 350, speed: 4, obstacles: ['barrel', 'car', 'truck'], background: 'city' },
        { name: '勇往直前', target: 400, speed: 4.5, obstacles: ['box', 'car', 'truck'], background: 'desert' },
        { name: '极速狂飙', target: 450, speed: 5, obstacles: ['cone', 'barrel', 'car', 'truck'], background: 'desert' },
        { name: '极限挑战', target: 500, speed: 5.5, obstacles: ['car', 'truck', 'bus'], background: 'desert' },
        { name: '自由终点', target: 600, speed: 6.5, obstacles: ['cone', 'box', 'barrel', 'car', 'truck', 'bus'], background: 'city' }
    ];

    var LANES = 4; // 四条跑道

    // 路障类型配置
    var OBSTACLE_TYPES = {
        cone: { width: 30, height: 40, name: '路障锥' },
        box: { width: 40, height: 35, name: '快递箱' },
        barrel: { width: 32, height: 42, name: '水桶' },
        car: { width: 55, height: 45, name: '共享单车' },
        truck: { width: 65, height: 50, name: '快递车' },
        bus: { width: 80, height: 55, name: '公交车' }
    };

    // ===== 游戏状态 =====
    var canvas, ctx;
    var gameState = 'menu';
    var currentLevel = 1;
    var distance = 0;
    var coins = 0;
    var totalCoins = 0;
    var highScores = {};
    var unlockedLevels = 1;

    // ===== 玩家 =====
    var player = {
        lane: 1,
        targetLane: 1,
        x: 0,
        y: 0,
        jumping: false,
        jumpHeight: 0,
        maxJumpHeight: 70,
        jumpSpeed: 10
    };

    // ===== 物体 =====
    var obstacles = [];
    var coinItems = [];
    var roadOffset = 0; // 道路滚动偏移

    // ===== DOM =====
    var elements = {};

    // ===== 初始化 =====
    function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');

        elements = {
            coinCount: document.getElementById('coinCount'),
            levelNum: document.getElementById('levelNum'),
            distance: document.getElementById('distance'),
            targetDistance: document.getElementById('targetDistance'),
            passedBuildingsEl: document.getElementById('passedBuildings'),
            gameOverlay: document.getElementById('gameOverlay'),
            resultOverlay: document.getElementById('resultOverlay'),
            startBtn: document.getElementById('startBtn'),
            retryBtn: document.getElementById('retryBtn'),
            nextBtn: document.getElementById('nextBtn'),
            levelGrid: document.getElementById('levelGrid'),
            mobileControls: document.getElementById('mobileControls'),
            controlLeft: document.getElementById('controlLeft'),
            controlRight: document.getElementById('controlRight'),
            controlJump: document.getElementById('controlJump'),
            finalDistance: document.getElementById('finalDistance'),
            finalCoins: document.getElementById('finalCoins'),
            bestDistance: document.getElementById('bestDistance'),
            resultIcon: document.getElementById('resultIcon'),
            resultTitle: document.getElementById('resultTitle')
        };

        loadProgress();
        setupCanvas();
        generateLevelButtons();

        // 初始化默认主题
        updatePageTheme('grassland');

        bindEvents();
        render();
    }

    // ===== 加载进度 =====
    function loadProgress() {
        try {
            var saved = localStorage.getItem('runnerProgress');
            if (saved) {
                var data = JSON.parse(saved);
                unlockedLevels = data.unlockedLevels || 1;
                totalCoins = data.totalCoins || 0;
                highScores = data.highScores || {};
            }
        } catch (e) {}
    }

    // ===== 保存进度 =====
    function saveProgress() {
        try {
            localStorage.setItem('runnerProgress', JSON.stringify({
                unlockedLevels: unlockedLevels,
                totalCoins: totalCoins,
                highScores: highScores
            }));
        } catch (e) {}
    }

    // ===== 设置画布 =====
    function setupCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        player.x = canvas.width / 2;
        player.y = canvas.height - 100;
    }

    // ===== 生成关卡按钮 =====
    function generateLevelButtons() {
        elements.levelGrid.innerHTML = '';
        LEVELS.forEach(function(level, index) {
            var btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.dataset.level = index + 1;
            if (index + 1 <= unlockedLevels) {
                btn.classList.add('unlocked');
                if (index + 1 === currentLevel) {
                    btn.classList.add('current');
                }
                btn.innerHTML = (index + 1) + '<br><span class="level-stars">' + getStars(index + 1) + '</span>';
            } else {
                btn.classList.add('locked');
                btn.innerHTML = '🔒';
            }
            elements.levelGrid.appendChild(btn);
        });
    }

    // ===== 获取星级 =====
    function getStars(level) {
        var score = highScores[level] || 0;
        var target = LEVELS[level - 1].target;
        if (score >= target * 1.5) return '⭐⭐⭐';
        if (score >= target) return '⭐⭐';
        if (score > 0) return '⭐';
        return '☆☆☆';
    }

    // ===== 绑定事件 =====
    function bindEvents() {
        elements.startBtn.addEventListener('click', startGame);
        elements.retryBtn.addEventListener('click', function() {
            elements.resultOverlay.style.display = 'none';
            startGame();
        });
        elements.nextBtn.addEventListener('click', function() {
            currentLevel = Math.min(currentLevel + 1, LEVELS.length);
            generateLevelButtons();
            elements.resultOverlay.style.display = 'none';
            startGame();
        });
        elements.levelGrid.addEventListener('click', function(e) {
            var btn = e.target.classList.contains('level-btn') ? e.target : e.target.parentElement;
            if (btn && btn.classList.contains('level-btn')) {
                var level = parseInt(btn.dataset.level);
                if (level <= unlockedLevels) {
                    currentLevel = level;
                    generateLevelButtons();
                }
            }
        });

        // 键盘控制
        document.addEventListener('keydown', function(e) {
            if (gameState !== 'playing') return;
            switch (e.key.toLowerCase()) {
                case 'a': case 'arrowleft': moveLeft(); break;
                case 'd': case 'arrowright': moveRight(); break;
                case ' ': case 'w': case 'arrowup': jump(); break;
            }
        });

        // 移动端控制
        elements.controlLeft.addEventListener('touchstart', function(e) { e.preventDefault(); moveLeft(); });
        elements.controlRight.addEventListener('touchstart', function(e) { e.preventDefault(); moveRight(); });
        elements.controlJump.addEventListener('touchstart', function(e) { e.preventDefault(); jump(); });

        // 触摸滑动
        var touchStartX = 0;
        canvas.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; });
        canvas.addEventListener('touchend', function(e) {
            if (gameState !== 'playing') return;
            var diff = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(diff) > 30) {
                if (diff > 0) moveRight();
                else moveLeft();
            } else {
                jump();
            }
        });

        window.addEventListener('resize', function() { setupCanvas(); render(); });
    }

    function moveLeft() { if (player.targetLane > 0) player.targetLane--; }
    function moveRight() { if (player.targetLane < LANES - 1) player.targetLane++; }
    function jump() { if (!player.jumping) { player.jumping = true; player.jumpHeight = 0; } }

    // ===== 开始游戏 =====
    function startGame() {
        var level = LEVELS[currentLevel - 1];
        distance = 0;
        coins = 0;
        obstacles = [];
        coinItems = [];
        roadOffset = 0;

        // 根据关卡背景更新页面主题
        updatePageTheme(level.background);

        elements.levelNum.textContent = currentLevel;
        elements.targetDistance.textContent = level.target;
        elements.coinCount.textContent = '💰 ' + totalCoins;
        elements.gameOverlay.style.display = 'none';

        if (window.innerWidth <= 768) {
            elements.mobileControls.style.display = 'flex';
        }

        gameState = 'playing';
        player.lane = 1;
        player.targetLane = 1;
        requestAnimationFrame(gameLoop);
    }

    // ===== 更新页面主题 =====
    function updatePageTheme(bgType) {
        var runnerPage = document.querySelector('.runner-page');
        if (!runnerPage) return;

        // 移除所有主题类
        runnerPage.classList.remove('grassland-theme', 'city-theme', 'desert-theme');

        // 添加对应主题类
        switch (bgType) {
            case 'grassland':
                runnerPage.classList.add('grassland-theme');
                break;
            case 'city':
                runnerPage.classList.add('city-theme');
                break;
            case 'desert':
                runnerPage.classList.add('desert-theme');
                break;
            default:
                runnerPage.classList.add('grassland-theme');
        }
    }

    // ===== 游戏循环 =====
    var lastTime = 0;
    function gameLoop(timestamp) {
        if (gameState !== 'playing') return;
        if (!timestamp) timestamp = performance.now();
        var deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
        lastTime = timestamp;

        update(deltaTime);
        render();
        requestAnimationFrame(gameLoop);
    }

    // ===== 更新游戏 =====
    function update(dt) {
        var level = LEVELS[currentLevel - 1];
        var speed = level.speed;

        distance += speed * dt;
        elements.distance.textContent = Math.floor(distance);

        if (distance >= level.target) { winLevel(); return; }

        // 更新玩家位置
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / LANES;
        var targetX = roadLeft + laneWidth * (player.targetLane + 0.5);
        player.x += (targetX - player.x) * 0.15;
        player.lane = player.targetLane;

        // 跳跃
        if (player.jumping) {
            player.jumpHeight += player.jumpSpeed;
            if (player.jumpHeight >= player.maxJumpHeight) {
                player.jumpSpeed = -player.jumpSpeed;
            }
            if (player.jumpHeight <= 0) {
                player.jumpHeight = 0;
                player.jumping = false;
                player.jumpSpeed = 10;
            }
        }

        // 道路滚动
        roadOffset += speed * 50 * dt;

        // 生成障碍物（确保路障之间有足够距离）
        var minObstacleDistance = 120; // 最小路障距离（人物高度约50px）
        var canSpawnObstacle = true;

        // 检查最后一个障碍物是否距离足够
        if (obstacles.length > 0) {
            var lastObstacle = obstacles[obstacles.length - 1];
            if (lastObstacle.z < minObstacleDistance) {
                canSpawnObstacle = false;
            }
        }

        // 生成障碍物（从屏幕顶部生成）
        if (canSpawnObstacle && Math.random() < 0.012 + currentLevel * 0.001) {
            var lane = Math.floor(Math.random() * LANES);
            var typeIndex = Math.floor(Math.random() * level.obstacles.length);
            var type = level.obstacles[typeIndex];
            obstacles.push({ lane: lane, z: -50, type: type });
        }

        // 生成金币
        if (Math.random() < 0.01) {
            coinItems.push({ lane: Math.floor(Math.random() * LANES), z: -50, collected: false });
        }

        // 更新障碍物位置（向下移动）
        var moveSpeed = speed * 60 * dt;
        obstacles.forEach(function(obs) { obs.z += moveSpeed; });
        obstacles = obstacles.filter(function(obs) { return obs.z < canvas.height + 100; });
        coinItems.forEach(function(coin) { coin.z += moveSpeed; });
        coinItems = coinItems.filter(function(coin) { return coin.z < canvas.height + 100 && !coin.collected; });

        checkCollisions();
    }

    // ===== 碰撞检测 =====
    function checkCollisions() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / LANES;
        
        obstacles.forEach(function(obs) {
            if (obs.lane === player.lane && obs.z > player.y - 60 && obs.z < player.y + 20) {
                if (player.jumpHeight < 25) {
                    gameOver();
                }
            }
        });
        coinItems.forEach(function(coin) {
            if (!coin.collected && coin.lane === player.lane && coin.z > player.y - 60 && coin.z < player.y + 20) {
                coin.collected = true;
                coins++;
                totalCoins++;
                elements.coinCount.textContent = '💰 ' + totalCoins;
                saveProgress();
            }
        });
    }

    // ===== 渲染 =====
    function render() {
        // 绘制场景背景（草原/城市/沙漠）
        drawSceneBackground();

        // 绘制平铺道路
        drawPerspectiveRoad();

        // 绘制障碍物和金币
        drawObjects();

        // 绘制玩家
        drawPlayer();

        // 绘制进度条
        drawProgressBar();
    }

    // ===== 绘制场景背景 =====
    function drawSceneBackground() {
        var level = LEVELS[currentLevel - 1];
        var bgType = level.background || 'grassland';

        // 根据背景类型绘制不同场景
        switch (bgType) {
            case 'grassland':
                drawGrasslandBackground();
                break;
            case 'city':
                drawCityBackground();
                break;
            case 'desert':
                drawDesertBackground();
                break;
            default:
                drawGrasslandBackground();
        }
    }

    // ===== 绘制草原背景 =====
    function drawGrasslandBackground() {
        // 天空渐变（蓝天白云）
        var skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGradient.addColorStop(0, '#87CEEB');
        skyGradient.addColorStop(0.4, '#B0E0E6');
        skyGradient.addColorStop(0.7, '#98D8C8');
        skyGradient.addColorStop(1, '#90EE90');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 远山（多层）
        drawMountainLayer(0.3, '#228B22', 0.4);
        drawMountainLayer(0.35, '#2E8B2E', 0.35);
        drawMountainLayer(0.4, '#32CD32', 0.3);

        // 草地
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

        // 草丛装饰
        drawGrassField();
    }

    // ===== 绘制山层 =====
    function drawMountainLayer(baseY, color, opacity) {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * baseY);
        
        var peaks = [
            {x: 0.1, y: 0.25},
            {x: 0.2, y: 0.35},
            {x: 0.35, y: 0.2},
            {x: 0.5, y: 0.3},
            {x: 0.65, y: 0.18},
            {x: 0.8, y: 0.28},
            {x: 0.9, y: 0.22},
            {x: 1.0, y: 0.32}
        ];

        for (var i = 0; i < peaks.length; i++) {
            ctx.lineTo(canvas.width * peaks[i].x, canvas.height * peaks[i].y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // ===== 绘制草地装饰 =====
    function drawGrassField() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var roadRight = roadLeft + roadWidth;

        // 左侧草丛
        for (var i = 0; i < 15; i++) {
            var x = Math.random() * (roadLeft - 100);
            var y = canvas.height * 0.55 + Math.random() * (canvas.height * 0.4);
            drawGrassClump(x, y, 8);
        }

        // 右侧草丛
        for (var i = 0; i < 15; i++) {
            var x = roadRight + 100 + Math.random() * (canvas.width - roadRight - 100);
            var y = canvas.height * 0.55 + Math.random() * (canvas.height * 0.4);
            drawGrassClump(x, y, 8);
        }
    }

    // ===== 绘制草丛 =====
    function drawGrassClump(x, y, count) {
        ctx.fillStyle = '#228B22';
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI / 2) + (Math.random() - 0.5) * 0.4;
            var height = 15 + Math.random() * 15;
            var xOffset = (i - count / 2) * 3;
            
            ctx.beginPath();
            ctx.moveTo(x + xOffset, y);
            ctx.quadraticCurveTo(
                x + xOffset + Math.cos(angle) * height * 0.3,
                y - height * 0.6,
                x + xOffset + Math.cos(angle) * height * 0.1,
                y - height
            );
            ctx.quadraticCurveTo(
                x + xOffset + Math.cos(angle) * height * 0.3,
                y - height * 0.6,
                x + xOffset,
                y
            );
            ctx.fill();
        }
    }

    // ===== 绘制城市背景 =====
    function drawCityBackground() {
        // 天空渐变（城市黄昏）
        var skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGradient.addColorStop(0, '#FF7F50');
        skyGradient.addColorStop(0.3, '#FF9966');
        skyGradient.addColorStop(0.6, '#CD853F');
        skyGradient.addColorStop(1, '#8B4513');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 建筑群
        drawCityBuildings();
    }

    // ===== 绘制城市建筑 =====
    function drawCityBuildings() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var roadRight = roadLeft + roadWidth;

        // 远景建筑（灰色调）
        drawBuildingLayer(roadLeft - 40, 0, 80, 150, '#696969', 0.6);
        drawBuildingLayer(roadRight + 40, 0, 80, 150, '#696969', 0.6);

        // 中景建筑
        drawBuildingLayer(0, 100, 120, 200, '#808080', 0.8);
        drawBuildingLayer(roadRight + 40, 100, 120, 200, '#808080', 0.8);

        // 近景建筑
        drawBuildingLayer(0, 200, 150, 280, '#A9A9A9', 1);
        drawBuildingLayer(roadRight + 40, 200, 150, 280, '#A9A9A9', 1);

        // 添加窗户
        drawBuildingWindows();
    }

    // ===== 绘制建筑层 =====
    function drawBuildingLayer(startX, width, minWidth, maxWidth, color, opacity) {
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        
        var buildingCount = Math.floor((canvas.width - startX) / 80);
        for (var i = 0; i < buildingCount; i++) {
            var x = startX + i * 80;
            var height = minWidth + Math.random() * (maxWidth - minWidth);
            var buildingWidth = 60 + Math.random() * 30;
            
            ctx.fillRect(x, canvas.height - height, buildingWidth, height);
        }
        
        ctx.globalAlpha = 1;
    }

    // ===== 绘制建筑窗户 =====
    function drawBuildingWindows() {
        ctx.fillStyle = 'rgba(255, 228, 181, 0.8)';
        
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var roadRight = roadLeft + roadWidth;

        // 左侧建筑窗户
        for (var i = 0; i < 20; i++) {
            var x = Math.random() * (roadLeft - 100);
            var y = canvas.height * 0.3 + Math.random() * (canvas.height * 0.5);
            ctx.fillRect(x, y, 12, 15);
        }

        // 右侧建筑窗户
        for (var i = 0; i < 20; i++) {
            var x = roadRight + 100 + Math.random() * (canvas.width - roadRight - 100);
            var y = canvas.height * 0.3 + Math.random() * (canvas.height * 0.5);
            ctx.fillRect(x, y, 12, 15);
        }
    }

    // ===== 绘制沙漠背景 =====
    function drawDesertBackground() {
        // 天空渐变（沙漠炎热）
        var skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGradient.addColorStop(0, '#FFEFD5');
        skyGradient.addColorStop(0.3, '#FFE4B5');
        skyGradient.addColorStop(0.7, '#DEB887');
        skyGradient.addColorStop(1, '#D2691E');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 太阳
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(canvas.width * 0.8, canvas.height * 0.15, 50, 0, Math.PI * 2);
        ctx.fill();

        // 太阳光晕
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(canvas.width * 0.8, canvas.height * 0.15, 70, 0, Math.PI * 2);
        ctx.fill();

        // 沙丘
        drawSandDunes();
    }

    // ===== 绘制沙丘 =====
    function drawSandDunes() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var roadRight = roadLeft + roadWidth;

        // 远景沙丘
        ctx.fillStyle = '#DEB887';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        ctx.quadraticCurveTo(roadLeft * 0.3, canvas.height * 0.4, roadLeft - 40, canvas.height * 0.6);
        ctx.lineTo(roadLeft - 40, canvas.height);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(canvas.width, canvas.height);
        ctx.quadraticCurveTo(roadRight + (canvas.width - roadRight) * 0.7, canvas.height * 0.4, roadRight + 40, canvas.height * 0.6);
        ctx.lineTo(roadRight + 40, canvas.height);
        ctx.closePath();
        ctx.fill();

        // 近景沙丘
        ctx.fillStyle = '#D2B48C';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        ctx.quadraticCurveTo(roadLeft * 0.5, canvas.height * 0.65, roadLeft - 40, canvas.height * 0.75);
        ctx.lineTo(roadLeft - 40, canvas.height);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(canvas.width, canvas.height);
        ctx.quadraticCurveTo(roadRight + (canvas.width - roadRight) * 0.5, canvas.height * 0.65, roadRight + 40, canvas.height * 0.75);
        ctx.lineTo(roadRight + 40, canvas.height);
        ctx.closePath();
        ctx.fill();

        // 沙漠细节（骆驼骨头）
        ctx.strokeStyle = '#F5DEB3';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(40, canvas.height - 30);
        ctx.lineTo(70, canvas.height - 50);
        ctx.lineTo(100, canvas.height - 30);
        ctx.stroke();

        // 棕榈树装饰
        drawPalmTree(roadLeft - 80, canvas.height - 100, 40);
        drawPalmTree(roadRight + 100, canvas.height - 120, 50);
    }

    // ===== 绘制棕榈树 =====
    function drawPalmTree(x, y, height) {
        // 树干
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 5, y, 10, height);

        // 树叶
        ctx.fillStyle = '#228B22';
        for (var i = 0; i < 6; i++) {
            var angle = (i / 6) * Math.PI * 2;
            var leafLength = 30 + Math.random() * 20;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(
                x + Math.cos(angle) * leafLength * 0.7,
                y - 10,
                x + Math.cos(angle) * leafLength,
                y - 20
            );
            ctx.quadraticCurveTo(
                x + Math.cos(angle) * leafLength * 0.7,
                y - 10,
                x,
                y
            );
            ctx.fill();
        }
    }

    // ===== 绘制平铺道路（完全垂直，无透视）=====
    function drawPerspectiveRoad() {
        var roadWidth = canvas.width * 0.4; // 道路宽度占屏幕40%
        var roadLeft = (canvas.width - roadWidth) / 2;
        var roadRight = roadLeft + roadWidth;
        var laneWidth = roadWidth / LANES;

        // 道路主体（完全垂直平铺，无任何透视效果）
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

        // 人行道（两侧，覆盖建筑边缘）
        ctx.fillStyle = '#707070';
        ctx.fillRect(roadLeft - 40, 0, 40, canvas.height); // 左侧人行道
        ctx.fillRect(roadRight, 0, 40, canvas.height); // 右侧人行道

        // 虚化边缘效果（左侧）
        var leftBlurWidth = 60;
        var leftBlurGradient = ctx.createLinearGradient(roadLeft - 40 - leftBlurWidth, 0, roadLeft - 40, 0);
        leftBlurGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        leftBlurGradient.addColorStop(0.3, 'rgba(58, 58, 58, 0.3)');
        leftBlurGradient.addColorStop(0.6, 'rgba(58, 58, 58, 0.6)');
        leftBlurGradient.addColorStop(1, 'rgba(58, 58, 58, 1)');
        ctx.fillStyle = leftBlurGradient;
        ctx.fillRect(roadLeft - 40 - leftBlurWidth, 0, leftBlurWidth, canvas.height);

        // 虚化边缘效果（右侧）
        var rightBlurWidth = 60;
        var rightBlurGradient = ctx.createLinearGradient(roadRight + 40, 0, roadRight + 40 + rightBlurWidth, 0);
        rightBlurGradient.addColorStop(0, 'rgba(58, 58, 58, 1)');
        rightBlurGradient.addColorStop(0.4, 'rgba(58, 58, 58, 0.6)');
        rightBlurGradient.addColorStop(0.7, 'rgba(58, 58, 58, 0.3)');
        rightBlurGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rightBlurGradient;
        ctx.fillRect(roadRight + 40, 0, rightBlurWidth, canvas.height);

        // 跑道分隔线（白色虚线，向下滚动）
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([25, 20]);

        var lineOffset = roadOffset % 45;

        for (var i = 1; i < LANES; i++) {
            var x = roadLeft + i * laneWidth;
            ctx.beginPath();
            ctx.moveTo(x, lineOffset);
            ctx.lineTo(x, canvas.height + 45);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // 道路边缘线（黄色实线）
        ctx.strokeStyle = '#ffc107';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(roadLeft, 0);
        ctx.lineTo(roadLeft, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(roadRight, 0);
        ctx.lineTo(roadRight, canvas.height);
        ctx.stroke();
    }

    // ===== 绘制物体 =====
    function drawObjects() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / LANES;

        var allObjects = obstacles.concat(coinItems.map(function(c) {
            return { type: 'coin', lane: c.lane, z: c.z, collected: c.collected };
        }));

        allObjects.sort(function(a, b) { return b.z - a.z; });

        allObjects.forEach(function(obj) {
            // z值直接作为y坐标（从屏幕顶部向下移动）
            var y = obj.z;
            var x = roadLeft + laneWidth * (obj.lane + 0.5);

            if (obj.type === 'coin') {
                // 金币绘制（更立体的效果）
                var coinRadius = 14;
                var pulse = Math.sin(Date.now() / 200) * 2;

                // 金币外发光
                ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
                ctx.shadowBlur = 10 + pulse;

                // 金币主体
                ctx.beginPath();
                ctx.arc(x, y, coinRadius + pulse, 0, Math.PI * 2);
                var coinGradient = ctx.createRadialGradient(x - 4, y - 4, 0, x, y, coinRadius);
                coinGradient.addColorStop(0, '#fff8dc');
                coinGradient.addColorStop(0.3, '#ffd700');
                coinGradient.addColorStop(1, '#ffaa00');
                ctx.fillStyle = coinGradient;
                ctx.fill();

                // 金币边缘
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#cc8800';
                ctx.lineWidth = 2;
                ctx.stroke();

                // 金币符号
                ctx.fillStyle = '#b8860b';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', x, y);
            } else {
                var obsType = OBSTACLE_TYPES[obj.type];
                var w = obsType.width;
                var h = obsType.height;

                // 根据类型绘制不同的路障
                switch (obj.type) {
                    case 'cone':
                        drawCone(ctx, x, y, w, h);
                        break;
                    case 'box':
                        drawBox(ctx, x, y, w, h);
                        break;
                    case 'barrel':
                        drawBarrel(ctx, x, y, w, h);
                        break;
                    case 'car':
                        drawBike(ctx, x, y, w, h);
                        break;
                    case 'truck':
                        drawTruck(ctx, x, y, w, h);
                        break;
                    case 'bus':
                        drawBus(ctx, x, y, w, h);
                        break;
                }
            }
        });
    }

    // ===== 绘制路障锥 =====
    function drawCone(ctx, x, y, w, h) {
        // 阴影
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        // 三角锥体
        ctx.beginPath();
        ctx.moveTo(x, y - h);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x - w / 2, y);
        ctx.closePath();

        // 橙色渐变
        var gradient = ctx.createLinearGradient(x - w / 2, y - h, x + w / 2, y);
        gradient.addColorStop(0, '#ff8c00');
        gradient.addColorStop(0.5, '#ff6b00');
        gradient.addColorStop(1, '#ff4500');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 白色反光条
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - w / 4, y - h * 0.6);
        ctx.lineTo(x + w / 4, y - h * 0.3);
        ctx.stroke();

        // 边框
        ctx.strokeStyle = '#cc5500';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - h);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x - w / 2, y);
        ctx.closePath();
        ctx.stroke();
    }

    // ===== 绘制快递箱 =====
    function drawBox(ctx, x, y, w, h) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        // 箱体主体（棕色）
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x - w / 2, y - h, w, h);

        // 纸箱纹理
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(x - w / 2, y - h * 0.8, w, h * 0.3);

        // 封箱胶带（黄色）
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x - w / 2, y - h * 0.55, w, 6);

        // 侧面阴影
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x - w / 2, y - h, w * 0.15, h);

        // 边框
        ctx.strokeStyle = '#5d3a1a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - w / 2, y - h, w, h);
    }

    // ===== 绘制水桶 =====
    function drawBarrel(ctx, x, y, w, h) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        // 椭圆形桶身（蓝色）
        ctx.beginPath();
        ctx.ellipse(x, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        var gradient = ctx.createRadialGradient(x - w / 4, y - h / 2, 0, x, y - h / 2, w / 2);
        gradient.addColorStop(0, '#4db8ff');
        gradient.addColorStop(0.7, '#1e90ff');
        gradient.addColorStop(1, '#0066cc');
        ctx.fillStyle = gradient;
        ctx.fill();

        // 桶口（深色）
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(x, y - h / 2, w / 2, h / 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#004c99';
        ctx.fill();

        // 手柄
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y - h / 2, w / 2 + 4, Math.PI * 1.2, Math.PI * 1.8);
        ctx.stroke();
    }

    // ===== 绘制共享单车 =====
    function drawBike(ctx, x, y, w, h) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;

        // 车身框架（红色）
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;

        // 主框架
        ctx.beginPath();
        // 下横杆
        ctx.moveTo(x - w / 3, y - h * 0.3);
        ctx.lineTo(x + w / 4, y - h * 0.3);
        // 斜杆
        ctx.moveTo(x - w / 4, y - h * 0.3);
        ctx.lineTo(x, y - h * 0.7);
        // 座位杆
        ctx.lineTo(x, y - h * 0.9);
        ctx.stroke();

        // 前轮
        ctx.beginPath();
        ctx.arc(x + w / 3, y - h * 0.3, h * 0.25, 0, Math.PI * 2);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 后轮
        ctx.beginPath();
        ctx.arc(x - w / 3, y - h * 0.3, h * 0.25, 0, Math.PI * 2);
        ctx.stroke();

        // 座位（红色）
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(x - w / 8, y - h, w / 4, h * 0.08);

        // 把手
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w / 5, y - h * 0.7);
        ctx.lineTo(x + w / 3, y - h * 0.85);
        ctx.stroke();

        // 前轮辐条
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        for (var i = 0; i < 6; i++) {
            var angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(x + w / 3, y - h * 0.3);
            ctx.lineTo(
                x + w / 3 + Math.cos(angle) * h * 0.25,
                y - h * 0.3 + Math.sin(angle) * h * 0.25
            );
            ctx.stroke();
        }
    }

    // ===== 绘制快递车 =====
    function drawTruck(ctx, x, y, w, h) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        // 车厢（蓝色）
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - w / 2, y - h * 0.9, w * 0.7, h * 0.65);

        // 车头（浅蓝色）
        ctx.fillStyle = '#5dade2';
        ctx.fillRect(x + w * 0.2, y - h * 0.75, w * 0.3, h * 0.5);

        // 车窗
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#85c1e9';
        ctx.fillRect(x + w * 0.25, y - h * 0.7, w * 0.2, h * 0.25);

        // 前轮
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(x + w * 0.35, y - h * 0.15, h * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // 后轮
        ctx.beginPath();
        ctx.arc(x - w * 0.25, y - h * 0.15, h * 0.18, 0, Math.PI * 2);
        ctx.fill();

        // 轮毂
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(x + w * 0.35, y - h * 0.15, h * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - w * 0.25, y - h * 0.15, h * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // 车门线
        ctx.strokeStyle = '#2980b9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, y - h * 0.75);
        ctx.lineTo(x + w * 0.2, y - h * 0.25);
        ctx.stroke();

        // 车顶装饰
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(x - w * 0.4, y - h, w * 0.15, h * 0.1);
    }

    // ===== 绘制公交车 =====
    function drawBus(ctx, x, y, w, h) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        // 车身（橙色）
        ctx.fillStyle = '#f39c12';
        var radius = 6;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h * 0.85, w, h * 0.7, radius);
        ctx.fill();

        // 车窗（多个窗户）
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#85c1e9';
        var windowWidth = w * 0.12;
        var windowSpacing = w * 0.05;
        for (var i = 0; i < 5; i++) {
            ctx.fillRect(
                x - w / 2 + w * 0.08 + i * (windowWidth + windowSpacing),
                y - h * 0.75,
                windowWidth,
                h * 0.25
            );
        }

        // 前窗
        ctx.fillRect(x + w * 0.3, y - h * 0.75, w * 0.15, h * 0.25);

        // 车灯
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(x + w * 0.42, y - h * 0.25, h * 0.06, 0, Math.PI * 2);
        ctx.fill();

        // 前轮
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(x + w * 0.32, y - h * 0.1, h * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // 后轮
        ctx.beginPath();
        ctx.arc(x - w * 0.28, y - h * 0.1, h * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // 轮毂
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath();
        ctx.arc(x + w * 0.32, y - h * 0.1, h * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - w * 0.28, y - h * 0.1, h * 0.07, 0, Math.PI * 2);
        ctx.fill();

        // 车顶装饰线
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(x - w / 2, y - h * 0.88, w, h * 0.05);

        // 路线牌
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - w * 0.08, y - h, w * 0.16, h * 0.12);
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('88', x, y - h * 0.92);
    }

    // ===== 绘制玩家 =====
    function drawPlayer() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / LANES;
        
        var x = roadLeft + laneWidth * (player.lane + 0.5);
        var y = player.y - player.jumpHeight;

        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, player.y + 5, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 腿
        var legOffset = Math.sin(Date.now() / 80) * 8;
        ctx.fillStyle = '#34495e';
        ctx.fillRect(x - 10, y, 8, 12 + (player.jumping ? -8 : legOffset));
        ctx.fillRect(x + 2, y, 8, 12 + (player.jumping ? -8 : -legOffset));

        // 身体
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(x - 12, y - 30, 24, 30);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(x - 10, y - 28, 20, 15);

        // 领带
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(x, y - 28);
        ctx.lineTo(x - 3, y - 15);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 3, y - 15);
        ctx.closePath();
        ctx.fill();

        // 头
        ctx.fillStyle = '#ffcc99';
        ctx.beginPath();
        ctx.arc(x, y - 40, 12, 0, Math.PI * 2);
        ctx.fill();

        // 头发
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.arc(x, y - 44, 12, Math.PI, 2 * Math.PI);
        ctx.fill();

        // 公文包
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 15, y - 20, 12, 15);
    }

    // ===== 绘制进度条 =====
    function drawProgressBar() {
        var level = LEVELS[currentLevel - 1];
        var progress = Math.min(distance / level.target, 1);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, 6);
        var gradient = ctx.createLinearGradient(0, 0, canvas.width * progress, 0);
        gradient.addColorStop(0, '#2ecc71');
        gradient.addColorStop(1, '#27ae60');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width * progress, 6);
    }

    // ===== 过关 =====
    function winLevel() {
        gameState = 'ended';
        if (currentLevel >= unlockedLevels && currentLevel < LEVELS.length) {
            unlockedLevels = currentLevel + 1;
        }
        if (!highScores[currentLevel] || distance > highScores[currentLevel]) {
            highScores[currentLevel] = distance;
        }
        saveProgress();

        // 显示成功动画
        showSuccessAnimation();

        elements.resultIcon.textContent = '🎉';
        elements.resultTitle.textContent = '恭喜过关！';
        elements.finalDistance.textContent = Math.floor(distance);
        elements.finalCoins.textContent = coins;
        elements.bestDistance.textContent = Math.floor(highScores[currentLevel] || distance);
        elements.nextBtn.style.display = currentLevel < LEVELS.length ? 'inline-block' : 'none';
        elements.resultOverlay.style.display = 'flex';
        elements.mobileControls.style.display = 'none';
    }

    // ===== 显示成功动画 =====
    function showSuccessAnimation() {
        var resultOverlay = document.getElementById('resultOverlay');

        // 创建烟花爆炸效果
        for (var i = 0; i < 8; i++) {
            createFirework(resultOverlay);
        }

        // 创建星星飘落效果
        for (var i = 0; i < 15; i++) {
            createStarParticle(resultOverlay);
        }

        // 创建彩带效果
        for (var i = 0; i < 20; i++) {
            createConfetti(resultOverlay);
        }

        // 统计项动画
        var statItems = document.querySelectorAll('.stat-item');
        statItems.forEach(function(item, index) {
            item.style.animationDelay = (index * 0.1) + 's';
            item.classList.add('success-animation');
        });

        // 结果图标脉冲动画
        elements.resultIcon.classList.add('success-animation');
        setTimeout(function() {
            elements.resultIcon.classList.remove('success-animation');
            statItems.forEach(function(item) {
                item.classList.remove('success-animation');
            });
        }, 1000);
    }

    // ===== 创建烟花效果 =====
    function createFirework(container) {
        var firework = document.createElement('div');
        firework.className = 'firework';
        firework.style.left = Math.random() * 100 + '%';
        firework.style.top = Math.random() * 50 + '%';
        firework.style.background = getRandomColor();
        firework.style.animationDelay = Math.random() * 0.5 + 's';
        container.appendChild(firework);

        setTimeout(function() {
            if (firework.parentNode) {
                firework.parentNode.removeChild(firework);
            }
        }, 1500);
    }

    // ===== 创建星星粒子 =====
    function createStarParticle(container) {
        var star = document.createElement('div');
        star.className = 'star-particle';
        star.textContent = ['⭐', '🌟', '✨', '💫'][Math.floor(Math.random() * 4)];
        star.style.left = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 1 + 's';
        container.appendChild(star);

        setTimeout(function() {
            if (star.parentNode) {
                star.parentNode.removeChild(star);
            }
        }, 3000);
    }

    // ===== 创建彩带效果 =====
    function createConfetti(container) {
        var confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = getRandomColor();
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
        container.appendChild(confetti);

        setTimeout(function() {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 3500);
    }

    // ===== 获取随机颜色 =====
    function getRandomColor() {
        var colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // ===== 游戏结束 =====
    function gameOver() {
        gameState = 'ended';
        elements.resultIcon.textContent = '🏃';
        elements.resultTitle.textContent = '报告老板，我要下班！';
        elements.finalDistance.textContent = Math.floor(distance);
        elements.finalCoins.textContent = coins;
        elements.bestDistance.textContent = Math.floor(highScores[currentLevel] || 0);
        elements.nextBtn.style.display = 'none';
        elements.resultOverlay.style.display = 'flex';
        elements.mobileControls.style.display = 'none';
    }

    document.addEventListener('DOMContentLoaded', init);
})();