/**
 * 暮归 - 归途有光，片刻即安
 * 带怪兽战斗系统的关卡制归途游戏
 * 配置驱动版本 - 所有参数从mugui-config.json加载
 */
(function() {
    'use strict';

    // ===== 配置变量（从JSON加载）=====
    var LEVELS = [];
    var CONFIG = {};
    var WEAPON_TYPES = {};
    var FRAGMENT_TYPES = {};
    var OBSTACLE_TYPES = {};
    var MONSTER_TYPES = {};
    var SKY_COLORS = {};
    var WARM_STORIES = [];
    var gameConfig = null;  // 完整配置对象
    var configLoaded = false;  // 配置加载状态

    /**
     * 从配置项中提取实际值
     * 配置格式：{ value: X, comment_cn: "...", comment_en: "..." }
     */
    function getValue(configItem) {
        if (configItem && typeof configItem === 'object' && 'value' in configItem) {
            return configItem.value;
        }
        return configItem;
    }

    /**
     * 解析关卡配置
     */
    function parseLevelConfig(levelList) {
        return levelList.map(function(lvl) {
            var monsters = getValue(lvl.monsters) || [];
            return {
                id: lvl.id,
                name: lvl.name_cn || lvl.name_en || ('关卡' + lvl.id),
                distance: getValue(lvl.distance),
                speed: getValue(lvl.speed),
                monsters: monsters.map(function(m) {
                    return {
                        type: m.type,
                        startDistance: getValue(m.startDistance)
                    };
                })
            };
        });
    }

    /**
     * 解析武器配置
     */
    function parseWeaponConfig(weaponObj) {
        var result = {};
        Object.keys(weaponObj).forEach(function(key) {
            if (key.startsWith('_')) return;  // 跳过注释字段
            var w = weaponObj[key];
            result[key] = {
                name: w.name_cn || w.name_en || key,
                icon: w.icon,
                cost: getValue(w.cost),
                cooldown: getValue(w.cooldown),
                unlimited: getValue(w.unlimited),
                initialAmmo: getValue(w.initialAmmo),
                ammoCost: getValue(w.ammoCost),
                ammoPerPurchase: getValue(w.ammoPerPurchase),
                power: getValue(w.power),
                bulletSpeed: getValue(w.bulletSpeed),
                bulletSize: getValue(w.bulletSize),
                color: w.color,
                bulletsPerShot: getValue(w.bulletsPerShot)
            };
        });
        return result;
    }

    /**
     * 解析碎片配置
     */
    function parseFragmentConfig(fragmentObj) {
        var result = {};
        Object.keys(fragmentObj).forEach(function(key) {
            if (key.startsWith('_')) return;
            var f = fragmentObj[key];
            result[key] = {
                name: f.name_cn || f.name_en || key,
                icon: f.icon,
                probability: getValue(f.probability),
                score: getValue(f.score),
                color: f.color,
                radius: getValue(f.radius),
                glow: getValue(f.glow)
            };
        });
        return result;
    }

    /**
     * 解析障碍物配置
     */
    function parseObstacleConfig(obstacleObj) {
        var result = {};
        Object.keys(obstacleObj).forEach(function(key) {
            if (key.startsWith('_')) return;
            var o = obstacleObj[key];
            result[key] = {
                name: o.name_cn || o.name_en || key,
                probability: getValue(o.probability),
                speedReduce: getValue(o.speedReduce),
                duration: getValue(o.duration),
                color: o.color,
                width: getValue(o.width),
                height: getValue(o.height)
            };
        });
        return result;
    }

    /**
     * 解析怪兽配置
     */
    function parseMonsterConfig(monsterObj) {
        var result = {};
        Object.keys(monsterObj).forEach(function(key) {
            if (key.startsWith('_')) return;
            var m = monsterObj[key];
            result[key] = {
                name: m.name_cn || m.name_en || key,
                hp: getValue(m.hp),
                speed: getValue(m.speed),
                color: m.color,
                size: getValue(m.size),
                reward: getValue(m.reward)
            };
        });
        return result;
    }

    /**
     * 解析天空颜色配置
     */
    function parseSkyColorConfig(skyObj) {
        var result = {};
        Object.keys(skyObj).forEach(function(key) {
            if (key.startsWith('_')) return;
            var s = skyObj[key];
            // 移除注释字段
            if (s.start && s.end) {
                result[key] = {
                    start: s.start,
                    end: s.end
                };
            }
        });
        return result;
    }

    /**
     * 加载配置文件
     */
    async function loadConfig() {
        try {
            var response = await fetch('assets/config/mugui-config.json');
            if (!response.ok) {
                throw new Error('配置文件加载失败: ' + response.status);
            }
            gameConfig = await response.json();

            // 解析各模块配置
            LEVELS = parseLevelConfig(getValue(gameConfig.levels.list));
            CONFIG = {
                LANES: getValue(gameConfig.gameSettings.LANES),
                SPEED_MAX: getValue(gameConfig.gameSettings.SPEED_MAX),
                FRAGMENT_BASE_INTERVAL: getValue(gameConfig.gameSettings.FRAGMENT_BASE_INTERVAL),
                FRAGMENT_MIN_INTERVAL: getValue(gameConfig.gameSettings.FRAGMENT_MIN_INTERVAL),
                OBSTACLE_BASE_INTERVAL: getValue(gameConfig.gameSettings.OBSTACLE_BASE_INTERVAL),
                OBSTACLE_MIN_INTERVAL: getValue(gameConfig.gameSettings.OBSTACLE_MIN_INTERVAL)
            };
            WEAPON_TYPES = parseWeaponConfig(gameConfig.weapons);
            FRAGMENT_TYPES = parseFragmentConfig(gameConfig.fragments);
            OBSTACLE_TYPES = parseObstacleConfig(gameConfig.obstacles);
            MONSTER_TYPES = parseMonsterConfig(gameConfig.monsters);
            SKY_COLORS = parseSkyColorConfig(gameConfig.skyColors);
            WARM_STORIES = getValue(gameConfig.warmStories.list) || [];

            configLoaded = true;
            console.log('游戏配置加载成功:', gameConfig._comment);
            return true;
        } catch (error) {
            console.error('配置加载失败，使用默认配置:', error);
            // 使用默认配置（硬编码备份）
            loadDefaultConfig();
            return false;
        }
    }

    /**
     * 默认配置（配置文件加载失败时的备份）
     */
    function loadDefaultConfig() {
        LEVELS = [
            { id: 1, name: '初遇暮光', distance: 500, speed: 2.0, monsters: [{ type: 'level1', startDistance: 300 }] },
            { id: 2, name: '渐入暮色', distance: 1000, speed: 2.5, monsters: [{ type: 'level1', startDistance: 300 }, { type: 'level2', startDistance: 500 }] },
            { id: 3, name: '暮归之路', distance: 2000, speed: 3.0, monsters: [{ type: 'level1', startDistance: 300 }, { type: 'level2', startDistance: 500 }, { type: 'level3', startDistance: 1000 }] }
        ];
        CONFIG = { LANES: 3, SPEED_MAX: 6.0, FRAGMENT_BASE_INTERVAL: 1500, FRAGMENT_MIN_INTERVAL: 800, OBSTACLE_BASE_INTERVAL: 4000, OBSTACLE_MIN_INTERVAL: 2000 };
        WEAPON_TYPES = {
            bow: { name: '弓箭', icon: '🏹', cost: 300, cooldown: 2000, unlimited: true, initialAmmo: 0, ammoCost: 0, ammoPerPurchase: 0, power: 1, bulletSpeed: 600, bulletSize: 8, color: '#FFD700', bulletsPerShot: 1 },
            pistol: { name: '手枪', icon: '🔫', cost: 500, cooldown: 1000, unlimited: false, initialAmmo: 50, ammoCost: 10, ammoPerPurchase: 10, power: 1, bulletSpeed: 700, bulletSize: 6, color: '#FF6B4A', bulletsPerShot: 1 },
            smg: { name: '冲锋枪', icon: '🔫', cost: 800, cooldown: 500, unlimited: false, initialAmmo: 100, ammoCost: 100, ammoPerPurchase: 50, power: 1, bulletSpeed: 800, bulletSize: 5, color: '#4A6294', bulletsPerShot: 1 }
        };
        FRAGMENT_TYPES = {
            common: { name: '城市光影', icon: '🌆', probability: 0.70, score: 10, color: '#FFE49A', radius: 14, glow: 15 },
            rare: { name: '街角生灵', icon: '🐾', probability: 0.22, score: 30, color: '#FFD166', radius: 18, glow: 20 },
            epic: { name: '人间烟火', icon: '🏮', probability: 0.08, score: 50, color: '#FF6B4A', radius: 22, glow: 25 }
        };
        OBSTACLE_TYPES = {
            puddle: { name: '路面积水', probability: 0.50, speedReduce: 0.30, duration: 1000, color: 'rgba(100, 149, 237, 0.6)', width: 55, height: 15 },
            barrier: { name: '施工路障', probability: 0.30, speedReduce: 0.50, duration: 1500, color: '#FF6B35', width: 36, height: 40 },
            crowd: { name: '拥挤人群', probability: 0.20, speedReduce: 0.40, duration: 1200, color: '#808080', width: 44, height: 50 }
        };
        MONSTER_TYPES = {
            level1: { name: '迷雾游魂', hp: 2, speed: 1.0, color: '#8B4513', size: 50, reward: 20 },
            level2: { name: '暗影行者', hp: 3, speed: 1.3, color: '#4A4A6A', size: 60, reward: 40 },
            level3: { name: '暮色恶魔', hp: 5, speed: 1.6, color: '#1A1A2E', size: 70, reward: 80 }
        };
        SKY_COLORS = {
            level1: { start: { top: '#F47B4A', mid: '#FFD166', bottom: '#FFF8F0' }, end: { top: '#FF8C42', mid: '#FFB347', bottom: '#FFE4B5' } },
            level2: { start: { top: '#FF6B35', mid: '#FF8C42', bottom: '#FFD166' }, end: { top: '#4A6294', mid: '#6A7BA5', bottom: '#8EA4CC' } },
            level3: { start: { top: '#4A6294', mid: '#6A7BA5', bottom: '#8EA4CC' }, end: { top: '#1A1A2E', mid: '#2C3E6B', bottom: '#4A5568' } }
        };
        WARM_STORIES = [
            "街角那家面包店，今天也亮着暖黄色的灯。",
            "便利店门口的橘猫，用慵懒的眼神目送你。",
            "转角遇见多年不见的老同学，彼此都愣了一下。",
            "路灯下，有人在等你回家。",
            "远处的窗户里，有人正在做晚饭。",
            "公交站牌下，有人捧着一束花。",
            "路边的梧桐树，叶子正在轻轻飘落。",
            "街边的小摊，飘来熟悉的烤红薯香味。"
        ];
        configLoaded = true;
    }

    // ===== 游戏状态 =====
    var canvas, ctx;
    var gameState = 'menu';
    var currentLevel = 0;           // 当前关卡索引
    var levelDistance = 0;          // 当前关卡内距离
    var totalDistance = 0;          // 总距离（累计）
    var startTime = 0;
    var fragments = { common: 0, rare: 0, epic: 0 };
    var totalFragments = 0;
    var currentSpeed = 2.0;         // 根据关卡设置
    var speedMultiplier = 1.0;
    var speedReduceTimer = null;
    var roadOffset = 0;

    // 武器系统
    var weapon = {
        current: null,          // 当前选中的武器类型 (bow/pistol/smg)
        owned: {
            bow: false,
            pistol: false,
            smg: false
        },
        ammo: {
            bow: Infinity,      // 弓箭无限弹药
            pistol: 0,
            smg: 0
        },
        cooldown: 0,            // 当前冷却时间
        lastShootTime: 0        // 上次射击时间
    };

    // 怪兽系统
    var monsters = [];
    var monstersDefeated = 0;  // 击败怪兽数量

    // 碰撞动画状态
    var collisionAnimation = {
        active: false,
        startTime: 0,
        duration: 500,
        shakeOffset: { x: 0, y: 0 },
        flashOpacity: 0
    };

    // ===== 玩家 =====
    var player = {
        lane: 1,
        targetLane: 1,
        x: 0,
        y: 0,
        flashing: false,
        flashStartTime: 0,
        monsterCollisionCooldown: 0  // 怪兽碰撞冷却时间
    };

    // ===== 物体 =====
    var fragmentItems = [];
    var obstacles = [];
    var particles = [];
    var bullets = [];

    // ===== DOM =====
    var elements = {};

    // ===== 初始化 =====
    async function init() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');

        // 异步加载配置文件
        await loadConfig();

        elements = {
            distance: document.getElementById('distance'),
            fragmentCount: document.getElementById('fragmentCount'),
            gameOverlay: document.getElementById('gameOverlay'),
            resultOverlay: document.getElementById('resultOverlay'),
            startBtn: document.getElementById('startBtn'),
            retryBtn: document.getElementById('retryBtn'),
            mobileControls: document.getElementById('mobileControls'),
            controlLeft: document.getElementById('controlLeft'),
            controlRight: document.getElementById('controlRight'),
            finalTime: document.getElementById('finalTime'),
            commonFragments: document.getElementById('commonFragments'),
            rareFragments: document.getElementById('rareFragments'),
            epicFragments: document.getElementById('epicFragments'),
            warmStory: document.getElementById('warmStory'),
            // 武器面板相关元素
            buyBowBtn: document.getElementById('buyBowBtn'),
            buyPistolBtn: document.getElementById('buyPistolBtn'),
            buySmgBtn: document.getElementById('buySmgBtn'),
            buyPistolAmmoBtn: document.getElementById('buyPistolAmmoBtn'),
            buySmgAmmoBtn: document.getElementById('buySmgAmmoBtn'),
            currentWeaponSection: document.getElementById('currentWeaponSection'),
            currentWeaponName: document.getElementById('currentWeaponName'),
            currentWeaponAmmo: document.getElementById('currentWeaponAmmo'),
            weaponCooldown: document.getElementById('weaponCooldown'),
            monstersDefeated: document.getElementById('monstersDefeated'),
            currentFragments: document.getElementById('currentFragments')
        };

        setupCanvas();
        bindEvents();
        render();
    }

    // ===== 设置画布 =====
    function setupCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        player.x = canvas.width / 2;
        player.y = canvas.height * 0.78;
    }

    // ===== 绑定事件 =====
    function bindEvents() {
        elements.startBtn.addEventListener('click', startGame);
        elements.retryBtn.addEventListener('click', function() {
            elements.resultOverlay.style.display = 'none';
            startGame();
        });

        // 武器兑换/切换按钮
        if (elements.buyBowBtn) {
            elements.buyBowBtn.addEventListener('click', function() { selectWeapon('bow'); });
        }
        if (elements.buyPistolBtn) {
            elements.buyPistolBtn.addEventListener('click', function() { selectWeapon('pistol'); });
        }
        if (elements.buySmgBtn) {
            elements.buySmgBtn.addEventListener('click', function() { selectWeapon('smg'); });
        }

        // 弹药补给按钮
        if (elements.buyPistolAmmoBtn) {
            elements.buyPistolAmmoBtn.addEventListener('click', function() { buyAmmo('pistol'); });
        }
        if (elements.buySmgAmmoBtn) {
            elements.buySmgAmmoBtn.addEventListener('click', function() { buyAmmo('smg'); });
        }

        // 键盘控制
        document.addEventListener('keydown', function(e) {
            if (gameState !== 'playing') return;
            switch (e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    moveLeft();
                    break;
                case 'd':
                case 'arrowright':
                    moveRight();
                    break;
                case ' ':
                case 'j':
                    shoot();
                    break;
                case '1':
                    selectWeapon('bow');
                    break;
                case '2':
                    selectWeapon('pistol');
                    break;
                case '3':
                    selectWeapon('smg');
                    break;
            }
        });

        // 移动端控制
        if (elements.controlLeft) {
            elements.controlLeft.addEventListener('touchstart', function(e) {
                e.preventDefault();
                moveLeft();
            });
        }
        if (elements.controlRight) {
            elements.controlRight.addEventListener('touchstart', function(e) {
                e.preventDefault();
                moveRight();
            });
        }

        // 触摸滑动和点击射击
        var touchStartX = 0;
        var touchStartTime = 0;
        canvas.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartTime = Date.now();
        });
        canvas.addEventListener('touchend', function(e) {
            if (gameState !== 'playing') return;
            var diff = e.changedTouches[0].clientX - touchStartX;
            var timeDiff = Date.now() - touchStartTime;

            // 点击射击（短时间小位移）
            if (timeDiff < 200 && Math.abs(diff) < 10) {
                shoot();
            }
            // 滑动移动
            else if (Math.abs(diff) > 25) {
                if (diff > 0) moveRight();
                else moveLeft();
            }
        });

        window.addEventListener('resize', function() {
            setupCanvas();
            render();
        });
    }

    // ===== 购买武器（已废弃，使用selectWeapon替代）=====
    function buyWeapon(type) {
        // 统一使用selectWeapon处理购买和切换
        selectWeapon(type);
    }

    // ===== 购买弹药 =====
    function buyAmmo(type) {
        if (!weapon.owned[type]) return;
        var weaponConfig = WEAPON_TYPES[type];
        if (weaponConfig.unlimited) return;  // 弓箭不需要弹药
        if (totalFragments < weaponConfig.ammoCost) return;

        totalFragments -= weaponConfig.ammoCost;
        weapon.ammo[type] += weaponConfig.ammoPerPurchase;

        updateWeaponPanel();
    }

    // ===== 选择/切换武器 =====
    function selectWeapon(type) {
        var weaponConfig = WEAPON_TYPES[type];
        if (!weaponConfig) return;

        // 如果已经拥有该武器，直接切换并重置弹药
        if (weapon.owned[type]) {
            weapon.current = type;
            // 切换武器时重置弹药为目标武器的初始值
            if (!weaponConfig.unlimited) {
                weapon.ammo[type] = weaponConfig.initialAmmo;
            }
            updateWeaponPanel();
            return;
        }

        // 未拥有时，检查碎片是否足够购买
        if (totalFragments < weaponConfig.cost) return;

        // 扣减碎片购买武器
        totalFragments -= weaponConfig.cost;
        weapon.owned[type] = true;

        // 设置初始弹药
        if (!weaponConfig.unlimited) {
            weapon.ammo[type] = weaponConfig.initialAmmo;
        }

        // 切换到新武器
        weapon.current = type;

        updateWeaponPanel();
    }

    function moveLeft() {
        if (player.targetLane > 0) player.targetLane--;
    }

    function moveRight() {
        if (player.targetLane < CONFIG.LANES - 1) player.targetLane++;
    }

    // ===== 射击 =====
    function shoot() {
        if (!weapon.current) return;

        var weaponConfig = WEAPON_TYPES[weapon.current];
        if (!weaponConfig) return;

        // 检查冷却时间
        var now = Date.now();
        if (now - weapon.lastShootTime < weaponConfig.cooldown) return;

        // 检查弹药（弓箭无限制）
        var bulletsPerShot = weaponConfig.bulletsPerShot || 1;
        if (!weaponConfig.unlimited && weapon.ammo[weapon.current] < bulletsPerShot) return;

        weapon.lastShootTime = now;

        // 扣减弹药
        if (!weaponConfig.unlimited) {
            weapon.ammo[weapon.current] -= bulletsPerShot;
        }

        // 创建子弹
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / CONFIG.LANES;
        var bulletX = roadLeft + laneWidth * (player.lane + 0.5);

        // 根据武器类型发射不同数量的子弹
        for (var i = 0; i < bulletsPerShot; i++) {
            var offsetX = 0;
            if (bulletsPerShot > 1) {
                // 多发子弹时，左右散开
                offsetX = (i - (bulletsPerShot - 1) / 2) * 10;
            }

            bullets.push({
                x: bulletX + offsetX,
                y: player.y - 50 - (i * 5),  // 轻微上下错开
                speed: weaponConfig.bulletSpeed,
                power: weaponConfig.power,
                size: weaponConfig.bulletSize,
                color: weaponConfig.color,
                weaponType: weapon.current
            });
        }

        updateWeaponPanel();
    }

    // ===== 开始游戏 =====
    function startGame() {
        currentLevel = 0;
        levelDistance = 0;
        totalDistance = 0;
        startTime = Date.now();
        fragments = { common: 0, rare: 0, epic: 0 };
        totalFragments = 0;
        currentSpeed = LEVELS[0].speed;
        speedMultiplier = 1.0;
        roadOffset = 0;
        fragmentItems = [];
        obstacles = [];
        monsters = [];
        particles = [];
        bullets = [];

        // 重置武器
        weapon = {
            current: null,
            owned: { bow: false, pistol: false, smg: false },
            ammo: { bow: Infinity, pistol: 0, smg: 0 },
            cooldown: 0,
            lastShootTime: 0
        };

        elements.fragmentCount.textContent = '0';
        elements.gameOverlay.style.display = 'none';

        if (window.innerWidth <= 768 && elements.mobileControls) {
            elements.mobileControls.style.display = 'flex';
        }

        gameState = 'playing';
        player.lane = 1;
        player.targetLane = 1;
        requestAnimationFrame(gameLoop);
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
        // 获取当前关卡配置
        var level = LEVELS[currentLevel];
        if (!level) {
            // 所有关卡完成
            arriveHome();
            return;
        }

        // 设置当前关卡速度
        currentSpeed = level.speed;

        // 应用速度倍率
        var actualSpeed = currentSpeed * speedMultiplier;
        levelDistance += actualSpeed * dt;
        totalDistance += actualSpeed * dt;

        // 更新UI
        var remainingDistance = Math.max(0, Math.floor(level.distance - levelDistance));
        elements.distance.textContent = remainingDistance.toLocaleString();
        elements.fragmentCount.textContent = totalFragments;

        // 检查关卡完成
        if (levelDistance >= level.distance) {
            currentLevel++;
            levelDistance = 0;

            // 检查是否所有关卡完成
            if (currentLevel >= LEVELS.length) {
                arriveHome();
                return;
            }

            // 显示关卡过渡
            showLevelTransition();
        }

        // 更新玩家位置
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / CONFIG.LANES;
        var targetX = roadLeft + laneWidth * (player.targetLane + 0.5);
        player.x += (targetX - player.x) * 0.15;
        player.lane = player.targetLane;

        // 更新武器冷却
        if (weapon.cooldown > 0) {
            weapon.cooldown -= dt * 1000;
        }

        // 更新玩家怪兽碰撞冷却
        if (player.monsterCollisionCooldown > 0) {
            player.monsterCollisionCooldown -= dt * 1000;
        }

        // 道路滚动
        roadOffset += actualSpeed * 50 * dt;

        // 生成温暖碎片
        var level = LEVELS[currentLevel];
        if (level) {
            var fragmentInterval = CONFIG.FRAGMENT_BASE_INTERVAL - (CONFIG.FRAGMENT_BASE_INTERVAL - CONFIG.FRAGMENT_MIN_INTERVAL) * (levelDistance / level.distance);
            if (Math.random() < (dt * 1000 / fragmentInterval) && fragmentItems.length < 4) {
                spawnFragment();
            }

            // 生成障碍物（仅在关卡前半段）
            if (levelDistance < level.distance * 0.5) {
                var obstacleInterval = CONFIG.OBSTACLE_BASE_INTERVAL - (CONFIG.OBSTACLE_BASE_INTERVAL - CONFIG.OBSTACLE_MIN_INTERVAL) * (levelDistance / level.distance);
                // 增加路障密度，最多3个同时存在
                if (Math.random() < (dt * 1000 / obstacleInterval) && obstacles.length < 3) {
                    spawnObstacle();
                }
            }

            // 生成怪兽（根据关卡配置）
            if (monsters.length < 2 && Math.random() < 0.02) {
                var canSpawn = level.monsters.some(function(m) {
                    return levelDistance >= m.startDistance;
                });
                if (canSpawn) {
                    spawnMonster();
                }
            }
        }

        // 更新碎片和障碍物位置
        var moveSpeed = actualSpeed * 60 * dt;
        fragmentItems.forEach(function(frag) { frag.z += moveSpeed; frag.glow += dt * 3; });
        fragmentItems = fragmentItems.filter(function(frag) { return frag.z < canvas.height + 100 && !frag.collected; });

        obstacles.forEach(function(obs) { obs.z += moveSpeed; });
        obstacles = obstacles.filter(function(obs) { return obs.z < canvas.height + 100; });

        // 更新怪兽
        updateMonsters(dt, actualSpeed);

        // 更新子弹
        updateBullets(dt);

        // 更新粒子
        updateParticles(dt);

        // 更新碰撞动画
        updateCollisionAnimation(dt);

        // 碰撞检测
        checkCollisions();
    }

    // ===== 生成怪兽 =====
    function spawnMonster() {
        // 根据当前关卡配置确定怪兽类型
        var level = LEVELS[currentLevel];
        if (!level) return;

        // 找出当前距离可以出现的怪兽类型
        var availableMonsters = [];
        level.monsters.forEach(function(monsterConfig) {
            if (levelDistance >= monsterConfig.startDistance) {
                availableMonsters.push(monsterConfig.type);
            }
        });

        if (availableMonsters.length === 0) return;

        // 随机选择一种怪兽
        var type = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
        var monsterType = MONSTER_TYPES[type];
        var lane = Math.floor(Math.random() * CONFIG.LANES);

        monsters.push({
            type: type,
            lane: lane,
            z: -80,
            hp: monsterType.hp,
            maxHp: monsterType.hp,
            speed: monsterType.speed,
            alive: true
        });
    }

    // ===== 更新怪兽 =====
    function updateMonsters(dt, actualSpeed) {
        var moveSpeed = actualSpeed * 60 * dt;

        monsters.forEach(function(monster) {
            if (monster.alive) {
                monster.z += moveSpeed * monster.speed;
                // 怪兽不切换车道，保持生成时的车道
            }
        });

        monsters = monsters.filter(function(m) { return m.alive && m.z < canvas.height + 100; });
    }

    // ===== 更新子弹 =====
    function updateBullets(dt) {
        bullets.forEach(function(bullet) {
            bullet.y -= bullet.speed * dt;
        });

        bullets = bullets.filter(function(b) { return b.y > -50; });

        // 子弹碰撞检测（与怪兽）
        bullets.forEach(function(bullet) {
            var roadWidth = canvas.width * 0.4;
            var roadLeft = (canvas.width - roadWidth) / 2;
            var laneWidth = roadWidth / CONFIG.LANES;

            monsters.forEach(function(monster) {
                if (!monster.alive) return;

                var monsterX = roadLeft + laneWidth * (monster.lane + 0.5);
                var monsterY = monster.z;

                var dx = Math.abs(bullet.x - monsterX);
                var dy = Math.abs(bullet.y - monsterY);

                if (dx < 30 && dy < 40) {
                    // 击中怪兽
                    monster.hp -= bullet.power;
                    bullet.y = -100; // 移除子弹

                    // 创建击中粒子
                    for (var i = 0; i < 8; i++) {
                        particles.push({
                            x: monsterX,
                            y: monsterY,
                            vx: (Math.random() - 0.5) * 150,
                            vy: (Math.random() - 0.5) * 150,
                            life: 0.6,
                            maxLife: 0.6,
                            alpha: 1,
                            color: MONSTER_TYPES[monster.type].color,
                            type: 'hit'
                        });
                    }

                    if (monster.hp <= 0) {
                        monster.alive = false;
                        monstersDefeated++;  // 增加击败计数
                        // 奖励碎片
                        totalFragments += MONSTER_TYPES[monster.type].reward;
                        createMonsterDefeatEffect(monsterX, monsterY);
                        updateWeaponPanel();  // 更新面板
                    }
                }
            });
        });
    }

    // ===== 怪兽击败特效 =====
    function createMonsterDefeatEffect(x, y) {
        for (var i = 0; i < 20; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 1.2,
                maxLife: 1.2,
                alpha: 1,
                color: '#FFD700',
                type: 'defeat'
            });
        }
    }

    // ===== 显示消息 =====
    var messageTimer = null;
    function showMessage(text) {
        // 简单的消息提示（可以后续优化）
        console.log(text);
    }

    // ===== 显示关卡过渡 =====
    var levelTransitionActive = false;
    var levelTransitionStart = 0;
    function showLevelTransition() {
        levelTransitionActive = true;
        levelTransitionStart = Date.now();
    }

    // ===== 生成温暖碎片 =====
    function spawnFragment() {
        var lane = Math.floor(Math.random() * CONFIG.LANES);

        // 根据概率选择碎片类型
        var rand = Math.random();
        var type;
        if (rand < FRAGMENT_TYPES.common.probability) {
            type = 'common';
        } else if (rand < FRAGMENT_TYPES.common.probability + FRAGMENT_TYPES.rare.probability) {
            type = 'rare';
        } else {
            type = 'epic';
        }

        fragmentItems.push({
            lane: lane,
            z: -50,
            type: type,
            collected: false,
            glow: Math.random() * Math.PI * 2
        });
    }

    // ===== 生成障碍物 =====
    function spawnObstacle() {
        // 选择车道，避免在同一车道连续生成
        var availableLanes = [0, 1, 2];

        // 移除已有障碍物的车道
        obstacles.forEach(function(obs) {
            if (obs.z < 200) { // 只考虑接近的障碍物
                var index = availableLanes.indexOf(obs.lane);
                if (index > -1) {
                    availableLanes.splice(index, 1);
                }
            }
        });

        if (availableLanes.length === 0) return; // 所有车道都被占用

        var lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

        // 根据概率选择障碍物类型
        var rand = Math.random();
        var type;
        if (rand < OBSTACLE_TYPES.puddle.probability) {
            type = 'puddle';
        } else if (rand < OBSTACLE_TYPES.puddle.probability + OBSTACLE_TYPES.barrier.probability) {
            type = 'barrier';
        } else {
            type = 'crowd';
        }

        obstacles.push({
            lane: lane,
            z: -50,
            type: type
        });
    }

    // ===== 更新粒子 =====
    function updateParticles(dt) {
        particles.forEach(function(p) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            p.alpha = Math.max(0, p.life / p.maxLife);
        });
        particles = particles.filter(function(p) { return p.life > 0; });
    }

    // ===== 更新碰撞动画 =====
    function updateCollisionAnimation(dt) {
        if (collisionAnimation.active) {
            var elapsed = Date.now() - collisionAnimation.startTime;
            var progress = Math.min(elapsed / collisionAnimation.duration, 1);

            // 屏幕震动效果（衰减）
            if (progress < 0.3) {
                var shakeIntensity = 10 * (1 - progress / 0.3);
                collisionAnimation.shakeOffset.x = (Math.random() - 0.5) * shakeIntensity;
                collisionAnimation.shakeOffset.y = (Math.random() - 0.5) * shakeIntensity;
            } else {
                collisionAnimation.shakeOffset.x = 0;
                collisionAnimation.shakeOffset.y = 0;
            }

            // 屏幕闪光效果
            if (progress < 0.5) {
                collisionAnimation.flashOpacity = 0.3 * (1 - progress / 0.5);
            } else {
                collisionAnimation.flashOpacity = 0;
            }

            // 玩家闪烁效果
            if (player.flashing) {
                var flashElapsed = Date.now() - player.flashStartTime;
                if (flashElapsed > 800) {
                    player.flashing = false;
                }
            }

            if (progress >= 1) {
                collisionAnimation.active = false;
            }
        }
    }

    // ===== 碰撞检测 =====
    function checkCollisions() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / CONFIG.LANES;

        // 检测碎片收集
        fragmentItems.forEach(function(frag) {
            if (!frag.collected && frag.lane === player.lane && frag.z > player.y - 60 && frag.z < player.y + 20) {
                frag.collected = true;
                fragments[frag.type]++;
                totalFragments += FRAGMENT_TYPES[frag.type].score;
                createFragmentCollectEffect(frag);
                updateWeaponPanel();  // 更新面板
            }
        });

        // 检测障碍物碰撞（仅在关卡前半段）
        var level = LEVELS[currentLevel];
        if (level && levelDistance < level.distance * 0.5) {
            obstacles.forEach(function(obs) {
                if (obs.lane === player.lane && obs.z > player.y - 60 && obs.z < player.y + 20) {
                    hitObstacle(obs.type);
                }
            });
        }

        // 检测怪兽碰撞（带冷却时间）
        if (player.monsterCollisionCooldown <= 0) {
            monsters.forEach(function(monster) {
                if (monster.alive && monster.lane === player.lane && monster.z > player.y - 60 && monster.z < player.y + 20) {
                    hitMonster(monster);
                }
            });
        }
    }

    // ===== 碰撞障碍物 =====
    function hitObstacle(type) {
        var obsType = OBSTACLE_TYPES[type];

        // 应用减速效果
        speedMultiplier = 1.0 - obsType.speedReduce;

        // 清除之前的恢复计时器
        if (speedReduceTimer) {
            clearTimeout(speedReduceTimer);
        }

        // 设置新的恢复计时器
        speedReduceTimer = setTimeout(function() {
            speedMultiplier = 1.0;
            speedReduceTimer = null;
        }, obsType.duration);

        // 触发玩家闪烁（800ms）
        player.flashing = true;
        player.flashStartTime = Date.now();

        // 创建碰撞粒子效果
        createCollisionParticles(type);

        // 移除障碍物避免重复碰撞
        obstacles = obstacles.filter(function(obs) {
            return !(obs.type === type && obs.z > player.y - 60 && obs.z < player.y + 20);
        });
    }

    // ===== 碰撞怪兽 =====
    function hitMonster(monster) {
        // 设置碰撞冷却时间（1500ms内不重复碰撞）
        player.monsterCollisionCooldown = 1500;

        // 应用严重减速效果（持续3秒）
        speedMultiplier = 0.1;

        // 清除之前的恢复计时器
        if (speedReduceTimer) {
            clearTimeout(speedReduceTimer);
        }

        // 第一阶段恢复：1秒后恢复到50%
        speedReduceTimer = setTimeout(function() {
            speedMultiplier = 0.5;
        }, 1000);

        // 第二阶段恢复：再过2秒后完全恢复
        setTimeout(function() {
            if (speedReduceTimer) {
                speedMultiplier = 1.0;
                speedReduceTimer = null;
            }
        }, 3000);

        // 触发碰撞动画
        if (!collisionAnimation.active) {
            collisionAnimation.active = true;
            collisionAnimation.startTime = Date.now();
            collisionAnimation.duration = 800;

            // 触发玩家闪烁
            player.flashing = true;
            player.flashStartTime = Date.now();

            // 创建怪兽碰撞粒子效果
            createMonsterCollisionParticles(monster);
        }
    }

    // ===== 创建碎片收集特效 =====
    function createFragmentCollectEffect(frag) {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / CONFIG.LANES;
        var x = roadLeft + laneWidth * (frag.lane + 0.5);

        var fragType = FRAGMENT_TYPES[frag.type];
        var particleCount = frag.type === 'epic' ? 20 : (frag.type === 'rare' ? 12 : 6);

        for (var i = 0; i < particleCount; i++) {
            particles.push({
                x: x,
                y: frag.z,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 1,
                maxLife: 1,
                alpha: 1,
                color: fragType.color,
                type: 'star'
            });
        }
    }

    // ===== 创建碰撞粒子效果 =====
    function createCollisionParticles(type) {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / CONFIG.LANES;
        var x = roadLeft + laneWidth * (player.lane + 0.5);
        var y = player.y;

        var particleCount = 15;
        var particleColor = type === 'puddle' ? '#6495ED' : (type === 'barrier' ? '#FF6B35' : '#808080');

        for (var i = 0; i < particleCount; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                life: 0.8,
                maxLife: 0.8,
                alpha: 1,
                color: particleColor,
                type: 'collision'
            });
        }
    }

    // ===== 创建怪兽碰撞粒子效果 =====
    function createMonsterCollisionParticles(monster) {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / CONFIG.LANES;
        var x = roadLeft + laneWidth * (player.lane + 0.5);
        var y = player.y;

        var monsterType = MONSTER_TYPES[monster.type];

        // 创建暗红色粒子（表示伤害）
        for (var i = 0; i < 25; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 250,
                vy: (Math.random() - 0.5) * 250,
                life: 1.2,
                maxLife: 1.2,
                alpha: 1,
                color: monsterType.color,
                type: 'monster_collision'
            });
        }

        // 添加白色闪光粒子
        for (var i = 0; i < 10; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150,
                life: 0.6,
                maxLife: 0.6,
                alpha: 1,
                color: '#FFFFFF',
                type: 'monster_collision'
            });
        }
    }

    // ===== 到家 =====
    function arriveHome() {
        gameState = 'ended';

        var elapsed = Date.now() - startTime;
        var minutes = Math.floor(elapsed / 60000);
        var seconds = Math.floor((elapsed % 60000) / 1000);
        elements.finalTime.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

        elements.commonFragments.textContent = '× ' + fragments.common;
        elements.rareFragments.textContent = '× ' + fragments.rare;
        elements.epicFragments.textContent = '× ' + fragments.epic;

        var randomStory = WARM_STORIES[Math.floor(Math.random() * WARM_STORIES.length)];
        elements.warmStory.textContent = '"' + randomStory + '"';

        elements.resultOverlay.style.display = 'flex';
        if (elements.mobileControls) {
            elements.mobileControls.style.display = 'none';
        }
    }

    // ===== 渲染 =====
    function render() {
        // 应用屏幕震动偏移
        ctx.save();
        if (collisionAnimation.active) {
            ctx.translate(collisionAnimation.shakeOffset.x, collisionAnimation.shakeOffset.y);
        }

        drawSkyLayer();
        drawPerspectiveRoad();
        drawObjects();
        drawMonsters();
        drawBullets();
        drawParticles();
        drawPlayer();
        drawProgressBar();
        drawWeaponUI();

        // 绘制碰撞闪光效果
        if (collisionAnimation.flashOpacity > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, ' + collisionAnimation.flashOpacity + ')';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 绘制关卡过渡效果
        if (levelTransitionActive) {
            drawLevelTransition();
        }

        ctx.restore();
    }

    // ===== 绘制关卡过渡 =====
    function drawLevelTransition() {
        var elapsed = Date.now() - levelTransitionStart;
        var duration = 2000; // 2秒过渡时间

        if (elapsed > duration) {
            levelTransitionActive = false;
            return;
        }

        var level = LEVELS[currentLevel];
        if (!level) return;

        // 淡入淡出效果
        var alpha;
        if (elapsed < 500) {
            alpha = elapsed / 500;
        } else if (elapsed > 1500) {
            alpha = (duration - elapsed) / 500;
        } else {
            alpha = 1;
        }

        // 半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, ' + (alpha * 0.6) + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 关卡名称
        ctx.fillStyle = 'rgba(255, 215, 0, ' + alpha + ')';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('第' + level.id + '关', canvas.width / 2, canvas.height / 2 - 30);

        ctx.font = '24px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
        ctx.fillText(level.name, canvas.width / 2, canvas.height / 2 + 10);
    }

    // ===== 绘制天空层（动态渐变） =====
    function drawSkyLayer() {
        var level = LEVELS[currentLevel];
        if (!level) return;

        // 根据关卡选择颜色配置
        var levelKey = 'level' + level.id;
        var levelColors = SKY_COLORS[levelKey];
        if (!levelColors) levelColors = SKY_COLORS.level1;

        // 计算关卡内进度
        var progress = Math.min(levelDistance / level.distance, 1);

        // 插值计算天空颜色
        function lerpColor(startColor, endColor, t) {
            var start = hexToRgb(startColor);
            var end = hexToRgb(endColor);
            var r = Math.round(start.r + (end.r - start.r) * t);
            var g = Math.round(start.g + (end.g - start.g) * t);
            var b = Math.round(start.b + (end.b - start.b) * t);
            return 'rgb(' + r + ',' + g + ',' + b + ')';
        }

        var topColor = lerpColor(levelColors.start.top, levelColors.end.top, progress);
        var midColor = lerpColor(levelColors.start.mid, levelColors.end.mid, progress);
        var bottomColor = lerpColor(levelColors.start.bottom, levelColors.end.bottom, progress);

        var gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(0.5, midColor);
        gradient.addColorStop(1, bottomColor);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 关卡3夜晚时添加星星
        if (level.id === 3 && progress > 0.5) {
            var starAlpha = (progress - 0.5) * 2;
            for (var i = 0; i < 30; i++) {
                var x = (Math.sin(i * 7.3) * 0.5 + 0.5) * canvas.width;
                var y = (Math.cos(i * 5.7) * 0.3 + 0.2) * canvas.height * 0.6;
                var size = Math.random() * 2 + 1;
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (starAlpha * 0.8) + ')';
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // 接近终点时添加月亮
        if (progress > 0.8) {
            ctx.fillStyle = '#F0E68C';
            ctx.shadowColor = 'rgba(240, 230, 140, 0.8)';
            ctx.shadowBlur = 30;
            ctx.beginPath();
            ctx.arc(canvas.width * 0.85, canvas.height * 0.15, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // ===== 十六进制转RGB =====
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // ===== 绘制道路 =====
    function drawPerspectiveRoad() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var roadRight = roadLeft + roadWidth;
        var laneWidth = roadWidth / CONFIG.LANES;

        // 计算总进度
        var totalLevelsDistance = LEVELS.reduce(function(sum, l) { return sum + l.distance; }, 0);
        var progress = Math.min(totalDistance / totalLevelsDistance, 1);

        // 道路主体
        var roadColor = lerpColor('#C4B07A', '#1A1A4F', progress);
        ctx.fillStyle = roadColor;
        ctx.fillRect(roadLeft, 0, roadWidth, canvas.height);

        // 虚化边缘
        var groundColor = lerpColor('#E8D4A0', '#0A0A2F', progress);
        ctx.fillStyle = groundColor;
        ctx.fillRect(roadLeft - 40, 0, 40, canvas.height);
        ctx.fillRect(roadRight, 0, 40, canvas.height);

        // 渐变融合
        var leftBlur = ctx.createLinearGradient(roadLeft - 60, 0, roadLeft, 0);
        leftBlur.addColorStop(0, 'rgba(0,0,0,0)');
        leftBlur.addColorStop(0.5, groundColor);
        leftBlur.addColorStop(1, roadColor);
        ctx.fillStyle = leftBlur;
        ctx.fillRect(roadLeft - 60, 0, 60, canvas.height);

        var rightBlur = ctx.createLinearGradient(roadRight, 0, roadRight + 60, 0);
        rightBlur.addColorStop(0, roadColor);
        rightBlur.addColorStop(0.5, groundColor);
        rightBlur.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightBlur;
        ctx.fillRect(roadRight, 0, 60, canvas.height);

        // 车道分隔线（向下滚动）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([25, 20]);

        var lineOffset = roadOffset % 45;
        for (var i = 1; i < CONFIG.LANES; i++) {
            var x = roadLeft + i * laneWidth;
            ctx.beginPath();
            ctx.moveTo(x, lineOffset);
            ctx.lineTo(x, canvas.height + 45);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // 道路边缘线
        ctx.strokeStyle = lerpColor('#F0E68C', '#4169E1', progress);
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
        var laneWidth = roadWidth / CONFIG.LANES;

        var allObjects = obstacles.map(function(obs) {
            return { type: 'obstacle', subType: obs.type, lane: obs.lane, z: obs.z };
        }).concat(fragmentItems.map(function(frag) {
            return { type: 'fragment', subType: frag.type, lane: frag.lane, z: frag.z, collected: frag.collected, glow: frag.glow };
        }));

        allObjects.sort(function(a, b) { return b.z - a.z; });

        allObjects.forEach(function(obj) {
            var x = roadLeft + laneWidth * (obj.lane + 0.5);
            var y = obj.z;

            if (obj.type === 'fragment' && !obj.collected) {
                drawFragment(x, y, obj.subType, obj.glow);
            } else if (obj.type === 'obstacle') {
                drawObstacle(x, y, obj.subType);
            }
        });
    }

    // ===== 绘制怪兽 =====
    function drawMonsters() {
        var roadWidth = canvas.width * 0.4;
        var roadLeft = (canvas.width - roadWidth) / 2;
        var laneWidth = roadWidth / CONFIG.LANES;

        monsters.forEach(function(monster) {
            if (!monster.alive) return;

            var x = roadLeft + laneWidth * (monster.lane + 0.5);
            var y = monster.z;
            var monsterType = MONSTER_TYPES[monster.type];

            // 怪兽阴影
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(x, y + 10, monsterType.size * 0.5, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // 怪兽主体（简化为圆形）
            ctx.fillStyle = monsterType.color;
            ctx.shadowColor = monsterType.color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(x, y - monsterType.size * 0.3, monsterType.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 怪兽眼睛（红色发光）
            ctx.fillStyle = '#FF0000';
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x - 8, y - monsterType.size * 0.4, 5, 0, Math.PI * 2);
            ctx.arc(x + 8, y - monsterType.size * 0.4, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 血条
            var hpBarWidth = monsterType.size;
            var hpBarHeight = 6;
            var hpBarX = x - hpBarWidth / 2;
            var hpBarY = y - monsterType.size;

            // 血条背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

            // 血条
            var hpRatio = monster.hp / monster.maxHp;
            ctx.fillStyle = hpRatio > 0.5 ? '#00FF00' : (hpRatio > 0.25 ? '#FFFF00' : '#FF0000');
            ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight);
        });
    }

    // ===== 绘制子弹 =====
    function drawBullets() {
        bullets.forEach(function(bullet) {
            var size = bullet.size || 6;
            var color = bullet.color || '#FFD700';

            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0;
    }

    // ===== 绘制温暖碎片 =====
    function drawFragment(x, y, type, glow) {
        var fragType = FRAGMENT_TYPES[type];
        var pulse = Math.sin(glow) * 3;
        var radius = fragType.radius + pulse;

        // 外发光
        ctx.shadowColor = fragType.color;
        ctx.shadowBlur = fragType.glow + pulse;

        // 碎片主体（光点）
        var gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.5, fragType.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // 稀有和极稀有碎片的特殊效果
        if (type === 'rare' || type === 'epic') {
            // 星形粒子环绕
            var starCount = type === 'epic' ? 6 : 4;
            for (var i = 0; i < starCount; i++) {
                var angle = (glow + i * Math.PI * 2 / starCount);
                var starX = x + Math.cos(angle) * (radius + 5);
                var starY = y + Math.sin(angle) * (radius + 5);
                ctx.fillStyle = fragType.color;
                ctx.beginPath();
                ctx.arc(starX, starY, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;
    }

    // ===== 绘制障碍物 =====
    function drawObstacle(x, y, type) {
        var obsType = OBSTACLE_TYPES[type];

        if (type === 'puddle') {
            // 水坑
            ctx.fillStyle = obsType.color;
            ctx.beginPath();
            ctx.ellipse(x, y, obsType.width / 2, obsType.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // 反光
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.ellipse(x - obsType.width / 4, y - obsType.height / 4, obsType.width / 4, obsType.height / 4, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'barrier') {
            // 路障锥
            ctx.fillStyle = '#FF6B35';
            ctx.beginPath();
            ctx.moveTo(x, y - obsType.height);
            ctx.lineTo(x + obsType.width / 2, y);
            ctx.lineTo(x - obsType.width / 2, y);
            ctx.closePath();
            ctx.fill();

            // 条纹
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(x - obsType.width / 3, y - obsType.height * 0.3, obsType.width * 0.66, 5);
        } else if (type === 'crowd') {
            // 人群（三个简化人形）
            for (var i = 0; i < 3; i++) {
                var personX = x - obsType.width / 3 + i * obsType.width / 3;
                var personY = y;

                // 身体
                ctx.fillStyle = ['#FF6B6B', '#4ECDC4', '#45B7D1'][i];
                ctx.fillRect(personX - 5, personY - 30, 10, 25);

                // 头
                ctx.fillStyle = '#FFE4C4';
                ctx.beginPath();
                ctx.arc(personX, personY - 35, 8, 0, Math.PI * 2);
                ctx.fill();

                // 腿
                ctx.fillStyle = '#34495E';
                ctx.fillRect(personX - 5, personY - 5, 4, 10);
                ctx.fillRect(personX + 1, personY - 5, 4, 10);
            }
        }
    }

    // ===== 绘制粒子 =====
    function drawParticles() {
        particles.forEach(function(p) {
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;

            // 星形粒子
            ctx.beginPath();
            for (var i = 0; i < 5; i++) {
                var angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                var outerX = p.x + Math.cos(angle) * 6;
                var outerY = p.y + Math.sin(angle) * 6;
                if (i === 0) {
                    ctx.moveTo(outerX, outerY);
                } else {
                    ctx.lineTo(outerX, outerY);
                }
            }
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 1;
        });
    }

    // ===== 绘制玩家 =====
    function drawPlayer() {
        var x = player.x;
        var y = player.y;

        // 玩家闪烁效果
        if (player.flashing) {
            var flashElapsed = Date.now() - player.flashStartTime;

            // 800ms后停止闪烁
            if (flashElapsed > 800) {
                player.flashing = false;
            } else {
                // 闪烁时跳过绘制（每100ms切换一次）
                var flashInterval = Math.floor(flashElapsed / 100);
                if (flashInterval % 2 === 0) {
                    return;
                }
            }
        }

        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 腿（行走动画）
        var legOffset = Math.sin(Date.now() / 80) * 8;
        ctx.fillStyle = '#34495E';
        ctx.fillRect(x - 10, y, 8, 15 + legOffset);
        ctx.fillRect(x + 2, y, 8, 15 - legOffset);

        // 身体
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(x - 12, y - 35, 24, 35);

        // 衣服
        ctx.fillStyle = '#F47B4A';
        ctx.fillRect(x - 10, y - 33, 20, 20);

        // 头
        ctx.fillStyle = '#FFE4C4';
        ctx.beginPath();
        ctx.arc(x, y - 45, 12, 0, Math.PI * 2);
        ctx.fill();

        // 头发
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(x, y - 49, 12, Math.PI, 2 * Math.PI);
        ctx.fill();

        // 包（归家行囊）
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x + 15, y - 25, 12, 18);
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 15, y - 25, 12, 18);

        // 如果有武器，绘制武器指示
        if (weapon.owned) {
            ctx.fillStyle = '#FFD700';
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x + 15, y - 35, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // ===== 绘制进度条 =====
    function drawProgressBar() {
        var level = LEVELS[currentLevel];
        if (!level) return;

        var progress = Math.min(levelDistance / level.distance, 1);

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, canvas.width, 6);

        // 进度
        var gradient = ctx.createLinearGradient(0, 0, canvas.width * progress, 0);
        gradient.addColorStop(0, '#F47B4A');
        gradient.addColorStop(1, '#FFD166');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width * progress, 6);

        // 关卡标记
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('关卡 ' + level.id + ': ' + level.name, 5, 14);
    }

    // ===== 绘制武器UI =====
    function drawWeaponUI() {
        // 武器UI现在主要在右侧面板显示，这里只保留简单的Canvas提示

        // 如果没有武器且怪兽可以出现，提示玩家兑换武器
        var level = LEVELS[currentLevel];
        if (!weapon.current && level) {
            var canMonsterSpawn = level.monsters.some(function(m) {
                return levelDistance >= m.startDistance;
            });
            if (canMonsterSpawn) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('💡 在右侧面板兑换武器', canvas.width / 2, 30);
            }
        }
    }

    // ===== 颜色插值辅助函数 =====
    function lerpColor(startHex, endHex, t) {
        var start = hexToRgb(startHex);
        var end = hexToRgb(endHex);
        var r = Math.round(start.r + (end.r - start.r) * t);
        var g = Math.round(start.g + (end.g - start.g) * t);
        var b = Math.round(start.b + (end.b - start.b) * t);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    // ===== 更新武器面板 =====
    function updateWeaponPanel() {
        // 更新战斗统计
        if (elements.monstersDefeated) {
            elements.monstersDefeated.textContent = monstersDefeated;
        }
        if (elements.currentFragments) {
            elements.currentFragments.textContent = totalFragments;
        }

        // 更新武器按钮状态
        var weaponTypes = ['bow', 'pistol', 'smg'];
        weaponTypes.forEach(function(type) {
            var btn = elements['buy' + type.charAt(0).toUpperCase() + type.slice(1) + 'Btn'];
            if (btn) {
                if (weapon.owned[type]) {
                    btn.classList.add('owned');
                    if (weapon.current === type) {
                        btn.classList.add('selected');
                    } else {
                        btn.classList.remove('selected');
                    }
                } else {
                    btn.classList.remove('owned', 'selected');
                }
            }
        });

        // 更新弹药补给按钮可见性
        if (elements.buyPistolAmmoBtn) {
            elements.buyPistolAmmoBtn.style.display = weapon.owned.pistol ? 'block' : 'none';
        }
        if (elements.buySmgAmmoBtn) {
            elements.buySmgAmmoBtn.style.display = weapon.owned.smg ? 'block' : 'none';
        }

        // 更新当前武器显示
        if (elements.currentWeaponSection) {
            elements.currentWeaponSection.style.display = weapon.current ? 'block' : 'none';
        }
        if (weapon.current) {
            var weaponConfig = WEAPON_TYPES[weapon.current];
            if (elements.currentWeaponName) {
                elements.currentWeaponName.textContent = weaponConfig.icon + ' ' + weaponConfig.name;
            }
            if (elements.currentWeaponAmmo) {
                if (weaponConfig.unlimited) {
                    elements.currentWeaponAmmo.textContent = '∞';
                } else {
                    elements.currentWeaponAmmo.textContent = weapon.ammo[weapon.current];
                }
            }
            if (elements.weaponCooldown) {
                var now = Date.now();
                var timeSinceLastShoot = now - weapon.lastShootTime;
                var cooldownRemaining = weaponConfig.cooldown - timeSinceLastShoot;
                if (cooldownRemaining > 0) {
                    elements.weaponCooldown.textContent = Math.ceil(cooldownRemaining / 1000) + '秒';
                } else {
                    elements.weaponCooldown.textContent = '就绪';
                }
            }
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();