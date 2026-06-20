/**
 * 足球竞猜 - 优先基于 OpenFootball 真实交战数据，降级到种子化随机模型
 *
 * 核心流程：
 *   1. 用户输入主队 / 客队中文队名
 *   2. 通过 TEAM_ALIASES 映射到英文队名 + 联赛代码
 *   3. 从 GitHub openfootball/football.json 拉取对应联赛的 fixtures JSON
 *      （附带 5 分钟 localStorage 缓存，避免重复请求）
 *   4. 在 fixtures 中搜索两队的最近比赛 → 真实战绩
 *   5. 在 fixtures 中搜索两队之间的直接交手 → 真实 h2h
 *   6. 基于真实的场均得失球 → 用泊松分布预测比分
 *   7. 任何步骤失败 / 数据不足 → 自动降级：部分字段用种子化随机模型补齐
 *   8. 在 UI 上清晰标注"真实数据" vs "模型模拟"
 */
(function () {
    'use strict';

    // ============================================================
    // 1. 中文队名 → 英文队名 + 联赛代号 映射
    //    联赛代号对应 openfootball/football.json 仓库中的文件路径
    // ============================================================
    var TEAM_ALIASES = {
        // ===== 英超 en.1 =====
        '阿森纳': { en: 'Arsenal FC', league: 'en.1' },
        '阿仙奴': { en: 'Arsenal FC', league: 'en.1' },
        '曼联': { en: 'Manchester United', league: 'en.1' },
        '曼彻斯特联队': { en: 'Manchester United', league: 'en.1' },
        '曼城': { en: 'Manchester City', league: 'en.1' },
        '曼彻斯特城': { en: 'Manchester City', league: 'en.1' },
        '利物浦': { en: 'Liverpool FC', league: 'en.1' },
        '切尔西': { en: 'Chelsea FC', league: 'en.1' },
        '车路士': { en: 'Chelsea FC', league: 'en.1' },
        '热刺': { en: 'Tottenham Hotspur', league: 'en.1' },
        '托特纳姆热刺': { en: 'Tottenham Hotspur', league: 'en.1' },
        '纽卡斯尔': { en: 'Newcastle United', league: 'en.1' },
        '纽卡斯尔联': { en: 'Newcastle United', league: 'en.1' },
        '阿斯顿维拉': { en: 'Aston Villa', league: 'en.1' },
        '布莱顿': { en: 'Brighton &amp; Hove Albion', league: 'en.1' },
        '西汉姆': { en: 'West Ham United', league: 'en.1' },
        '西汉姆联': { en: 'West Ham United', league: 'en.1' },
        '埃弗顿': { en: 'Everton FC', league: 'en.1' },
        '富勒姆': { en: 'Fulham FC', league: 'en.1' },
        '狼队': { en: 'Wolverhampton Wanderers', league: 'en.1' },
        '伯恩茅斯': { en: 'AFC Bournemouth', league: 'en.1' },
        '诺丁汉森林': { en: 'Nottingham Forest', league: 'en.1' },
        '水晶宫': { en: 'Crystal Palace', league: 'en.1' },
        '布伦特福德': { en: 'Brentford FC', league: 'en.1' },
        '莱斯特城': { en: 'Leicester City', league: 'en.1' },
        '伊普斯维奇': { en: 'Ipswich Town', league: 'en.1' },

        // ===== 西甲 es.1 =====
        '皇家马德里': { en: 'Real Madrid', league: 'es.1' },
        '皇马': { en: 'Real Madrid', league: 'es.1' },
        '巴塞罗那': { en: 'FC Barcelona', league: 'es.1' },
        '巴萨': { en: 'FC Barcelona', league: 'es.1' },
        '马德里竞技': { en: 'Atl\u00e9tico Madrid', league: 'es.1' },
        '马竞': { en: 'Atl\u00e9tico Madrid', league: 'es.1' },
        '塞维利亚': { en: 'Sevilla FC', league: 'es.1' },
        '皇家社会': { en: 'Real Sociedad', league: 'es.1' },
        '比利亚雷亚尔': { en: 'Villarreal CF', league: 'es.1' },
        '瓦伦西亚': { en: 'Valencia CF', league: 'es.1' },
        '毕尔巴鄂': { en: 'Athletic Club', league: 'es.1' },
        '皇家贝蒂斯': { en: 'Real Betis', league: 'es.1' },
        '赫罗纳': { en: 'Girona FC', league: 'es.1' },
        '赫塔菲': { en: 'Getafe CF', league: 'es.1' },
        '拉科鲁尼亚': { en: 'Deportivo La Coru\u00f1a', league: 'es.1' },
        '维戈塞尔塔': { en: 'RC Celta', league: 'es.1' },
        '奥萨苏纳': { en: 'CA Osasuna', league: 'es.1' },
        '拉斯帕尔马斯': { en: 'UD Las Palmas', league: 'es.1' },

        // ===== 德甲 de.1 =====
        '拜仁慕尼黑': { en: 'Bayern Munich', league: 'de.1' },
        '拜仁': { en: 'Bayern Munich', league: 'de.1' },
        '多特蒙德': { en: 'Borussia Dortmund', league: 'de.1' },
        '多蒙特': { en: 'Borussia Dortmund', league: 'de.1' },
        '莱比锡红牛': { en: 'RB Leipzig', league: 'de.1' },
        '莱比锡': { en: 'RB Leipzig', league: 'de.1' },
        '勒沃库森': { en: 'Bayer Leverkusen', league: 'de.1' },
        '法兰克福': { en: 'Eintracht Frankfurt', league: 'de.1' },
        '斯图加特': { en: 'VfB Stuttgart', league: 'de.1' },
        '门兴格拉德巴赫': { en: 'Borussia M\u00f6nchengladbach', league: 'de.1' },
        '柏林联合': { en: 'Union Berlin', league: 'de.1' },
        '弗赖堡': { en: 'SC Freiburg', league: 'de.1' },
        '霍芬海姆': { en: 'TSG Hoffenheim', league: 'de.1' },
        '美因茨': { en: 'FSV Mainz 05', league: 'de.1' },
        '科隆': { en: 'FC K\u00f6ln', league: 'de.1' },
        '奥格斯堡': { en: 'FC Augsburg', league: 'de.1' },
        '达姆施塔特': { en: 'Darmstadt 98', league: 'de.1' },
        '波鸿': { en: 'VfL Bochum', league: 'de.1' },

        // ===== 意甲 it.1 =====
        '国际米兰': { en: 'Inter Milan', league: 'it.1' },
        '国米': { en: 'Inter Milan', league: 'it.1' },
        'AC米兰': { en: 'AC Milan', league: 'it.1' },
        '米兰': { en: 'AC Milan', league: 'it.1' },
        '尤文图斯': { en: 'Juventus FC', league: 'it.1' },
        '祖云达斯': { en: 'Juventus FC', league: 'it.1' },
        '那不勒斯': { en: 'Napoli', league: 'it.1' },
        '拿玻里': { en: 'Napoli', league: 'it.1' },
        '罗马': { en: 'AS Roma', league: 'it.1' },
        '拉齐奥': { en: 'SS Lazio', league: 'it.1' },
        '佛罗伦萨': { en: 'Fiorentina', league: 'it.1' },
        '亚特兰大': { en: 'Atalanta BC', league: 'it.1' },
        '博洛尼亚': { en: 'Bologna FC', league: 'it.1' },
        '都灵': { en: 'Torino FC', league: 'it.1' },
        '萨索洛': { en: 'Sassuolo', league: 'it.1' },
        '乌迪内斯': { en: 'Udinese', league: 'it.1' },
        '维罗纳': { en: 'Hellas Verona', league: 'it.1' },
        '卡利亚里': { en: 'Cagliari', league: 'it.1' },

        // ===== 法甲 fr.1 =====
        '巴黎圣日耳曼': { en: 'Paris Saint-Germain', league: 'fr.1' },
        '巴黎': { en: 'Paris Saint-Germain', league: 'fr.1' },
        '马赛': { en: 'Olympique de Marseille', league: 'fr.1' },
        '里昂': { en: 'Olympique Lyonnais', league: 'fr.1' },
        '摩纳哥': { en: 'AS Monaco', league: 'fr.1' },
        '里尔': { en: 'Lille OSC', league: 'fr.1' },
        '尼斯': { en: 'OGC Nice', league: 'fr.1' },
        '雷恩': { en: 'Stade Rennais', league: 'fr.1' },
        '朗斯': { en: 'RC Lens', league: 'fr.1' },
        '南特': { en: 'FC Nantes', league: 'fr.1' },
        '斯特拉斯堡': { en: 'Strasbourg', league: 'fr.1' },
        '图卢兹': { en: 'Toulouse FC', league: 'fr.1' },

        // ===== 其他知名球队 =====
        '波尔图': { en: 'FC Porto', league: 'pt.1' },
        '本菲卡': { en: 'SL Benfica', league: 'pt.1' },
        '里斯本竞技': { en: 'Sporting CP', league: 'pt.1' },
        '阿贾克斯': { en: 'Ajax Amsterdam', league: 'nl.1' },
        '埃因霍温': { en: 'PSV Eindhoven', league: 'nl.1' },
        '凯尔特人': { en: 'Celtic FC', league: 'sc.1' },
        '流浪者': { en: 'Rangers FC', league: 'sc.1' },
        '安德莱赫特': { en: 'RSC Anderlecht', league: 'be.1' }
    };

    // ============================================================
    // 2. 数据源：openfootball/football.json 仓库各联赛 fixtures URL
    //    2024-25 赛季，用户访问的当前赛季；附带旧赛季作为 h2h 补充
    // ============================================================
    var GITHUB_BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master';
    var CURRENT_SEASON = '2024-25';
    var PREV_SEASON = '2023-24';

    var LEAGUE_FILES = {
        'en.1': {
            name: '英超',
            urls: [
                GITHUB_BASE + '/' + CURRENT_SEASON + '/en.1.json',
                GITHUB_BASE + '/' + PREV_SEASON + '/en.1.json'
            ]
        },
        'es.1': {
            name: '西甲',
            urls: [
                GITHUB_BASE + '/' + CURRENT_SEASON + '/es.1.json',
                GITHUB_BASE + '/' + PREV_SEASON + '/es.1.json'
            ]
        },
        'de.1': {
            name: '德甲',
            urls: [
                GITHUB_BASE + '/' + CURRENT_SEASON + '/de.1.json',
                GITHUB_BASE + '/' + PREV_SEASON + '/de.1.json'
            ]
        },
        'it.1': {
            name: '意甲',
            urls: [
                GITHUB_BASE + '/' + CURRENT_SEASON + '/it.1.json',
                GITHUB_BASE + '/' + PREV_SEASON + '/it.1.json'
            ]
        },
        'fr.1': {
            name: '法甲',
            urls: [
                GITHUB_BASE + '/' + CURRENT_SEASON + '/fr.1.json',
                GITHUB_BASE + '/' + PREV_SEASON + '/fr.1.json'
            ]
        },
        'pt.1': {
            name: '葡超',
            urls: [GITHUB_BASE + '/' + PREV_SEASON + '/pt.1.json']
        },
        'nl.1': {
            name: '荷甲',
            urls: [GITHUB_BASE + '/' + PREV_SEASON + '/nl.1.json']
        },
        'sc.1': {
            name: '苏超',
            urls: [GITHUB_BASE + '/' + PREV_SEASON + '/sc.1.json']
        },
        'be.1': {
            name: '比甲',
            urls: [GITHUB_BASE + '/' + PREV_SEASON + '/be.1.json']
        }
    };

    var CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟缓存
    var FETCH_TIMEOUT_MS = 6000; // 6 秒超时，避免卡住界面

    // ============================================================
    // 3. 基础工具：字符串 hash / 伪随机数 / 泊松采样（保留原逻辑）
    // ============================================================
    function hashString(str) {
        var h = 2166136261;
        str = str.trim();
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function createRng(seed) {
        var s = seed >>> 0;
        if (s === 0) s = 123456789;
        return function () {
            s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
            return s / 4294967296;
        };
    }

    function poissonSample(lambda, rng) {
        if (lambda <= 0) return 0;
        var L = Math.exp(-lambda);
        var k = 0;
        var p = 1;
        while (true) {
            k = k + 1;
            p = p * rng();
            if (p <= L) break;
            if (k > 7) break;
        }
        return k - 1;
    }

    // ============================================================
    // 4. 降级模型：队名种子化生成的球队 profile / 比赛（保留原逻辑作为 fallback）
    // ============================================================
    var opponentPool1 = ['曼彻斯特联队', '皇家马德里', '拜仁慕尼黑', '巴塞罗那', '切尔西', '巴黎圣日耳曼', '阿森纳', '国际米兰', '利物浦', 'AC米兰', '曼城', '马德里竞技', '多特蒙德', '托特纳姆热刺', '尤文图斯'];
    var opponentPool2 = ['莱比锡红牛', '塞维利亚', '那不勒斯', '西汉姆联', '摩纳哥', '勒沃库森', '比利亚雷亚尔', '波尔图', '本菲卡', '埃因霍温', '凯尔特人', '流浪者', '安德莱赫特', '里昂', '尼斯'];

    function pickOpponent(rng, exclude) {
        var pool = Math.random() < 0.5 ? opponentPool1 : opponentPool2;
        var idx = Math.floor(rng() * pool.length);
        var name = pool[idx];
        var maxTry = 5;
        while ((name === exclude || (arguments[2] && arguments[2].indexOf(name) !== -1)) && maxTry > 0) {
            name = pool[Math.floor(rng() * pool.length)];
            maxTry--;
        }
        return name;
    }

    function buildTeamProfileRandom(teamName, rng) {
        var strengthBase = 0.7 + rng() * 1.3;
        var lenFix = Math.min(10, teamName.length) / 20;
        var attack = strengthBase + lenFix;
        var defense = 0.5 + rng() * 1.2;
        var consistency = 0.5 + rng() * 0.8;
        var form = rng() * 0.6 + 0.7;
        return {
            name: teamName,
            attack: Math.min(2.5, attack),
            defense: Math.min(2.2, defense),
            consistency: consistency,
            form: form
        };
    }

    function generateRecentMatchesRandom(teamProfile, rng, homeAwaySide) {
        var matches = [];
        for (var i = 0; i < 5; i++) {
            var opponent = pickOpponent(rng, teamProfile.name);
            var opponentAttack = 0.6 + rng() * 1.4;
            var opponentDefense = 0.6 + rng() * 1.4;
            var formFactor = 0.7 + rng() * 0.6;
            var myExp = Math.max(0.4, (teamProfile.attack * homeAwaySide * formFactor) / (1 + opponentDefense * 0.4));
            var theirExp = Math.max(0.3, (opponentAttack * 0.9 + rng() * 0.3) / (1 + teamProfile.defense * 0.4));
            var myGoal = poissonSample(myExp, rng);
            var theirGoal = poissonSample(theirExp, rng);

            var result = 'win';
            if (myGoal < theirGoal) result = 'loss';
            else if (myGoal === theirGoal) result = 'draw';

            matches.push({
                opponent: opponent,
                myScore: myGoal,
                theirScore: theirGoal,
                result: result
            });
        }
        return matches;
    }

    function generateH2HRandom(homeProfile, awayProfile, rng) {
        var matches = [];
        for (var i = 0; i < 5; i++) {
            var formFactor1 = 0.7 + rng() * 0.6;
            var formFactor2 = 0.7 + rng() * 0.6;
            var homeExp = Math.max(0.3, (homeProfile.attack * formFactor1) / (1 + awayProfile.defense * 0.4));
            var awayExp = Math.max(0.3, (awayProfile.attack * formFactor2) / (1 + homeProfile.defense * 0.4));
            homeExp *= 1.1;
            var homeGoal = poissonSample(homeExp, rng);
            var awayGoal = poissonSample(awayExp, rng);

            var result = 'home';
            if (homeGoal < awayGoal) result = 'away';
            else if (homeGoal === awayGoal) result = 'draw';

            matches.push({
                homeName: homeProfile.name,
                awayName: awayProfile.name,
                homeScore: homeGoal,
                awayScore: awayGoal,
                result: result
            });
        }
        return matches;
    }

    // ============================================================
    // 5. 基于真实数据构建球队 profile（真实的场均得失球）
    // ============================================================
    function buildTeamProfileFromMatches(teamName, realMatches) {
        var goalsFor = 0, goalsAgainst = 0;
        for (var i = 0; i < realMatches.length; i++) {
            goalsFor += realMatches[i].myScore;
            goalsAgainst += realMatches[i].theirScore;
        }
        var avgFor = realMatches.length ? goalsFor / realMatches.length : 1.2;
        var avgAgainst = realMatches.length ? goalsAgainst / realMatches.length : 1.3;

        // 近期状态：最近 3 场的得失球 vs 更早 2 场
        var recentFor = 0, recentAgainst = 0;
        var recentCount = Math.min(3, realMatches.length);
        for (var j = 0; j < recentCount; j++) {
            recentFor += realMatches[j].myScore;
            recentAgainst += realMatches[j].theirScore;
        }
        var recentAvgFor = recentCount ? recentFor / recentCount : avgFor;
        var form = realMatches.length >= 3 ? (recentAvgFor / (avgFor || 1)) : 1.0;
        form = Math.max(0.7, Math.min(1.3, form));

        return {
            name: teamName,
            attack: Math.max(0.5, avgFor),
            defense: Math.max(0.4, avgAgainst),
            consistency: 1.0,
            form: form,
            // 附带原始数据，用于调试
            realData: true,
            matchCount: realMatches.length
        };
    }

    // ============================================================
    // 6. 远程数据拉取 + 缓存（localStorage 减少重复请求）
    // ============================================================
    function fetchWithTimeout(url, timeoutMs) {
        return new Promise(function (resolve, reject) {
            var controller = null;
            if (window.AbortController) {
                controller = new AbortController();
                setTimeout(function () {
                    reject(new Error('timeout'));
                    if (controller) controller.abort();
                }, timeoutMs);

                fetch(url, { signal: controller.signal })
                    .then(function (res) {
                        if (!res.ok) throw new Error('HTTP ' + res.status);
                        return res.json();
                    })
                    .then(resolve)
                    .catch(function (err) {
                        // 已经被 timeout 拒绝过就忽略
                        reject(err);
                    });
            } else {
                // 旧浏览器：用 XHR + setTimeout
                var xhr = new XMLHttpRequest();
                var done = false;
                var timer = setTimeout(function () {
                    if (!done) {
                        done = true;
                        try { xhr.abort(); } catch (e) {}
                        reject(new Error('timeout'));
                    }
                }, timeoutMs);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && !done) {
                        done = true;
                        clearTimeout(timer);
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                resolve(JSON.parse(xhr.responseText));
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error('HTTP ' + xhr.status));
                        }
                    }
                };
                xhr.open('GET', url, true);
                xhr.send();
            }
        });
    }

    function cacheKey(url) {
        return 'fb_cache_' + hashString(url);
    }

    function getCache(url) {
        try {
            var raw = localStorage.getItem(cacheKey(url));
            if (!raw) return null;
            var obj = JSON.parse(raw);
            if (Date.now() - obj.ts > CACHE_TTL_MS) {
                localStorage.removeItem(cacheKey(url));
                return null;
            }
            return obj.data;
        } catch (e) {
            return null;
        }
    }

    function setCache(url, data) {
        try {
            localStorage.setItem(cacheKey(url), JSON.stringify({
                ts: Date.now(),
                data: data
            }));
        } catch (e) { /* ignore */ }
    }

    function fetchLeagueData(leagueCode) {
        var league = LEAGUE_FILES[leagueCode];
        if (!league) return Promise.reject(new Error('unsupported league'));

        var allUrls = league.urls;
        var fetches = allUrls.map(function (url) {
            var cached = getCache(url);
            if (cached) return Promise.resolve(cached);
            return fetchWithTimeout(url, FETCH_TIMEOUT_MS).then(function (data) {
                setCache(url, data);
                return data;
            }).catch(function () {
                return null; // 单个文件失败不中断整体
            });
        });

        return Promise.all(fetches).then(function (results) {
            // 合并所有赛季的 matches（过滤 null）
            var allMatches = [];
            for (var i = 0; i < results.length; i++) {
                if (results[i] && results[i].matches && Array.isArray(results[i].matches)) {
                    for (var j = 0; j < results[i].matches.length; j++) {
                        allMatches.push(results[i].matches[j]);
                    }
                }
            }
            return {
                leagueName: league.name,
                matches: allMatches
            };
        });
    }

    // ============================================================
    // 7. 从 fixtures 中提取目标球队的最近 N 场比赛
    // ============================================================
    function normalizeTeamName(name) {
        if (!name) return '';
        return String(name).trim().toLowerCase();
    }

    // 模糊匹配：openfootball 的队名可能是 "Arsenal FC" 而我们存 "Arsenal FC"
    // 但数据源中有时是 "Arsenal"、"Arsenal FC"、"Arsenal Football Club" 等变体
    function teamNameMatches(actualTeam, targetTeam) {
        var a = normalizeTeamName(actualTeam);
        var t = normalizeTeamName(targetTeam);
        if (!a || !t) return false;
        if (a === t) return true;
        // 去除常见后缀后比较
        var strip = function (s) {
            return s.replace(/\b(fc|cf|af|if|as|ss|sc|rc|bv|fsv|tsg|vfl|borussia|eintracht|athletic|club|football|club de|deportivo|de|la|the|ud|rsc|rangers|wanderers|hotspur|united|city|albion|palace|villa|forest|town|palace|celta|betis|real|atletico|athletic|paris|saint-germain|psg|losc|ogc|cp|sl|benfica|porto|sporting|ajax|psv|amsterdam|eindhoven|lyonnais|marseille|monaco|rennais|nantes|strasbourg|toulouse|napoli|fiorentina|atalanta|bologna|torino|sassuolo|udinese|verona|cagliari|inter)\b/g, ' ')
                .replace(/[\.\&,\-\s]+/g, ' ').trim();
        };
        var aStripped = strip(a);
        var tStripped = strip(t);
        if (aStripped === tStripped && aStripped.length >= 3) return true;
        // 相互包含：如 "arsenal" ⊆ "arsenal fc"
        if (aStripped.length >= 3 && tStripped.length >= 3) {
            if (aStripped.indexOf(tStripped) !== -1) return true;
            if (tStripped.indexOf(aStripped) !== -1) return true;
        }
        return false;
    }

    function extractRecentMatchesFromFixtures(teamName, fixtures, limit) {
        limit = limit || 5;
        var result = [];
        // fixtures 通常按日期顺序从早到晚，所以倒序取最近
        for (var i = fixtures.length - 1; i >= 0 && result.length < limit; i--) {
            var m = fixtures[i];
            if (!m || !m.team1 || !m.team2) continue;
            // 必须有最终比分（ft = full time），忽略未开赛的比赛
            if (!m.score || !m.score.ft || !Array.isArray(m.score.ft) || m.score.ft.length < 2) continue;
            var score1 = m.score.ft[0];
            var score2 = m.score.ft[1];
            if (typeof score1 !== 'number' || typeof score2 !== 'number') continue;

            var isHome = teamNameMatches(m.team1, teamName);
            var isAway = teamNameMatches(m.team2, teamName);
            if (!isHome && !isAway) continue;

            var myScore = isHome ? score1 : score2;
            var theirScore = isHome ? score2 : score1;
            var opponent = isHome ? m.team2 : m.team1;

            var resultTag = 'win';
            if (myScore < theirScore) resultTag = 'loss';
            else if (myScore === theirScore) resultTag = 'draw';

            result.push({
                opponent: opponent,
                myScore: myScore,
                theirScore: theirScore,
                result: resultTag
            });
        }
        return result;
    }

    function findH2HFromFixtures(homeTeam, awayTeam, fixtures, limit) {
        limit = limit || 5;
        var result = [];
        for (var i = fixtures.length - 1; i >= 0 && result.length < limit; i--) {
            var m = fixtures[i];
            if (!m || !m.team1 || !m.team2) continue;
            if (!m.score || !m.score.ft || !Array.isArray(m.score.ft) || m.score.ft.length < 2) continue;
            var score1 = m.score.ft[0];
            var score2 = m.score.ft[1];
            if (typeof score1 !== 'number' || typeof score2 !== 'number') continue;

            // 检查是否两队之间的交手（主客顺序都考虑）
            var homeAtT1 = teamNameMatches(m.team1, homeTeam) && teamNameMatches(m.team2, awayTeam);
            var homeAtT2 = teamNameMatches(m.team2, homeTeam) && teamNameMatches(m.team1, awayTeam);
            if (!homeAtT1 && !homeAtT2) continue;

            var homeScore = homeAtT1 ? score1 : score2;
            var awayScore = homeAtT1 ? score2 : score1;

            var result = 'home';
            if (homeScore < awayScore) result = 'away';
            else if (homeScore === awayScore) result = 'draw';

            result.push({
                homeName: homeTeam,
                awayName: awayTeam,
                homeScore: homeScore,
                awayScore: awayScore,
                result: result
            });
        }
        return result;
    }

    // ============================================================
    // 8. 合并真实 + 模拟数据（真实不足时用模拟补齐）
    // ============================================================
    function padWithRandomMatches(existing, targetCount, teamProfile, rng, homeAwaySide) {
        if (existing.length >= targetCount) return existing.slice(0, targetCount);
        var need = targetCount - existing.length;
        var generated = generateRecentMatchesRandom(teamProfile, rng, homeAwaySide);
        var combined = existing.concat(generated.slice(0, need));
        return combined;
    }

    function padWithRandomH2H(existing, targetCount, homeProfile, awayProfile, rng) {
        if (existing.length >= targetCount) return existing.slice(0, targetCount);
        var need = targetCount - existing.length;
        var generated = generateH2HRandom(homeProfile, awayProfile, rng);
        return existing.concat(generated.slice(0, need));
    }

    // ============================================================
    // 9. 比分预测算法（与原逻辑一致，但输入是真实数据）
    // ============================================================
    function summarize(matches, mode) {
        var wins = 0, draws = 0, losses = 0;
        var goalsFor = 0, goalsAgainst = 0;
        for (var i = 0; i < matches.length; i++) {
            if (mode === 'team') {
                if (matches[i].result === 'win') wins++;
                else if (matches[i].result === 'loss') losses++;
                else draws++;
                goalsFor += matches[i].myScore;
                goalsAgainst += matches[i].theirScore;
            } else {
                if (matches[i].result === 'home') wins++;
                else if (matches[i].result === 'away') losses++;
                else draws++;
                goalsFor += matches[i].homeScore;
                goalsAgainst += matches[i].awayScore;
            }
        }
        var n = matches.length || 1;
        return {
            wins: wins,
            draws: draws,
            losses: losses,
            goalsFor: goalsFor,
            goalsAgainst: goalsAgainst,
            avgGoalsFor: (goalsFor / n).toFixed(2),
            avgGoalsAgainst: (goalsAgainst / n).toFixed(2)
        };
    }

    function predictScore(homeProfile, awayProfile, homeMatches, awayMatches, h2h, rng) {
        var homeRecentFor = 0, homeRecentAgainst = 0;
        for (var i = 0; i < homeMatches.length; i++) {
            homeRecentFor += homeMatches[i].myScore;
            homeRecentAgainst += homeMatches[i].theirScore;
        }
        homeRecentFor /= homeMatches.length;
        homeRecentAgainst /= homeMatches.length;

        var awayRecentFor = 0, awayRecentAgainst = 0;
        for (var j = 0; j < awayMatches.length; j++) {
            awayRecentFor += awayMatches[j].myScore;
            awayRecentAgainst += awayMatches[j].theirScore;
        }
        awayRecentFor /= awayMatches.length;
        awayRecentAgainst /= awayMatches.length;

        var homeLambda = 0.55 * homeRecentFor + 0.25 * homeProfile.attack * homeProfile.form + 0.2 * awayRecentAgainst;
        var awayLambda = 0.55 * awayRecentFor + 0.25 * awayProfile.attack * awayProfile.form + 0.2 * homeRecentAgainst;

        homeLambda *= 1.1; // 主场优势

        var h2hHomeWins = 0, h2hAwayWins = 0, h2hDraws = 0;
        var h2hHomeGoals = 0, h2hAwayGoals = 0;
        for (var k = 0; k < h2h.length; k++) {
            h2hHomeGoals += h2h[k].homeScore;
            h2hAwayGoals += h2h[k].awayScore;
            if (h2h[k].result === 'home') h2hHomeWins++;
            else if (h2h[k].result === 'away') h2hAwayWins++;
            else h2hDraws++;
        }
        var h2hDiff = h2h.length ? (h2hHomeGoals - h2hAwayGoals) / h2h.length : 0;
        homeLambda = homeLambda * (1 + 0.08 * Math.min(1, Math.max(-1, h2hDiff)));
        awayLambda = awayLambda * (1 - 0.08 * Math.min(1, Math.max(-1, h2hDiff)));

        homeLambda = Math.max(0.35, homeLambda);
        awayLambda = Math.max(0.35, awayLambda);

        var factorial = [1, 1, 2, 6, 24, 120, 720, 5040];
        function poissonP(lambda, kk) {
            if (kk < 0 || kk > 7) return 0;
            return Math.pow(lambda, kk) * Math.exp(-lambda) / factorial[kk];
        }

        var winProb = 0, drawProb = 0, lossProb = 0;
        var bestHomeScore = 0, bestAwayScore = 0, bestP = 0;
        for (var h = 0; h <= 7; h++) {
            for (var a = 0; a <= 7; a++) {
                var p = poissonP(homeLambda, h) * poissonP(awayLambda, a);
                if (h > a) winProb += p;
                else if (h === a) drawProb += p;
                else lossProb += p;
                if (p > bestP) {
                    bestP = p;
                    bestHomeScore = h;
                    bestAwayScore = a;
                }
            }
        }
        var total = winProb + drawProb + lossProb;
        winProb = Math.round(winProb / total * 100);
        drawProb = Math.round(drawProb / total * 100);
        lossProb = 100 - winProb - drawProb;

        if (drawProb >= 30 && bestHomeScore !== bestAwayScore) {
            var avgGoals = Math.round((homeLambda + awayLambda) / 2);
            bestHomeScore = avgGoals;
            bestAwayScore = avgGoals;
        }

        return {
            homeScore: bestHomeScore,
            awayScore: bestAwayScore,
            winProb: winProb,
            drawProb: drawProb,
            lossProb: lossProb,
            homeLambda: homeLambda.toFixed(2),
            awayLambda: awayLambda.toFixed(2)
        };
    }

    // ============================================================
    // 10. 文字分析（保留原逻辑）
    // ============================================================
    function generateAnalysis(homeName, awayName, homeSummary, awaySummary, h2hSummary, score, dataSource) {
        var sentences = [];
        // 数据源标识
        if (dataSource === 'real') {
            sentences.push('【数据来源：OpenFootball 公开赛事数据库，真实交战记录】');
        } else if (dataSource === 'mixed') {
            sentences.push('【数据来源：OpenFootball 真实赛事 + 模型模拟补全（部分历史交手未在数据库中收录）】');
        } else {
            sentences.push('【数据来源：算法模型基于队名生成（该球队暂未收录于公开赛事数据）】');
        }

        if (homeSummary.wins > awaySummary.wins) {
            sentences.push(homeName + '近期状态更为稳定（5场 ' + homeSummary.wins + '胜' + homeSummary.draws + '平' + homeSummary.losses + '负），场均进 ' + homeSummary.avgGoalsFor + ' 球，失 ' + homeSummary.avgGoalsAgainst + ' 球。');
        } else if (awaySummary.wins > homeSummary.wins) {
            sentences.push(awayName + '近期表现更胜一筹（5场 ' + awaySummary.wins + '胜' + awaySummary.draws + '平' + awaySummary.losses + '负），进攻端场均贡献 ' + awaySummary.avgGoalsFor + ' 球。');
        } else {
            sentences.push('两队近5场战绩相近，分别为 ' + homeName + ' ' + homeSummary.wins + '胜' + homeSummary.draws + '平' + homeSummary.losses + '负，' + awayName + ' ' + awaySummary.wins + '胜' + awaySummary.draws + '平' + awaySummary.losses + '负。');
        }

        var diff = h2hSummary.goalsFor - h2hSummary.goalsAgainst;
        if (h2hSummary.wins > h2hSummary.losses) {
            sentences.push('历史近5场交手 ' + homeName + ' 以 ' + h2hSummary.wins + '胜' + h2hSummary.draws + '平' + h2hSummary.losses + '负 略占上风，双方场均球差 ' + (Math.round(diff * 100) / 100) + '。');
        } else if (h2hSummary.losses > h2hSummary.wins) {
            sentences.push('历史交手 ' + awayName + ' 拥有心理优势（近5场 ' + h2hSummary.losses + '胜' + h2hSummary.draws + '平' + h2hSummary.wins + '负），' + homeName + ' 主场需格外谨慎。');
        } else {
            sentences.push('历史近5场交手双方平分秋色，本战胜负充满悬念。');
        }

        if (score.winProb >= 55) {
            sentences.push('综合评估主队胜面较大（胜概率 ' + score.winProb + '%），建议关注主队半场进球能力。');
        } else if (score.lossProb >= 55) {
            sentences.push('综合评估客队获胜概率更高（胜概率 ' + score.lossProb + '%），需警惕主队防守漏洞。');
        } else if (score.drawProb >= 30) {
            sentences.push('平局概率较高（' + score.drawProb + '%），双方攻防趋于平衡，90分钟战平的可能性不小。');
        } else {
            sentences.push('比赛形势接近，胜负走势或取决于临场发挥与个别机会把握。');
        }

        sentences.push('\u203b 以上预测仅基于算法模型生成，不构成任何投注建议。');
        return sentences.join('\n');
    }

    // ============================================================
    // 11. DOM & 事件绑定
    // ============================================================
    var dom = {};
    function init() {
        dom.homeInput = document.getElementById('team-home');
        dom.awayInput = document.getElementById('team-away');
        dom.predictBtn = document.getElementById('predict-btn');
        dom.resultBox = document.getElementById('football-result');
        dom.resetBtn = document.getElementById('reset-btn');
        dom.loadingBox = document.getElementById('football-loading');
        dom.sourceBanner = document.getElementById('football-source-banner');

        if (dom.predictBtn) dom.predictBtn.addEventListener('click', handlePredict);

        [dom.homeInput, dom.awayInput].forEach(function (inp) {
            if (!inp) return;
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') handlePredict();
            });
        });

        document.querySelectorAll('.football-quick-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (dom.homeInput) dom.homeInput.value = btn.getAttribute('data-home') || '';
                if (dom.awayInput) dom.awayInput.value = btn.getAttribute('data-away') || '';
                handlePredict();
            });
        });

        if (dom.resetBtn) {
            dom.resetBtn.addEventListener('click', function () {
                if (dom.resultBox) dom.resultBox.style.display = 'none';
                if (dom.loadingBox) dom.loadingBox.style.display = 'none';
                if (dom.homeInput) dom.homeInput.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    // ============================================================
    // 12. 主流程：异步尝试真实数据，失败则回退
    // ============================================================
    function handlePredict() {
        var home = (dom.homeInput.value || '').trim();
        var away = (dom.awayInput.value || '').trim();
        if (!home || !away) {
            var focusTarget = !home ? dom.homeInput : dom.awayInput;
            if (focusTarget) focusTarget.focus();
            if (dom.predictBtn) {
                dom.predictBtn.style.transform = 'scale(0.95)';
                var btn = dom.predictBtn;
                setTimeout(function () { btn.style.transform = ''; }, 150);
            }
            return;
        }

        // 显示加载状态
        if (dom.loadingBox) dom.loadingBox.style.display = 'flex';
        if (dom.resultBox) dom.resultBox.style.display = 'none';
        if (dom.sourceBanner) dom.sourceBanner.style.display = 'none';

        // 组合种子：用于 fallback 路径（保证同一队名产生相同的模拟数据）
        var seed1 = hashString(home);
        var seed2 = hashString(away);
        var combinedSeed = (Math.imul(seed1, 1315423911) ^ seed2) >>> 0;

        // 查找映射
        var homeInfo = TEAM_ALIASES[home] || null;
        var awayInfo = TEAM_ALIASES[away] || null;

        // 决定是否尝试 fetch 真实数据
        var leaguesToFetch = [];
        if (homeInfo && LEAGUE_FILES[homeInfo.league]) leaguesToFetch.push(homeInfo.league);
        if (awayInfo && LEAGUE_FILES[awayInfo.league] && leaguesToFetch.indexOf(awayInfo.league) === -1) {
            leaguesToFetch.push(awayInfo.league);
        }

        if (leaguesToFetch.length === 0) {
            // 完全没有映射 → 直接降级到随机模型
            setTimeout(function () {
                runFallbackPipeline(home, away, combinedSeed, 'no_mapping');
            }, 100);
            return;
        }

        // 异步：依次 fetch 需要的联赛
        var allFixtures = [];
        var fetchedLeagueNames = [];
        var fetchPromises = leaguesToFetch.map(function (lc) {
            return fetchLeagueData(lc).then(function (data) {
                if (data && data.matches && data.matches.length > 0) {
                    allFixtures = allFixtures.concat(data.matches);
                    fetchedLeagueNames.push(data.leagueName);
                }
            }).catch(function () {
                // 忽略单个联赛的失败
            });
        });

        // 整体超时兜底
        var overallTimeout = new Promise(function (resolve) {
            setTimeout(resolve, FETCH_TIMEOUT_MS);
        });

        Promise.race([
            Promise.all(fetchPromises),
            overallTimeout
        ]).then(function () {
            // 尝试从所有 fixtures 中提取两队数据
            var homeEn = homeInfo ? homeInfo.en : home;
            var awayEn = awayInfo ? awayInfo.en : away;

            var realHomeMatches = homeInfo ? extractRecentMatchesFromFixtures(homeEn, allFixtures, 5) : [];
            var realAwayMatches = awayInfo ? extractRecentMatchesFromFixtures(awayEn, allFixtures, 5) : [];
            var realH2H = homeInfo && awayInfo ? findH2HFromFixtures(home, away, allFixtures, 5) : [];

            var hasAnyRealData = realHomeMatches.length > 0 || realAwayMatches.length > 0 || realH2H.length > 0;
            var hasAllH2H = realH2H.length >= 5;
            var hasAllRecent = realHomeMatches.length >= 5 && realAwayMatches.length >= 5;

            // 分类数据源
            var dataSource = 'simulated';
            if (hasAllRecent && hasAllH2H) dataSource = 'real';
            else if (hasAnyRealData) dataSource = 'mixed';

            // 如果没有任何真实数据 → 走 fallback
            if (!hasAnyRealData) {
                runFallbackPipeline(home, away, combinedSeed, 'fetch_no_results');
                return;
            }

            // 准备 profile：用真实数据构建
            var rng = createRng(combinedSeed);
            var homeProfile = realHomeMatches.length > 0
                ? buildTeamProfileFromMatches(home, realHomeMatches)
                : buildTeamProfileRandom(home, createRng(seed1));

            var awayProfile = realAwayMatches.length > 0
                ? buildTeamProfileFromMatches(away, realAwayMatches)
                : buildTeamProfileRandom(away, createRng(seed2));

            // 补齐最近 5 场：真实数据不足的用模拟数据填充
            var finalHomeMatches = padWithRandomMatches(realHomeMatches, 5, homeProfile, rng, 1.05);
            var finalAwayMatches = padWithRandomMatches(realAwayMatches, 5, awayProfile, rng, 1.0);
            var finalH2H = padWithRandomH2H(realH2H, 5, homeProfile, awayProfile, rng);

            var score = predictScore(homeProfile, awayProfile, finalHomeMatches, finalAwayMatches, finalH2H, rng);

            var homeSummary = summarize(finalHomeMatches, 'team');
            var awaySummary = summarize(finalAwayMatches, 'team');
            var h2hSummary = summarize(finalH2H, 'h2h');

            var analysis = generateAnalysis(home, away, homeSummary, awaySummary, h2hSummary, score, dataSource);

            renderResult({
                home: home,
                away: away,
                homeMatches: finalHomeMatches,
                awayMatches: finalAwayMatches,
                h2h: finalH2H,
                homeSummary: homeSummary,
                awaySummary: awaySummary,
                h2hSummary: h2hSummary,
                score: score,
                analysis: analysis,
                dataSource: dataSource,
                realHomeCount: realHomeMatches.length,
                realAwayCount: realAwayMatches.length,
                realH2HCount: realH2H.length
            });
        }).catch(function () {
            runFallbackPipeline(home, away, combinedSeed, 'fetch_error');
        });
    }

    function runFallbackPipeline(home, away, combinedSeed, reason) {
        var rng = createRng(combinedSeed);
        var homeProfile = buildTeamProfileRandom(home, createRng(hashString(home)));
        var awayProfile = buildTeamProfileRandom(away, createRng(hashString(away)));

        var homeMatches = generateRecentMatchesRandom(homeProfile, rng, 1.05);
        var awayMatches = generateRecentMatchesRandom(awayProfile, rng, 1.0);
        var h2h = generateH2HRandom(homeProfile, awayProfile, rng);

        var score = predictScore(homeProfile, awayProfile, homeMatches, awayMatches, h2h, rng);

        var homeSummary = summarize(homeMatches, 'team');
        var awaySummary = summarize(awayMatches, 'team');
        var h2hSummary = summarize(h2h, 'h2h');

        var analysis = generateAnalysis(home, away, homeSummary, awaySummary, h2hSummary, score, 'simulated');

        renderResult({
            home: home,
            away: away,
            homeMatches: homeMatches,
            awayMatches: awayMatches,
            h2h: h2h,
            homeSummary: homeSummary,
            awaySummary: awaySummary,
            h2hSummary: h2hSummary,
            score: score,
            analysis: analysis,
            dataSource: 'simulated'
        });
    }

    // ============================================================
    // 13. 渲染
    // ============================================================
    function renderResult(data) {
        if (dom.loadingBox) dom.loadingBox.style.display = 'none';
        if (!dom.resultBox) return;
        dom.resultBox.style.display = 'flex';

        // 数据来源横幅
        if (dom.sourceBanner) {
            var bannerLabel = '';
            var bannerSub = '';
            var bannerClass = '';

            if (data.dataSource === 'real') {
                bannerLabel = '\u2705 真实数据 · 来源于 OpenFootball 公开赛事数据库';
                bannerSub = '近5场战绩与历史交手均为真实比赛记录';
                bannerClass = 'football-source-real';
            } else if (data.dataSource === 'mixed') {
                bannerLabel = '\u26a0 混合数据 · ' + (data.realHomeCount + data.realAwayCount) + ' 场真实比赛 + 模型补全';
                bannerSub = '部分历史交手或近期赛事数据不足，由算法模型补全';
                bannerClass = 'football-source-mixed';
            } else {
                bannerLabel = '\u2753 模型模拟 · 该球队暂未收录于公开赛事数据';
                bannerSub = '预测结果基于球队名称特征生成的算法模型';
                bannerClass = 'football-source-sim';
            }

            dom.sourceBanner.className = 'football-source-banner ' + bannerClass;
            dom.sourceBanner.innerHTML =
                '<div class="football-source-label">' + bannerLabel + '</div>' +
                '<div class="football-source-sub">' + bannerSub + '</div>';
            dom.sourceBanner.style.display = 'block';
        }

        // 比分
        var resultHomeNameEl = document.getElementById('result-home-name');
        var resultAwayNameEl = document.getElementById('result-away-name');
        if (resultHomeNameEl) resultHomeNameEl.textContent = data.home;
        if (resultAwayNameEl) resultAwayNameEl.textContent = data.away;

        animateNumber(document.getElementById('result-home-score'), data.score.homeScore, 500);
        animateNumber(document.getElementById('result-away-score'), data.score.awayScore, 500);

        setTimeout(function () {
            var confWin = document.getElementById('confidence-win');
            var confDraw = document.getElementById('confidence-draw');
            var confLose = document.getElementById('confidence-lose');
            if (confWin) confWin.style.width = data.score.winProb + '%';
            if (confDraw) confDraw.style.width = data.score.drawProb + '%';
            if (confLose) confLose.style.width = data.score.lossProb + '%';
            var pWin = document.getElementById('confidence-win-text');
            var pDraw = document.getElementById('confidence-draw-text');
            var pLose = document.getElementById('confidence-lose-text');
            if (pWin) pWin.textContent = '胜 ' + data.score.winProb + '%';
            if (pDraw) pDraw.textContent = '平 ' + data.score.drawProb + '%';
            if (pLose) pLose.textContent = '负 ' + data.score.lossProb + '%';
        }, 100);

        document.getElementById('history-home-name').textContent = data.home;
        buildMatchesList(document.getElementById('history-home-list'), data.homeMatches, 'team-home', data.home);
        buildSummaryRow(document.getElementById('history-home-summary'), data.homeSummary);

        document.getElementById('history-away-name').textContent = data.away;
        buildMatchesList(document.getElementById('history-away-list'), data.awayMatches, 'team-away', data.away);
        buildSummaryRow(document.getElementById('history-away-summary'), data.awaySummary);

        buildH2HList(document.getElementById('history-h2h-list'), data.h2h, data.home, data.away);
        buildH2HSummary(document.getElementById('history-h2h-summary'), data.h2hSummary, data.home, data.away);

        var analysisEl = document.getElementById('football-analysis-text');
        if (analysisEl) analysisEl.textContent = data.analysis;

        setTimeout(function () {
            dom.resultBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    function animateNumber(el, target, duration) {
        if (!el) return;
        var start = 0;
        var startTime = Date.now();
        function step() {
            var now = Date.now();
            var t = Math.min(1, (now - startTime) / duration);
            var eased = 1 - Math.pow(1 - t, 3);
            var value = Math.round(start + (target - start) * eased);
            el.textContent = value;
            if (t < 1) {
                if (window.requestAnimationFrame) requestAnimationFrame(step);
                else setTimeout(step, 16);
            }
        }
        step();
    }

    function buildMatchesList(container, matches, mode, teamName) {
        if (!container) return;
        container.innerHTML = '';
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            var row = document.createElement('div');
            row.className = 'football-match-row';

            var badge = document.createElement('div');
            badge.className = 'football-match-badge';
            if (m.result === 'win') badge.classList.add('football-match-badge-win');
            else if (m.result === 'loss') badge.classList.add('football-match-badge-loss');
            else badge.classList.add('football-match-badge-draw');
            badge.textContent = m.result === 'win' ? '胜' : m.result === 'loss' ? '负' : '平';
            row.appendChild(badge);

            var opp = document.createElement('div');
            opp.className = 'football-match-opponent';
            opp.textContent = 'vs ' + m.opponent;
            row.appendChild(opp);

            var score = document.createElement('div');
            score.className = 'football-match-result';
            if (m.result === 'win') score.classList.add('football-match-result-win');
            else if (m.result === 'loss') score.classList.add('football-match-result-loss');
            else score.classList.add('football-match-result-draw');
            score.textContent = m.myScore + ' : ' + m.theirScore;
            row.appendChild(score);

            container.appendChild(row);
        }
    }

    function buildSummaryRow(container, summary) {
        if (!container) return;
        container.innerHTML =
            '<div class="summary-stat"><strong>' + summary.wins + '</strong>胜</div>' +
            '<div class="summary-stat"><strong>' + summary.draws + '</strong>平</div>' +
            '<div class="summary-stat"><strong>' + summary.losses + '</strong>负</div>' +
            '<div class="summary-stat"><strong>' + summary.avgGoalsFor + '</strong>场均进球</div>' +
            '<div class="summary-stat"><strong>' + summary.avgGoalsAgainst + '</strong>场均失球</div>';
    }

    function buildH2HList(container, matches, homeName, awayName) {
        if (!container) return;
        container.innerHTML = '';
        for (var i = 0; i < matches.length; i++) {
            var m = matches[i];
            var row = document.createElement('div');
            row.className = 'football-match-row';

            var badge = document.createElement('div');
            badge.className = 'football-match-badge';
            if (m.result === 'home') badge.classList.add('football-match-badge-win');
            else if (m.result === 'away') badge.classList.add('football-match-badge-loss');
            else badge.classList.add('football-match-badge-draw');
            badge.textContent = m.result === 'home' ? '主' : m.result === 'away' ? '客' : '平';
            row.appendChild(badge);

            var vs = document.createElement('div');
            vs.className = 'football-match-opponent-vs';
            vs.innerHTML = '<span>' + homeName + '</span>' +
                '<span class="vs-sep">' + m.homeScore + ' : ' + m.awayScore + '</span>' +
                '<span>' + awayName + '</span>';
            row.appendChild(vs);

            container.appendChild(row);
        }
    }

    function buildH2HSummary(container, summary, homeName, awayName) {
        if (!container) return;
        container.innerHTML =
            '<div class="summary-stat"><strong>' + summary.wins + '</strong>' + homeName + ' 胜</div>' +
            '<div class="summary-stat"><strong>' + summary.draws + '</strong>平</div>' +
            '<div class="summary-stat"><strong>' + summary.losses + '</strong>' + awayName + ' 胜</div>' +
            '<div class="summary-stat"><strong>' + summary.avgGoalsFor + '</strong>' + homeName + '场均</div>' +
            '<div class="summary-stat"><strong>' + summary.avgGoalsAgainst + '</strong>' + awayName + '场均</div>';
    }

    // ============================================================
    // 14. 启动
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
