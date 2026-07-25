/**
 * 城市跑酷 - 闯关版
 * 面向 20-40 岁上班人群，下班路上打发时间
 * 4个关卡，每关不同速度和距离目标
 * 通关乘公交转场，全部通关后下车回家
 */
(function() {
    'use strict';

    // ===== 关卡数据（第1关为基准，按比例递增）=====
    var BASE_GOAL = 400; // 第1关基准目标距离
    var LEVELS = [
        { name: '公司出发',   subtitle: '下班了，冲出写字楼！',     speed: 1.5, goal: BASE_GOAL * 1.0, dayPhase: 0.5 },
        { name: '穿越商业街', subtitle: '经过热闹的商铺街',         speed: 2.5, goal: BASE_GOAL * 1.5, dayPhase: 1.3 },
        { name: '夜跑回家',   subtitle: '华灯初上，加速回家',       speed: 3.5, goal: BASE_GOAL * 2.0, dayPhase: 2.2 },
        { name: '最后一程',   subtitle: '马上到家了！',             speed: 4.5, goal: BASE_GOAL * 2.5, dayPhase: 2.8 }
    ];

    // ===== 游戏常量 =====
    var GRAVITY = 0.7;
    var JUMP_POWER = -19;
    var MAX_SPEED = 14;
    var SPEED_INCREMENT = 0.0002;
    var GROUND_RATIO = 0.78;
    var SLIDE_DURATION = 55;
    var COFFEE_DURATION = 200;

    // ===== 游戏状态 =====
    // menu | playing | paused | ended | busAnim | levelTransition | finalAnim | victory
    var canvas, ctx;
    var W = 0, H = 0, groundY = 0;
    var gameState = 'menu';
    var currentLevel = 0;
    var speed = 0;
    var distance = 0;         // 当前关卡距离
    var totalDistance = 0;    // 累计总距离
    var levelCoins = 0;       // 当前关卡金币
    var totalCoins = 0;       // 累计金币
    var score = 0;
    var bestScore = 0;
    var frameCount = 0;
    var coffeeTimer = 0;
    var slideTimer = 0;

    // ===== 玩家 =====
    var player = {
        x: 0, y: 0, vy: 0,
        width: 38, height: 56,
        sliding: false, onGround: true,
        runFrame: 0, alpha: 1
    };

    // ===== 物体池 =====
    var obstacles = [];
    var coinItems = [];
    var coffeeItems = [];
    var particles = [];
    var groundLines = [];

    // ===== 背景层 =====
    var bgStars = [];
    var bgFarBuildings = [];
    var bgNearBuildings = [];
    var bgClouds = [];

    // ===== 生成计时 =====
    var obstacleTimer = 0;
    var coinTimer = 0;
    var coffeeTimer_spawn = 0;
    var nextObstacleGap = 80;

    // ===== 公交/最终动画状态 =====
    var busAnim = null;
    var finalAnim = null;

    // ===== DOM =====
    var el = {};

    // ===== 初始化 =====
    function init() {
        canvas = document.getElementById('pkCanvas');
        ctx = canvas.getContext('2d');

        el = {
            coins: document.getElementById('pkCoins'),
            levelDisplay: document.getElementById('pkLevelDisplay'),
            distance: document.getElementById('pkDistance'),
            goal: document.getElementById('pkGoal'),
            score: document.getElementById('pkScore'),
            progressBar: document.getElementById('pkProgressBar'),
            progressBus: document.getElementById('pkProgressBus'),
            startOverlay: document.getElementById('pkStartOverlay'),
            endOverlay: document.getElementById('pkEndOverlay'),
            startBtn: document.getElementById('pkStartBtn'),
            retryBtn: document.getElementById('pkRetryBtn'),
            pauseBtn: document.getElementById('pkPauseBtn'),
            endIcon: document.getElementById('pkEndIcon'),
            endTitle: document.getElementById('pkEndTitle'),
            endDistance: document.getElementById('pkEndDistance'),
            endCoins: document.getElementById('pkEndCoins'),
            endScore: document.getElementById('pkEndScore'),
            mobileHint: document.getElementById('pkMobileHint'),
            transitionOverlay: document.getElementById('pkTransitionOverlay'),
            transitionIcon: document.getElementById('pkTransitionIcon'),
            transitionTitle: document.getElementById('pkTransitionTitle'),
            transitionSubtitle: document.getElementById('pkTransitionSubtitle'),
            transitionDistance: document.getElementById('pkTransitionDistance'),
            transitionCoins: document.getElementById('pkTransitionCoins'),
            nextBtn: document.getElementById('pkNextBtn'),
            victoryOverlay: document.getElementById('pkVictoryOverlay'),
            victoryDistance: document.getElementById('pkVictoryDistance'),
            victoryCoins: document.getElementById('pkVictoryCoins'),
            victoryScore: document.getElementById('pkVictoryScore'),
            replayAnimBtn: document.getElementById('pkReplayAnimBtn'),
            playAgainBtn: document.getElementById('pkPlayAgainBtn')
        };

        loadBest();
        resizeCanvas();
        initBackground();
        bindEvents();
        render();
    }

    function loadBest() {
        try {
            bestScore = parseInt(localStorage.getItem('parkourBest')) || 0;
        } catch (e) {}
    }

    function saveBest() {
        try { localStorage.setItem('parkourBest', String(bestScore)); } catch (e) {}
    }

    // ===== 画布尺寸 =====
    function resizeCanvas() {
        var container = document.getElementById('pkGameContainer');
        var dpr = window.devicePixelRatio || 1;
        W = container.clientWidth;
        H = container.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        groundY = H * GROUND_RATIO;
        player.x = W * 0.18;
        if (player.onGround) player.y = groundY - player.height;
    }

    // ===== 背景初始化 =====
    function initBackground() {
        bgStars = [];
        for (var i = 0; i < 60; i++) {
            bgStars.push({ x: Math.random()*W, y: Math.random()*groundY*0.6, size: Math.random()*1.5+0.5, twinkle: Math.random()*Math.PI*2 });
        }
        bgFarBuildings = [];
        var fx = 0;
        while (fx < W + 200) {
            var fw = 50 + Math.random()*40;
            bgFarBuildings.push({ x: fx, h: 60+Math.random()*80, w: fw, color: getFarBuildingColor() });
            fx += fw + 5;
        }
        bgNearBuildings = [];
        var nx = 0;
        while (nx < W + 300) {
            var nw = 70 + Math.random()*50;
            var nh = 100 + Math.random()*120;
            bgNearBuildings.push({ x: nx, h: nh, w: nw, color: getNearBuildingColor(), windows: genWindows(nw, nh) });
            nx += nw + 8;
        }
        bgClouds = [];
        for (var c = 0; c < 4; c++) {
            bgClouds.push({ x: Math.random()*W, y: 30+Math.random()*(groundY*0.35), w: 60+Math.random()*50, speed: 0.3+Math.random()*0.3 });
        }
        groundLines = [];
        for (var g = 0; g < 20; g++) groundLines.push({ x: g*60, w: 30 });
    }

    function getFarBuildingColor() {
        var c = ['#2a2a4a','#252545','#303058','#28284e'];
        return c[Math.floor(Math.random()*c.length)];
    }
    function getNearBuildingColor() {
        var c = ['#3a3a5c','#353556','#404068','#383860','#424270'];
        return c[Math.floor(Math.random()*c.length)];
    }
    function genWindows(w, h) {
        var wins = [];
        var cols = Math.floor(w/14), rows = Math.floor(h/18);
        for (var r = 0; r < rows; r++)
            for (var c = 0; c < cols; c++)
                if (Math.random() > 0.4) wins.push({ cx:c, cy:r, lit: Math.random()>0.5 });
        return wins;
    }

    // ===== 事件绑定 =====
    function bindEvents() {
        el.startBtn.addEventListener('click', function(){ startGame(); });
        el.retryBtn.addEventListener('click', function(){ startGame(); });
        el.nextBtn.addEventListener('click', function(){ nextLevel(); });
        el.playAgainBtn.addEventListener('click', function(){ startGame(); });
        el.replayAnimBtn.addEventListener('click', function(){ replayFinalAnimation(); });
        el.pauseBtn.addEventListener('click', togglePause);

        document.addEventListener('keydown', function(e) {
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                if (gameState === 'playing') doJump();
                else if (gameState === 'menu') startGame();
                else if (gameState === 'levelTransition') nextLevel();
            }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                e.preventDefault();
                if (gameState === 'playing') doSlide();
            }
            if (e.key === 'p' || e.key === 'P') {
                if (gameState === 'playing' || gameState === 'paused') togglePause();
            }
        });

        canvas.addEventListener('pointerdown', function(e) {
            if (gameState !== 'playing') return;
            e.preventDefault();
            var rect = canvas.getBoundingClientRect();
            var ty = e.clientY - rect.top;
            if (ty < rect.height / 2) doJump();
            else doSlide();
        });

        window.addEventListener('resize', function() {
            resizeCanvas();
            initBackground();
            if (gameState !== 'playing' && gameState !== 'busAnim' && gameState !== 'finalAnim') render();
        });
    }

    // ===== 玩家动作 =====
    function doJump() {
        if (player.onGround && !player.sliding) {
            player.vy = JUMP_POWER;
            player.onGround = false;
            spawnDust(player.x, groundY, 6);
        }
    }
    function doSlide() {
        if (player.onGround && !player.sliding) {
            player.sliding = true;
            slideTimer = SLIDE_DURATION;
            spawnDust(player.x, groundY, 4);
        }
    }

    // ===== 关卡管理 =====
    function startGame() {
        currentLevel = 0;
        totalDistance = 0;
        totalCoins = 0;
        score = 0;
        startLevel(0);
    }

    function startLevel(idx) {
        currentLevel = idx;
        var lv = LEVELS[idx];
        speed = lv.speed;
        distance = 0;
        levelCoins = 0;
        frameCount = 0;
        coffeeTimer = 0;
        slideTimer = 0;
        obstacles = [];
        coinItems = [];
        coffeeItems = [];
        particles = [];
        obstacleTimer = 0;
        coinTimer = 0;
        coffeeTimer_spawn = 0;
        nextObstacleGap = 90;

        player.y = groundY - player.height;
        player.vy = 0;
        player.onGround = true;
        player.sliding = false;
        player.runFrame = 0;
        player.alpha = 1;

        // UI
        el.startOverlay.style.display = 'none';
        el.endOverlay.style.display = 'none';
        el.transitionOverlay.style.display = 'none';
        el.victoryOverlay.style.display = 'none';
        el.pauseBtn.style.display = 'flex';
        el.pauseBtn.textContent = '\u23F8';
        el.levelDisplay.textContent = (idx + 1) + '/' + LEVELS.length;
        el.goal.textContent = lv.goal;

        if (window.innerWidth <= 768) el.mobileHint.style.display = 'flex';

        gameState = 'playing';
        requestAnimationFrame(gameLoop);
    }

    function nextLevel() {
        el.transitionOverlay.style.display = 'none';
        startLevel(currentLevel + 1);
    }

    // ===== 暂停 =====
    function togglePause() {
        if (gameState === 'playing') {
            gameState = 'paused';
            el.pauseBtn.textContent = '\u25B6';
        } else if (gameState === 'paused') {
            gameState = 'playing';
            el.pauseBtn.textContent = '\u23F8';
            requestAnimationFrame(gameLoop);
        }
    }

    // ===== 游戏循环 =====
    function gameLoop() {
        if (gameState === 'playing') {
            update();
            render();
            if (gameState === 'playing') requestAnimationFrame(gameLoop);
        } else if (gameState === 'busAnim') {
            updateBusAnimation();
            render();
            if (gameState === 'busAnim') requestAnimationFrame(gameLoop);
        } else if (gameState === 'finalAnim') {
            updateFinalAnimation();
            render();
            if (gameState === 'finalAnim') requestAnimationFrame(gameLoop);
        }
    }

    // ===== 更新逻辑 =====
    function update() {
        frameCount++;
        if (speed < MAX_SPEED) speed += SPEED_INCREMENT;

        distance += speed * 0.1;
        totalDistance += speed * 0.1;
        score = Math.floor(totalDistance) + totalCoins * 10;

        // UI 更新
        el.distance.textContent = Math.floor(distance);
        el.score.textContent = score;
        el.coins.textContent = '\uD83D\uDCB0 ' + totalCoins;
        var progress = Math.min(100, (distance / LEVELS[currentLevel].goal) * 100);
        el.progressBar.style.width = progress + '%';
        el.progressBus.style.left = progress + '%';

        // ===== 关卡完成检测 =====
        if (distance >= LEVELS[currentLevel].goal) {
            startBusAnimation();
            return;
        }

        if (coffeeTimer > 0) coffeeTimer--;
        if (player.sliding) {
            slideTimer--;
            if (slideTimer <= 0) player.sliding = false;
        }

        // 玩家物理
        if (!player.onGround) {
            player.vy += GRAVITY;
            player.y += player.vy;
            if (player.y >= groundY - player.height) {
                player.y = groundY - player.height;
                player.vy = 0;
                player.onGround = true;
                spawnDust(player.x, groundY, 3);
            }
        }
        player.runFrame += speed * 0.08;

        updateBackground();

        // 生成障碍
        obstacleTimer++;
        if (obstacleTimer >= nextObstacleGap) {
            spawnObstacle();
            obstacleTimer = 0;
            nextObstacleGap = Math.max(50, 100 - speed * 3 + Math.random() * 30);
        }
        // 生成金币
        coinTimer++;
        if (coinTimer >= 50 + Math.random() * 40) {
            spawnCoinRow();
            coinTimer = 0;
        }
        // 生成咖啡
        coffeeTimer_spawn++;
        if (coffeeTimer_spawn >= 400 + Math.random() * 200) {
            coffeeItems.push({ x: W+50, y: groundY-80-Math.random()*60, bob: 0, collected: false });
            coffeeTimer_spawn = 0;
        }

        // 更新障碍物
        for (var i = obstacles.length-1; i >= 0; i--) {
            obstacles[i].x -= speed;
            if (obstacles[i].x + obstacles[i].w < -20) obstacles.splice(i, 1);
        }
        // 更新金币
        for (var j = coinItems.length-1; j >= 0; j--) {
            coinItems[j].x -= speed;
            coinItems[j].bob += 0.1;
            if (coinItems[j].x < -20) coinItems.splice(j, 1);
        }
        // 更新咖啡
        for (var k = coffeeItems.length-1; k >= 0; k--) {
            coffeeItems[k].x -= speed;
            coffeeItems[k].bob += 0.08;
            if (coffeeItems[k].x < -20) coffeeItems.splice(k, 1);
        }
        // 更新粒子
        updateParticles();

        checkCollisions();
    }

    function updateBackground() {
        var farSpeed = speed * 0.15, nearSpeed = speed * 0.4;
        bgFarBuildings.forEach(function(b){ b.x -= farSpeed; });
        if (bgFarBuildings.length > 0 && bgFarBuildings[0].x + bgFarBuildings[0].w < 0) bgFarBuildings.shift();
        var lastFar = bgFarBuildings[bgFarBuildings.length-1];
        if (lastFar && lastFar.x + lastFar.w < W + 100) {
            var fw = 50 + Math.random()*40;
            bgFarBuildings.push({ x: lastFar.x+lastFar.w+5, h: 60+Math.random()*80, w: fw, color: getFarBuildingColor() });
        }
        bgNearBuildings.forEach(function(b){ b.x -= nearSpeed; });
        if (bgNearBuildings.length > 0 && bgNearBuildings[0].x + bgNearBuildings[0].w < 0) bgNearBuildings.shift();
        var lastNear = bgNearBuildings[bgNearBuildings.length-1];
        if (lastNear && lastNear.x + lastNear.w < W + 150) {
            var nw = 70 + Math.random()*50, nh = 100 + Math.random()*120;
            bgNearBuildings.push({ x: lastNear.x+lastNear.w+8, h: nh, w: nw, color: getNearBuildingColor(), windows: genWindows(nw,nh) });
        }
        bgClouds.forEach(function(c){ c.x -= c.speed; });
        for (var ci = 0; ci < bgClouds.length; ci++) {
            if (bgClouds[ci].x + bgClouds[ci].w < 0) {
                bgClouds[ci].x = W + Math.random()*100;
                bgClouds[ci].y = 30 + Math.random()*(groundY*0.35);
            }
        }
        bgStars.forEach(function(s){ s.twinkle += 0.05; });
        groundLines.forEach(function(g){ g.x -= speed; });
        for (var gi = 0; gi < groundLines.length; gi++) {
            if (groundLines[gi].x + groundLines[gi].w < 0) groundLines[gi].x += groundLines.length * 60;
        }
    }

    // ===== 生成障碍物 =====
    function spawnObstacle() {
        var types = ['ground','ground','overhead','ground'];
        if (speed > 7) types.push('double');
        var type = types[Math.floor(Math.random()*types.length)];
        if (type === 'ground') {
            var gTypes = ['trashcan','hydrant','bench','barrier','cone'];
            var gType = gTypes[Math.floor(Math.random()*gTypes.length)];
            var dims = getObstacleDims(gType);
            obstacles.push({ x: W+20, y: groundY-dims.h, w: dims.w, h: dims.h, kind:'ground', subType: gType });
        } else if (type === 'overhead') {
            var oTypes = ['awning','sign','banner'];
            var oType = oTypes[Math.floor(Math.random()*oTypes.length)];
            obstacles.push({ x: W+20, y: groundY-70, w: 36, h: 28, kind:'overhead', subType: oType });
        } else if (type === 'double') {
            obstacles.push({ x: W+20, y: groundY-24, w: 18, h: 24, kind:'ground', subType:'trashcan' });
            obstacles.push({ x: W+20+90, y: groundY-70, w: 36, h: 28, kind:'overhead', subType:'awning' });
        }
    }
    function getObstacleDims(type) {
        switch(type) {
            case 'trashcan': return { w:18, h:24 };
            case 'hydrant': return { w:16, h:22 };
            case 'bench': return { w:20, h:20 };
            case 'barrier': return { w:20, h:24 };
            case 'cone': return { w:16, h:22 };
            default: return { w:18, h:22 };
        }
    }

    function spawnCoinRow() {
        var pattern = Math.floor(Math.random()*3);
        var count = 3 + Math.floor(Math.random()*4);
        var startX = W + 30;
        var baseY = groundY - 50 - Math.random()*70;
        if (pattern === 0) {
            for (var i = 0; i < count; i++) coinItems.push({ x: startX+i*32, y: baseY, bob: Math.random()*Math.PI*2, collected:false });
        } else if (pattern === 1) {
            for (var j = 0; j < count; j++) {
                var t = j/(count-1);
                coinItems.push({ x: startX+j*32, y: baseY-Math.sin(t*Math.PI)*50, bob: Math.random()*Math.PI*2, collected:false });
            }
        } else {
            for (var k = 0; k < count; k++) coinItems.push({ x: startX+k*32, y: baseY-k*15, bob: Math.random()*Math.PI*2, collected:false });
        }
    }

    // ===== 粒子 =====
    function spawnDust(x, y, count) {
        for (var i = 0; i < count; i++) {
            particles.push({ x: x+Math.random()*20-10, y: y-Math.random()*5, vx: -Math.random()*3-1, vy: -Math.random()*2, size: Math.random()*3+2, life: 20+Math.random()*10, maxLife:30, color:'rgba(200,200,220,0.6)', gravity:0.3 });
        }
    }
    function spawnSparkle(x, y, count, color) {
        for (var i = 0; i < count; i++) {
            var angle = Math.random()*Math.PI*2, spd = Math.random()*4+2;
            particles.push({ x:x, y:y, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd, size:Math.random()*3+1, life:25+Math.random()*10, maxLife:35, color:color, gravity:0.1 });
        }
    }
    function spawnFirework(x, y) {
        var colors = ['#ff5252','#ffd740','#69f0ae','#40c4ff','#e040fb','#ff6e40'];
        var color = colors[Math.floor(Math.random()*colors.length)];
        for (var i = 0; i < 24; i++) {
            var angle = (Math.PI*2*i)/24, spd = 2+Math.random()*3;
            particles.push({ x:x, y:y, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd, size:2+Math.random()*2, life:40+Math.random()*20, maxLife:60, color:color, gravity:0.06 });
        }
    }
    function updateParticles() {
        for (var p = particles.length-1; p >= 0; p--) {
            var pt = particles[p];
            pt.x += pt.vx; pt.y += pt.vy;
            pt.vy += (pt.gravity || 0.3);
            pt.life--;
            if (pt.life <= 0) particles.splice(p, 1);
        }
    }

    // ===== 碰撞检测 =====
    function checkCollisions() {
        var pw = player.width;
        var ph = player.sliding ? player.height*0.5 : player.height;
        var py = player.sliding ? player.y+player.height*0.5 : player.y;
        var padX = 12;
        var padY = player.sliding ? 2 : 6;

        for (var i = 0; i < obstacles.length; i++) {
            var obs = obstacles[i];
            if (rectOverlap(player.x+padX, py+padY, pw-padX*2, ph-padY*2, obs.x, obs.y, obs.w, obs.h)) {
                if (coffeeTimer > 0) {
                    spawnSparkle(obs.x+obs.w/2, obs.y+obs.h/2, 10, 'rgba(255,200,100,0.8)');
                    obstacles.splice(i, 1);
                } else {
                    gameOver();
                    return;
                }
            }
        }
        for (var j = 0; j < coinItems.length; j++) {
            var coin = coinItems[j];
            var cy = coin.y + Math.sin(coin.bob)*4;
            if (rectOverlap(player.x, py, pw, ph, coin.x-12, cy-12, 24, 24)) {
                coinItems.splice(j, 1);
                levelCoins++; totalCoins++;
                spawnSparkle(coin.x, cy, 6, 'rgba(255,215,0,0.8)');
            }
        }
        for (var k = 0; k < coffeeItems.length; k++) {
            var cf = coffeeItems[k];
            var cfy = cf.y + Math.sin(cf.bob)*5;
            if (rectOverlap(player.x, py, pw, ph, cf.x-16, cfy-16, 32, 32)) {
                coffeeItems.splice(k, 1);
                coffeeTimer = COFFEE_DURATION;
                spawnSparkle(cf.x, cfy, 15, 'rgba(180,100,50,0.9)');
            }
        }
    }
    function rectOverlap(x1,y1,w1,h1,x2,y2,w2,h2) {
        return x1 < x2+w2 && x1+w1 > x2 && y1 < y2+h2 && y1+h1 > y2;
    }

    // ===== 游戏结束 =====
    function gameOver() {
        gameState = 'ended';
        el.pauseBtn.style.display = 'none';
        el.mobileHint.style.display = 'none';
        if (score > bestScore) { bestScore = score; saveBest(); }
        var titles = ['闯关失败！','差一点就到了…','明天继续加油！','差点赶上车！','需要一杯咖啡续命'];
        var icons = ['\uD83D\uDCA5','\uD83D\uDE35','\uD83D\uDE30','\uD83C\uDFC3','\u2615'];
        var idx = Math.floor(Math.random()*titles.length);
        el.endIcon.textContent = icons[idx];
        el.endTitle.textContent = titles[idx];
        el.endDistance.textContent = Math.floor(totalDistance);
        el.endCoins.textContent = totalCoins;
        el.endScore.textContent = score;
        el.endOverlay.style.display = 'flex';
    }

    // ===== 公交上车动画 =====
    function startBusAnimation() {
        gameState = 'busAnim';
        el.pauseBtn.style.display = 'none';
        el.mobileHint.style.display = 'none';
        var busW = Math.min(170, W * 0.42);
        var busH = busW * 0.42;
        busAnim = {
            phase: 'busIn',
            timer: 0,
            busX: W + 60,
            busStopX: player.x + 70,
            busY: groundY - busH - 12,
            busW: busW,
            busH: busH,
            doorOpen: 0,
            bgScroll: speed * 0.5,
            slideX: 0
        };
        obstacles = [];
        coinItems = [];
        coffeeItems = [];
        requestAnimationFrame(gameLoop);
    }

    function updateBusAnimation() {
        var a = busAnim;
        a.timer++;
        frameCount++;

        // 背景持续微滚
        var scrollSpd = a.bgScroll;
        if (a.phase === 'busIn') scrollSpd = a.bgScroll * (1 - a.timer/80);
        else if (a.phase === 'busOut') scrollSpd = a.bgScroll * 0.3 + a.timer * 0.15;
        else scrollSpd = 0.5;
        scrollBackground(scrollSpd);
        updateParticles();

        if (a.phase === 'busIn') {
            // 0~80帧：公交车从右侧驶入，减速停靠
            var t = a.timer / 80;
            var eased = 1 - Math.pow(1 - t, 3);
            a.busX = (W + 60) + (a.busStopX - (W + 60)) * eased;
            // 玩家继续跑步动画
            player.runFrame += 0.3;
            if (a.timer >= 80) { a.phase = 'doorOpen'; a.timer = 0; }
        } else if (a.phase === 'doorOpen') {
            // 25帧：车门滑开
            a.doorOpen = Math.min(1, a.timer / 25);
            if (a.timer >= 25) { a.phase = 'playerBoard'; a.timer = 0; }
        } else if (a.phase === 'playerBoard') {
            // 45帧：玩家跑向车门
            var doorCenterX = a.busX + a.busW * 0.28 + 11;
            var dx = doorCenterX - player.x;
            player.x += dx * 0.08;
            player.runFrame += 0.4;
            if (a.timer > 35) {
                player.alpha = Math.max(0, 1 - (a.timer - 35) / 10);
            }
            spawnDust(player.x, groundY, 1);
            if (a.timer >= 45) { a.phase = 'doorClose'; a.timer = 0; player.alpha = 0; }
        } else if (a.phase === 'doorClose') {
            // 20帧：车门关闭
            a.doorOpen = Math.max(0, 1 - a.timer / 20);
            if (a.timer >= 20) { a.phase = 'busOut'; a.timer = 0; }
        } else if (a.phase === 'busOut') {
            // 90帧：公交车向右加速驶离，整个场景向右滑出屏幕
            var t2 = a.timer / 90;
            var accel = t2 * t2; // 二次加速
            // 公交车向右加速移动（比场景滑动更快，营造驶离感）
            a.busX = a.busStopX + accel * (W + 300 - a.busStopX);
            // 整个场景向右滑出
            a.slideX = accel * (W + 100);
            if (a.timer >= 90) {
                // 动画结束
                if (currentLevel >= LEVELS.length - 1) {
                    startFinalAnimation();
                } else {
                    showTransition();
                }
                return;
            }
        }
    }

    function showTransition() {
        gameState = 'levelTransition';
        var nextLv = LEVELS[currentLevel + 1];
        el.transitionIcon.textContent = '\uD83D\uDE8C';
        el.transitionTitle.textContent = '\u7B2C' + (currentLevel + 2) + '\u5173';
        el.transitionSubtitle.textContent = nextLv.name + ' \u00B7 ' + nextLv.subtitle;
        el.transitionDistance.textContent = Math.floor(distance);
        el.transitionCoins.textContent = levelCoins;
        el.transitionOverlay.style.display = 'flex';
    }

    // ===== 最终动画：下车回家 =====
    function startFinalAnimation() {
        gameState = 'finalAnim';
        var busW = Math.min(160, W * 0.4);
        var busH = busW * 0.42;
        var houseW = Math.min(120, W * 0.3);
        var houseH = houseW * 0.75;
        finalAnim = {
            phase: 'busArrive',
            timer: 0,
            busX: W + 60,
            busStopX: W * 0.22,
            busY: groundY - busH - 12,
            busW: busW, busH: busH,
            doorOpen: 0,
            houseX: W * 0.65,
            houseY: groundY - houseH - 6,
            houseW: houseW, houseH: houseH,
            houseDoorOpen: 0,
            playerX: 0, playerY: 0,
            playerAlpha: 0,
            playerWalkFrame: 0,
            fireworkTimer: 0,
            celebrationTimer: 0
        };
        // 玩家初始位置在公交车门处
        finalAnim.playerX = finalAnim.busStopX + busW * 0.28 + 11;
        finalAnim.playerY = groundY - player.height;
        requestAnimationFrame(gameLoop);
    }

    function updateFinalAnimation() {
        var a = finalAnim;
        a.timer++;
        frameCount++;
        updateParticles();

        // 背景微滚
        var scrollSpd = 0;
        if (a.phase === 'busArrive') {
            var t = a.timer / 80;
            var eased = 1 - Math.pow(1 - t, 3);
            a.busX = (W + 60) + (a.busStopX - (W + 60)) * eased;
            scrollSpd = 2 * (1 - t);
        } else if (a.phase === 'doorOpen') {
            a.doorOpen = Math.min(1, a.timer / 25);
            if (a.timer >= 25) { a.phase = 'playerExit'; a.timer = 0; }
        } else if (a.phase === 'playerExit') {
            // 玩家从车门走出来
            a.playerAlpha = Math.min(1, a.timer / 15);
            var doorX = a.busX + a.busW * 0.28 + 11;
            var exitTarget = doorX + 30;
            a.playerX = doorX + (exitTarget - doorX) * Math.min(1, a.timer / 40);
            a.playerWalkFrame += 0.2;
            if (a.timer >= 50) { a.phase = 'walkToHouse'; a.timer = 0; }
        } else if (a.phase === 'walkToHouse') {
            // 玩家走到家门口
            var houseDoorX = a.houseX + a.houseW / 2;
            var t2 = a.timer / 80;
            var eased2 = t2 < 0.5 ? 2*t2*t2 : 1-Math.pow(-2*t2+2,2)/2;
            var startX = a.busX + a.busW * 0.28 + 11 + 30;
            a.playerX = startX + (houseDoorX - 15 - startX) * eased2;
            a.playerWalkFrame += 0.25;
            spawnDust(a.playerX, groundY, 1);
            if (a.timer >= 80) { a.phase = 'houseDoorOpen'; a.timer = 0; }
        } else if (a.phase === 'houseDoorOpen') {
            a.houseDoorOpen = Math.min(1, a.timer / 30);
            if (a.timer >= 30) { a.phase = 'playerEnter'; a.timer = 0; }
        } else if (a.phase === 'playerEnter') {
            // 玩家走进门，逐渐消失
            var houseDoorX = a.houseX + a.houseW / 2;
            a.playerX += 0.8;
            if (a.timer > 20) {
                a.playerAlpha = Math.max(0, 1 - (a.timer - 20) / 20);
            }
            if (a.timer >= 40) { a.phase = 'celebration'; a.timer = 0; a.celebrationTimer = 0; }
        } else if (a.phase === 'celebration') {
            // 烟花庆祝
            a.celebrationTimer++;
            a.fireworkTimer--;
            if (a.fireworkTimer <= 0) {
                var fx = W * 0.2 + Math.random() * W * 0.6;
                var fy = groundY * 0.2 + Math.random() * groundY * 0.3;
                spawnFirework(fx, fy);
                a.fireworkTimer = 15 + Math.random() * 15;
            }
            if (a.celebrationTimer >= 150) {
                showVictory();
                return;
            }
        }

        if (scrollSpd > 0) scrollBackground(scrollSpd);
        else scrollBackground(0.3);
    }

    function showVictory() {
        gameState = 'victory';
        el.victoryDistance.textContent = Math.floor(totalDistance);
        el.victoryCoins.textContent = totalCoins;
        el.victoryScore.textContent = score;
        el.victoryOverlay.style.display = 'flex';
    }

    function replayFinalAnimation() {
        el.victoryOverlay.style.display = 'none';
        particles = [];
        startFinalAnimation();
    }

    function scrollBackground(spd) {
        var farSpeed = spd * 0.15, nearSpeed = spd * 0.4;
        bgFarBuildings.forEach(function(b){ b.x -= farSpeed; });
        if (bgFarBuildings.length > 0 && bgFarBuildings[0].x + bgFarBuildings[0].w < 0) bgFarBuildings.shift();
        var lastFar = bgFarBuildings[bgFarBuildings.length-1];
        if (lastFar && lastFar.x + lastFar.w < W + 100) {
            var fw = 50 + Math.random()*40;
            bgFarBuildings.push({ x: lastFar.x+lastFar.w+5, h: 60+Math.random()*80, w: fw, color: getFarBuildingColor() });
        }
        bgNearBuildings.forEach(function(b){ b.x -= nearSpeed; });
        if (bgNearBuildings.length > 0 && bgNearBuildings[0].x + bgNearBuildings[0].w < 0) bgNearBuildings.shift();
        var lastNear = bgNearBuildings[bgNearBuildings.length-1];
        if (lastNear && lastNear.x + lastNear.w < W + 150) {
            var nw = 70 + Math.random()*50, nh = 100 + Math.random()*120;
            bgNearBuildings.push({ x: lastNear.x+lastNear.w+8, h: nh, w: nw, color: getNearBuildingColor(), windows: genWindows(nw,nh) });
        }
        bgClouds.forEach(function(c){ c.x -= c.speed * 0.5; });
        bgStars.forEach(function(s){ s.twinkle += 0.05; });
        groundLines.forEach(function(g){ g.x -= spd; });
        for (var gi = 0; gi < groundLines.length; gi++) {
            if (groundLines[gi].x + groundLines[gi].w < 0) groundLines[gi].x += groundLines.length * 60;
        }
    }

    // ===== 渲染 =====
    function getCurrentDayPhase() {
        if (gameState === 'finalAnim' || gameState === 'victory') return 2.5;
        if (currentLevel < LEVELS.length) {
            var base = LEVELS[currentLevel].dayPhase;
            var prog = distance / LEVELS[currentLevel].goal;
            return base + prog * 0.3;
        }
        return 0.5;
    }

    function render() {
        // 计算 scene slide 偏移（公交驶离阶段整个场景向右滑出）
        var slideX = 0;
        if (gameState === 'busAnim' && busAnim && busAnim.slideX > 0) {
            slideX = busAnim.slideX;
        }
        if (slideX > 0) {
            // 左侧露出的区域填充深色过渡底
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, W, H);
        } else {
            ctx.clearRect(0, 0, W, H);
        }
        ctx.save();
        if (slideX > 0) ctx.translate(slideX, 0);
        var dayPhase = getCurrentDayPhase();
        drawSky(dayPhase);
        drawStars(dayPhase);
        drawClouds(dayPhase);
        drawFarBuildings(dayPhase);
        drawNearBuildings(dayPhase);
        drawGround();

        if (gameState === 'playing' || gameState === 'paused') {
            drawCoins();
            drawCoffees();
            drawObstacles();
            drawPlayer();
            drawParticles();
            if (coffeeTimer > 0 && gameState === 'playing') drawCoffeeEffect();
        } else if (gameState === 'busAnim') {
            renderBusAnimation(dayPhase);
        } else if (gameState === 'finalAnim' || gameState === 'victory') {
            renderFinalScene(dayPhase);
        } else {
            // menu / ended / levelTransition — 只画背景 + 静止玩家
            if (gameState === 'menu' || gameState === 'ended') {
                drawPlayer();
            }
            drawParticles();
        }
        ctx.restore();
    }

    // ===== 公交动画渲染 =====
    function renderBusAnimation(dayPhase) {
        var a = busAnim;
        // 画剩余的金币（让画面不空）
        drawCoins();
        drawCoffees();
        drawParticles();

        // 玩家（如果可见）
        if (player.alpha > 0) {
            ctx.globalAlpha = player.alpha;
            if (a.phase === 'busIn') {
                drawPlayer();
            } else {
                drawPlayerAt(player.x, player.y, player.width, player.height, 'running');
            }
            ctx.globalAlpha = 1;
        }

        // 公交车
        drawBus(a.busX, a.busY, a.busW, a.busH, a.doorOpen);

        // 公交停靠时的光晕
        if (a.phase === 'doorOpen' || a.phase === 'playerBoard') {
            ctx.fillStyle = 'rgba(255, 220, 100, 0.08)';
            ctx.fillRect(0, 0, W, H);
        }
    }

    // ===== 最终场景渲染 =====
    function renderFinalScene(dayPhase) {
        var a = finalAnim;
        drawParticles();

        // 房子（始终绘制）
        drawHouse(a.houseX, a.houseY, a.houseW, a.houseH, a.houseDoorOpen, true);

        // 路灯
        drawStreetLamp(a.houseX - 30, groundY);

        // 公交车
        if (a.busX > -a.busW - 20) {
            drawBus(a.busX, a.busY, a.busW, a.busH, a.doorOpen);
        }

        // 公交站牌
        if (a.phase === 'busArrive' || a.phase === 'doorOpen' || a.phase === 'playerExit') {
            drawBusStop(a.busStopX + a.busW + 10, groundY - 50);
        }

        // 玩家
        if (a.playerAlpha > 0) {
            ctx.globalAlpha = a.playerAlpha;
            drawPlayerAt(a.playerX, a.playerY, player.width, player.height, 'walking');
            ctx.globalAlpha = 1;
        }

        // 庆祝阶段的文字提示
        if (a.phase === 'celebration') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('\uD83C\uDF89 \u5230\u5BB6\u4E86\uFF01', W/2, H*0.25);
            ctx.textAlign = 'left';
        }
    }

    // ===== 天空 =====
    function drawSky(phase) {
        var grad = ctx.createLinearGradient(0, 0, 0, groundY);
        var topColor, midColor, botColor;
        if (phase < 1) {
            var t = phase;
            topColor = lerpColor('#4a90d9','#5ba0e8',t);
            midColor = lerpColor('#7bb5e0','#8fc5ed',t);
            botColor = lerpColor('#c4dff0','#d0e8f5',t);
        } else if (phase < 2) {
            var t2 = phase-1;
            topColor = lerpColor('#5ba0e8','#6b4e9e',t2);
            midColor = lerpColor('#8fc5ed','#e8835a',t2);
            botColor = lerpColor('#d0e8f5','#f5c97a',t2);
        } else if (phase < 3) {
            var t3 = phase-2;
            topColor = lerpColor('#6b4e9e','#0f0c29',t3);
            midColor = lerpColor('#e8835a','#1a1a3e',t3);
            botColor = lerpColor('#f5c97a','#2a2a4a',t3);
        } else {
            var t4 = phase-3;
            topColor = lerpColor('#0f0c29','#4a90d9',t4);
            midColor = lerpColor('#1a1a3e','#7bb5e0',t4);
            botColor = lerpColor('#2a2a4a','#c4dff0',t4);
        }
        grad.addColorStop(0, topColor);
        grad.addColorStop(0.5, midColor);
        grad.addColorStop(1, botColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, groundY);
    }
    function lerpColor(c1, c2, t) {
        var r1=parseInt(c1.substr(1,2),16), g1=parseInt(c1.substr(3,2),16), b1=parseInt(c1.substr(5,2),16);
        var r2=parseInt(c2.substr(1,2),16), g2=parseInt(c2.substr(3,2),16), b2=parseInt(c2.substr(5,2),16);
        return 'rgb('+Math.round(r1+(r2-r1)*t)+','+Math.round(g1+(g2-g1)*t)+','+Math.round(b1+(b2-b1)*t)+')';
    }

    // ===== 星星 =====
    function drawStars(phase) {
        var alpha = 0;
        if (phase >= 2 && phase < 3) alpha = phase-2;
        else if (phase >= 3 && phase < 4) alpha = 1-(phase-3)*0.7;
        if (alpha <= 0) return;
        bgStars.forEach(function(s){
            var tw = (Math.sin(s.twinkle)+1)/2*0.5+0.5;
            ctx.fillStyle = 'rgba(255,255,240,'+(alpha*tw)+')';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill();
        });
    }

    // ===== 云 =====
    function drawClouds(phase) {
        var alpha = (phase >= 2 && phase < 4) ? 0.25 : 0.7;
        bgClouds.forEach(function(c){
            ctx.fillStyle = 'rgba(255,255,255,'+alpha+')';
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.w*0.3, 0, Math.PI*2);
            ctx.arc(c.x+c.w*0.3, c.y-5, c.w*0.25, 0, Math.PI*2);
            ctx.arc(c.x+c.w*0.5, c.y, c.w*0.3, 0, Math.PI*2);
            ctx.arc(c.x+c.w*0.25, c.y+5, c.w*0.22, 0, Math.PI*2);
            ctx.fill();
        });
    }

    // ===== 远景建筑 =====
    function drawFarBuildings(phase) {
        ctx.globalAlpha = 0.5;
        bgFarBuildings.forEach(function(b){
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, groundY-b.h, b.w, b.h);
        });
        ctx.globalAlpha = 1;
    }

    // ===== 近景建筑 =====
    function drawNearBuildings(phase) {
        bgNearBuildings.forEach(function(b){
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, groundY-b.h, b.w, b.h);
            var wa = (phase >= 1.5 && phase < 3.5) ? 0.8 : 0.3;
            b.windows.forEach(function(w){
                var wx = b.x+5+w.cx*14, wy = groundY-b.h+8+w.cy*18;
                if (wx+7 < b.x+b.w-3 && wy+10 < groundY-3) {
                    ctx.fillStyle = w.lit ? 'rgba(255,230,120,'+wa+')' : 'rgba(100,100,120,0.3)';
                    ctx.fillRect(wx, wy, 7, 10);
                }
            });
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(b.x, groundY-b.h, b.w, 4);
        });
    }

    // ===== 地面 =====
    function drawGround() {
        var grad = ctx.createLinearGradient(0, groundY, 0, H);
        grad.addColorStop(0, '#3d3d5c');
        grad.addColorStop(0.3, '#2e2e48');
        grad.addColorStop(1, '#1e1e36');
        ctx.fillStyle = grad;
        ctx.fillRect(0, groundY, W, H-groundY);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 2;
        groundLines.forEach(function(g){
            ctx.beginPath(); ctx.moveTo(g.x, groundY+8); ctx.lineTo(g.x+g.w, groundY+8); ctx.stroke();
        });
    }

    // ===== 金币 =====
    function drawCoins() {
        coinItems.forEach(function(coin){
            var cy = coin.y + Math.sin(coin.bob)*4;
            var rot = Math.cos(coin.bob*1.5);
            var r = Math.max(4, 11*Math.abs(rot)+2);
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.ellipse(coin.x, cy, r+2, 12, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.ellipse(coin.x, cy, r, 10, 0, 0, Math.PI*2); ctx.fill();
            if (rot > 0.3) {
                ctx.fillStyle = 'rgba(255,255,220,0.6)';
                ctx.beginPath(); ctx.ellipse(coin.x-3, cy-3, r*0.4, 4, 0, 0, Math.PI*2); ctx.fill();
            }
        });
    }

    // ===== 咖啡 =====
    function drawCoffees() {
        coffeeItems.forEach(function(cf){
            var cy = cf.y + Math.sin(cf.bob)*5;
            ctx.fillStyle = 'rgba(255,180,80,0.15)';
            ctx.beginPath(); ctx.arc(cf.x, cy, 22, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#d4a574';
            roundRect(ctx, cf.x-10, cy-10, 20, 18, 3); ctx.fill();
            ctx.fillStyle = '#8b5e3c';
            ctx.fillRect(cf.x-10, cy-10, 20, 4);
            ctx.fillStyle = '#3d2410';
            ctx.fillRect(cf.x-8, cy-9, 16, 2);
            ctx.strokeStyle = '#d4a574'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(cf.x+12, cy-2, 5, -Math.PI/2, Math.PI/2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cf.x-4, cy-12); ctx.quadraticCurveTo(cf.x-8, cy-18, cf.x-4, cy-24); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cf.x+4, cy-12); ctx.quadraticCurveTo(cf.x+8, cy-18, cf.x+4, cy-24); ctx.stroke();
        });
    }

    // ===== 障碍物 =====
    function drawObstacles() {
        obstacles.forEach(function(obs){
            if (obs.kind === 'ground') drawGroundObstacle(obs);
            else if (obs.kind === 'overhead') drawOverheadObstacle(obs);
        });
    }
    function drawGroundObstacle(obs) {
        var x=obs.x, y=obs.y, w=obs.w, h=obs.h;
        switch(obs.subType) {
            case 'trashcan':
                ctx.fillStyle='#2a6e4f'; roundRect(ctx,x,y,w,h,3); ctx.fill();
                ctx.fillStyle='#1a5e3f'; ctx.fillRect(x,y+h*0.3,w,3); ctx.fillRect(x,y+h*0.6,w,3);
                ctx.fillStyle='#1a4e3f'; ctx.fillRect(x-2,y,w+4,5); break;
            case 'hydrant':
                ctx.fillStyle='#c0392b'; ctx.fillRect(x+w*0.2,y+h*0.3,w*0.6,h*0.7);
                ctx.beginPath(); ctx.arc(x+w/2,y+h*0.3,w*0.35,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#a93226'; ctx.fillRect(x,y+h*0.5,w*0.2,6); ctx.fillRect(x+w*0.8,y+h*0.5,w*0.2,6); break;
            case 'bench':
                ctx.fillStyle='#6d4c41'; ctx.fillRect(x,y+h*0.3,w,8);
                ctx.fillRect(x+3,y+h*0.3,5,h*0.7); ctx.fillRect(x+w-8,y+h*0.3,5,h*0.7);
                ctx.fillRect(x,y,5,h*0.4); ctx.fillRect(x+w-5,y,5,h*0.4); ctx.fillRect(x,y+4,w,4); break;
            case 'barrier':
                ctx.fillStyle='#f39c12'; ctx.fillRect(x,y,w,h);
                ctx.fillStyle='#1a1a1a';
                var stripes = Math.max(2, Math.floor(w/8));
                var sw = w/stripes;
                for (var i=0; i<stripes; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x+i*sw,y); ctx.lineTo(x+i*sw+sw*0.6,y);
                    ctx.lineTo(x+i*sw+sw,y+h); ctx.lineTo(x+i*sw+sw*0.4,y+h);
                    ctx.closePath(); ctx.fill();
                } break;
            case 'cone':
                ctx.fillStyle='#e67e22';
                ctx.beginPath(); ctx.moveTo(x+w/2,y); ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.closePath(); ctx.fill();
                ctx.fillStyle='#fff'; ctx.fillRect(x+w*0.15,y+h*0.4,w*0.7,4); break;
        }
        ctx.fillStyle='rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(x+w/2,groundY,w*0.6,4,0,0,Math.PI*2); ctx.fill();
    }
    function drawOverheadObstacle(obs) {
        var x=obs.x, y=obs.y, w=obs.w, h=obs.h;
        switch(obs.subType) {
            case 'awning':
                ctx.fillStyle='#8e44ad'; ctx.fillRect(x,y,w,h);
                ctx.fillStyle='#7d3c98';
                ctx.beginPath(); ctx.moveTo(x,y+h); ctx.lineTo(x+w/2,y+h+10); ctx.lineTo(x+w,y+h); ctx.closePath(); ctx.fill();
                ctx.fillStyle='rgba(255,255,255,0.3)';
                var stripeCount = Math.max(3, Math.floor(w/8));
                var stW = w/stripeCount;
                for (var i=0; i<stripeCount; i++) ctx.fillRect(x+i*stW,y,stW*0.4,h); break;
            case 'sign':
                ctx.fillStyle='#34495e'; ctx.fillRect(x+w/2-2,y-10,4,h+10);
                ctx.fillStyle='#2c3e50'; roundRect(ctx,x,y,w,h*0.7,4); ctx.fill();
                ctx.fillStyle='#ecf0f1'; ctx.fillRect(x+8,y+6,w-16,3); ctx.fillRect(x+8,y+12,w-20,3); break;
            case 'banner':
                ctx.fillStyle='#c0392b'; ctx.fillRect(x,y,w,h);
                ctx.fillStyle='#fff'; ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
                ctx.fillText('SALE',x+w/2,y+h*0.7); ctx.textAlign='left';
                ctx.strokeStyle='rgba(100,100,100,0.5)'; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-15,groundY);
                ctx.moveTo(x+w,y); ctx.lineTo(x+w+15,groundY); ctx.stroke(); break;
        }
    }

    // ===== 玩家渲染 =====
    function drawPlayer() {
        var px=player.x, py=player.y, pw=player.width;
        var ph = player.sliding ? player.height*0.5 : player.height;
        if (player.sliding) py = player.y + player.height*0.5;

        if (coffeeTimer > 0) {
            var pulse = (Math.sin(frameCount*0.2)+1)/2;
            ctx.fillStyle = 'rgba(255,180,80,'+(0.15+pulse*0.15)+')';
            ctx.beginPath(); ctx.arc(px+pw/2, py+ph/2, 40+pulse*8, 0, Math.PI*2); ctx.fill();
        }

        var sa = player.onGround ? 0.3 : 0.15;
        var ss = player.onGround ? 1 : 0.7;
        ctx.fillStyle = 'rgba(0,0,0,'+sa+')';
        ctx.beginPath(); ctx.ellipse(px+pw/2, groundY, 20*ss, 5, 0, 0, Math.PI*2); ctx.fill();

        if (player.sliding) drawPlayerSliding(px, py, pw, ph);
        else drawPlayerRunning(px, py, pw, ph);
    }

    function drawPlayerAt(px, py, pw, ph, mode) {
        // 阴影
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(px+pw/2, groundY, 18, 4, 0, 0, Math.PI*2); ctx.fill();
        if (mode === 'walking') drawPlayerWalking(px, py, pw, ph);
        else drawPlayerRunning(px, py, pw, ph);
    }

    function drawPlayerRunning(px, py, pw, ph) {
        var cx = px + pw/2;
        var legSwing = Math.sin(player.runFrame)*8;
        var armSwing = Math.sin(player.runFrame+Math.PI)*6;
        var bodyBob = Math.abs(Math.sin(player.runFrame*2))*2;
        if (!player.onGround) { legSwing=0; armSwing=-10; bodyBob=0; }
        py -= bodyBob;

        ctx.fillStyle='#2c3e50'; ctx.fillRect(cx-4, py+ph*0.55, 8, ph*0.45-legSwing);
        ctx.fillStyle='#34495e'; ctx.fillRect(cx-pw*0.3, py+ph*0.25, 7, ph*0.35+armSwing);
        ctx.fillStyle='#2c3e50'; roundRect(ctx, cx-pw*0.3, py+ph*0.2, pw*0.6, ph*0.4, 4); ctx.fill();
        ctx.fillStyle='#ecf0f1';
        ctx.beginPath(); ctx.moveTo(cx,py+ph*0.2); ctx.lineTo(cx-4,py+ph*0.2); ctx.lineTo(cx-4,py+ph*0.42); ctx.lineTo(cx,py+ph*0.45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx,py+ph*0.2); ctx.lineTo(cx+4,py+ph*0.2); ctx.lineTo(cx+4,py+ph*0.42); ctx.lineTo(cx,py+ph*0.45); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#e74c3c';
        ctx.beginPath(); ctx.moveTo(cx,py+ph*0.2); ctx.lineTo(cx-3,py+ph*0.35); ctx.lineTo(cx,py+ph*0.45); ctx.lineTo(cx+3,py+ph*0.35); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#34495e'; ctx.fillRect(cx+pw*0.2, py+ph*0.25, 7, ph*0.35-armSwing);
        ctx.fillStyle='#2c3e50'; ctx.fillRect(cx-4, py+ph*0.55, 8, ph*0.45+legSwing);
        ctx.fillStyle='#1a1a2e'; ctx.fillRect(cx-6, py+ph-4-legSwing, 12, 4); ctx.fillRect(cx-6, py+ph-4+legSwing, 12, 4);
        ctx.fillStyle='#fdcb9b'; ctx.beginPath(); ctx.arc(cx, py+ph*0.1, pw*0.22, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#2c3e50'; ctx.beginPath(); ctx.arc(cx, py+ph*0.06, pw*0.22, Math.PI, 2*Math.PI); ctx.fill();
        ctx.fillRect(cx-pw*0.22, py+ph*0.06, pw*0.44, 4);
        if (player.onGround) {
            ctx.fillStyle='#8b4513'; roundRect(ctx, cx+pw*0.25, py+ph*0.5, 12, 10, 2); ctx.fill();
            ctx.fillStyle='#5d3a1a'; ctx.fillRect(cx+pw*0.25+2, py+ph*0.5-3, 8, 3);
        }
    }

    function drawPlayerWalking(px, py, pw, ph) {
        var cx = px + pw/2;
        var walkFrame = (finalAnim ? finalAnim.playerWalkFrame : 0) || player.runFrame;
        var legSwing = Math.sin(walkFrame)*5;
        var armSwing = Math.sin(walkFrame+Math.PI)*4;

        ctx.fillStyle='#2c3e50'; ctx.fillRect(cx-4, py+ph*0.55, 8, ph*0.45-legSwing);
        ctx.fillStyle='#34495e'; ctx.fillRect(cx-pw*0.3, py+ph*0.25, 7, ph*0.35+armSwing);
        ctx.fillStyle='#2c3e50'; roundRect(ctx, cx-pw*0.3, py+ph*0.2, pw*0.6, ph*0.4, 4); ctx.fill();
        ctx.fillStyle='#ecf0f1';
        ctx.beginPath(); ctx.moveTo(cx,py+ph*0.2); ctx.lineTo(cx-4,py+ph*0.2); ctx.lineTo(cx-4,py+ph*0.42); ctx.lineTo(cx,py+ph*0.45); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx,py+ph*0.2); ctx.lineTo(cx+4,py+ph*0.2); ctx.lineTo(cx+4,py+ph*0.42); ctx.lineTo(cx,py+ph*0.45); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#e74c3c';
        ctx.beginPath(); ctx.moveTo(cx,py+ph*0.2); ctx.lineTo(cx-3,py+ph*0.35); ctx.lineTo(cx,py+ph*0.45); ctx.lineTo(cx+3,py+ph*0.35); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#34495e'; ctx.fillRect(cx+pw*0.2, py+ph*0.25, 7, ph*0.35-armSwing);
        ctx.fillStyle='#2c3e50'; ctx.fillRect(cx-4, py+ph*0.55, 8, ph*0.45+legSwing);
        ctx.fillStyle='#1a1a2e'; ctx.fillRect(cx-6, py+ph-4-legSwing, 12, 4); ctx.fillRect(cx-6, py+ph-4+legSwing, 12, 4);
        ctx.fillStyle='#fdcb9b'; ctx.beginPath(); ctx.arc(cx, py+ph*0.1, pw*0.22, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#2c3e50'; ctx.beginPath(); ctx.arc(cx, py+ph*0.06, pw*0.22, Math.PI, 2*Math.PI); ctx.fill();
        ctx.fillRect(cx-pw*0.22, py+ph*0.06, pw*0.44, 4);
        ctx.fillStyle='#8b4513'; roundRect(ctx, cx+pw*0.25, py+ph*0.5, 12, 10, 2); ctx.fill();
        ctx.fillStyle='#5d3a1a'; ctx.fillRect(cx+pw*0.25+2, py+ph*0.5-3, 8, 3);
    }

    function drawPlayerSliding(px, py, pw, ph) {
        var cx = px + pw/2;
        ctx.fillStyle='#2c3e50'; roundRect(ctx, px, py+4, pw*1.3, ph-4, 6); ctx.fill();
        ctx.fillStyle='#ecf0f1'; ctx.fillRect(px+pw*0.5, py+6, pw*0.5, ph-8);
        ctx.fillStyle='#e74c3c'; ctx.fillRect(px+pw*0.7, py+6, 4, ph-8);
        ctx.fillStyle='#fdcb9b'; ctx.beginPath(); ctx.arc(px+pw*1.3, py+ph*0.5, pw*0.25, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#2c3e50'; ctx.beginPath(); ctx.arc(px+pw*1.3, py+ph*0.5-2, pw*0.25, Math.PI, 2*Math.PI); ctx.fill();
        if (frameCount % 3 === 0) spawnDust(px, groundY, 2);
        ctx.fillStyle='#8b4513'; roundRect(ctx, px-5, py+6, 12, 10, 2); ctx.fill();
    }

    // ===== 粒子渲染 =====
    function drawParticles() {
        particles.forEach(function(p){
            ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 30));
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    // ===== 咖啡特效 =====
    function drawCoffeeEffect() {
        for (var i = 0; i < 5; i++) {
            var ly = player.y + (i/5)*player.height;
            var lx = player.x - 20 - Math.random()*40;
            var len = 20 + Math.random()*30;
            ctx.strokeStyle = 'rgba(255,200,100,'+(0.3+Math.random()*0.3)+')';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx-len, ly); ctx.stroke();
        }
        if (coffeeTimer < 60) {
            var bx = player.x - 10, by = player.y - 12;
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(bx, by, 60, 4);
            ctx.fillStyle = '#ffa500'; ctx.fillRect(bx, by, 60*(coffeeTimer/60), 4);
        }
    }

    // ===== 公交车绘制 =====
    function drawBus(x, y, w, h, doorOpen) {
        // 阴影
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h+12, w*0.45, 6, 0, 0, Math.PI*2); ctx.fill();

        // 车身主体
        ctx.fillStyle = '#f9a825';
        roundRect(ctx, x, y, w, h, 10); ctx.fill();
        // 底部条
        ctx.fillStyle = '#e65100';
        ctx.fillRect(x, y+h-12, w, 12);
        // 前部（右侧斜面）
        ctx.fillStyle = '#f57f17';
        ctx.beginPath();
        ctx.moveTo(x+w, y+10); ctx.lineTo(x+w+8, y+20);
        ctx.lineTo(x+w+8, y+h-12); ctx.lineTo(x+w, y+h-12);
        ctx.closePath(); ctx.fill();

        // 窗户
        var winY = y+8, winH = Math.min(18, h*0.28);
        var doorX = x + w*0.28, doorW = Math.max(18, w*0.14);
        ctx.fillStyle = '#81d4fa';
        // 门前的窗户
        var wx = x + 12;
        while (wx + 24 < doorX - 4) {
            roundRect(ctx, wx, winY, 22, winH, 3); ctx.fill();
            wx += 28;
        }
        // 门后的窗户
        wx = doorX + doorW + 6;
        while (wx + 24 < x + w - 18) {
            roundRect(ctx, wx, winY, 22, winH, 3); ctx.fill();
            wx += 28;
        }
        // 前挡风玻璃
        ctx.fillStyle = '#81d4fa';
        roundRect(ctx, x+w-14, y+8, 12, 20, 3); ctx.fill();

        // 车门（滑动）
        ctx.fillStyle = 'rgba(20,20,40,0.6)';
        ctx.fillRect(doorX, y+8, doorW, h-20);
        var slide = doorOpen * (doorW * 0.45);
        ctx.fillStyle = '#37474f';
        ctx.fillRect(doorX - slide, y+8, doorW*0.5, h-20);
        ctx.fillRect(doorX + doorW*0.5 + slide, y+8, doorW*0.5, h-20);
        ctx.strokeStyle = '#e65100'; ctx.lineWidth = 2;
        ctx.strokeRect(doorX, y+8, doorW, h-20);

        // 前灯
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath(); ctx.arc(x+w+6, y+h*0.5, 3, 0, Math.PI*2); ctx.fill();

        // 车轮
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(x+w*0.22, y+h, 10, 0, Math.PI*2);
        ctx.arc(x+w*0.72, y+h, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#666';
        ctx.beginPath(); ctx.arc(x+w*0.22, y+h, 4, 0, Math.PI*2);
        ctx.arc(x+w*0.72, y+h, 4, 0, Math.PI*2); ctx.fill();

        // BUS 标识
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('BUS', x+w-8, y+6); ctx.textAlign = 'left';
    }

    // ===== 房子绘制 =====
    function drawHouse(x, y, w, h, doorOpen, lit) {
        // 阴影
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(x+w/2, y+h+6, w*0.55, 5, 0, 0, Math.PI*2); ctx.fill();
        // 房身
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(x, y, w, h);
        // 屋顶
        ctx.fillStyle = '#4e342e';
        ctx.beginPath();
        ctx.moveTo(x-8, y); ctx.lineTo(x+w/2, y-32); ctx.lineTo(x+w+8, y);
        ctx.closePath(); ctx.fill();
        // 烟囱
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x+w*0.7, y-25, 10, 18);
        // 炊烟
        ctx.strokeStyle = 'rgba(200,200,200,0.4)'; ctx.lineWidth = 2;
        var smokeOffset = Math.sin(frameCount*0.03)*5;
        ctx.beginPath();
        ctx.moveTo(x+w*0.7+5, y-25);
        ctx.quadraticCurveTo(x+w*0.7+10+smokeOffset, y-35, x+w*0.7+5, y-42);
        ctx.stroke();

        // 门
        var dw = Math.max(24, w*0.24), dh = Math.max(40, h*0.52);
        var dx = x + (w-dw)/2, dy = y + h - dh;
        // 门洞（暖光）
        ctx.fillStyle = doorOpen > 0 ? 'rgba(255,200,100,'+(doorOpen*0.85)+')' : 'rgba(0,0,0,0.5)';
        ctx.fillRect(dx, dy, dw, dh);
        // 门板（向右滑开）
        ctx.fillStyle = '#6d4c41';
        var openOff = doorOpen * dw * 0.85;
        ctx.fillRect(dx + openOff, dy, dw - openOff*0.5, dh);
        // 门把手
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(dx + dw - openOff*0.5 - 5, dy + dh/2, 3, 3);

        // 窗户
        var ww = Math.max(18, w*0.18), wh = Math.max(16, h*0.2);
        var wy = y + 10;
        ctx.fillStyle = lit ? 'rgba(255,220,120,0.9)' : 'rgba(100,100,140,0.4)';
        ctx.fillRect(x+8, wy, ww, wh);
        ctx.fillRect(x+w-8-ww, wy, ww, wh);
        // 窗框十字
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x+8+ww/2, wy); ctx.lineTo(x+8+ww/2, wy+wh);
        ctx.moveTo(x+8, wy+wh/2); ctx.lineTo(x+8+ww, wy+wh/2);
        ctx.moveTo(x+w-8-ww/2, wy); ctx.lineTo(x+w-8-ww/2, wy+wh);
        ctx.moveTo(x+w-8-ww, wy+wh/2); ctx.lineTo(x+w-8, wy+wh/2);
        ctx.stroke();

        // 门前垫子
        ctx.fillStyle = '#880e4f';
        ctx.fillRect(dx-4, y+h, dw+8, 4);
    }

    // ===== 公交站牌 =====
    function drawBusStop(x, y) {
        ctx.fillStyle = '#555';
        ctx.fillRect(x, y, 3, 50);
        ctx.fillStyle = '#1976d2';
        roundRect(ctx, x-12, y-5, 27, 16, 3); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('BUS', x+1, y+7); ctx.textAlign = 'left';
    }

    // ===== 路灯 =====
    function drawStreetLamp(x, y) {
        ctx.fillStyle = '#444';
        ctx.fillRect(x, y-60, 3, 60);
        ctx.fillRect(x, y-60, 16, 3);
        // 灯泡
        ctx.fillStyle = 'rgba(255,235,150,0.9)';
        ctx.beginPath(); ctx.arc(x+16, y-57, 5, 0, Math.PI*2); ctx.fill();
        // 光晕
        ctx.fillStyle = 'rgba(255,235,150,0.08)';
        ctx.beginPath(); ctx.arc(x+16, y-57, 25, 0, Math.PI*2); ctx.fill();
    }

    // ===== 工具 =====
    function roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w/2, h/2);
        ctx.beginPath();
        ctx.moveTo(x+r, y);
        ctx.arcTo(x+w, y, x+w, y+h, r);
        ctx.arcTo(x+w, y+h, x, y+h, r);
        ctx.arcTo(x, y+h, x, y, r);
        ctx.arcTo(x, y, x+w, y, r);
        ctx.closePath();
    }

    // ===== 启动 =====
    document.addEventListener('DOMContentLoaded', init);
})();
