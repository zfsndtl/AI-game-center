/**
 * AI技术站 - 文档博客页面逻辑
 * 功能：加载 assets/doc 目录下的 Markdown 文档并渲染
 */
(function() {
    'use strict';

    // ===== 配置 =====
    var DOC_DIR = 'assets/doc/';  // 文档目录

    // ===== 文档索引 =====
    // 定义文档列表（分类和文件）
    var docIndex = [
        {
            category: '入门指南',
            docs: [
                { title: '项目介绍', file: 'intro.md' },
                { title: '快速开始', file: 'quick-start.md' }
            ]
        },
        {
            category: '游戏文档',
            docs: [
                { title: '五子棋玩法', file: 'gomoku.md' },
                { title: '围棋规则', file: 'go.md' },
                { title: '推箱子攻略', file: 'sokoban.md' }
            ]
        },
        {
            category: '技术文档',
            docs: [
                { title: '项目架构', file: 'architecture.md' },
                { title: 'API参考', file: 'api.md' }
            ]
        },
		 {
            category: 'AI技术文档',
            docs: [
                { title: 'AI编程学习-AI Agent 核心技术概念全景', file: 'AI-agent.md' },
                { title: 'API参考', file: 'api.md' }
            ]
        }
    ];

    // ===== DOM 元素 =====
    var docList = document.getElementById('docList');
    var docContent = document.getElementById('docContent');
    var searchInput = document.getElementById('searchInput');
    var menuToggle = document.getElementById('menuToggle');
    var sidebar = document.getElementById('sidebar');
    var sidebarClose = document.getElementById('sidebarClose');
    var backToTop = document.getElementById('backToTop');

    // ===== 当前状态 =====
    var currentDoc = null;
    var allDocItems = [];

    // ===== 初始化 =====
    function init() {
        renderDocList();
        bindEvents();
        loadInitialDoc();
        checkBackToTop();
    }

    // ===== 渲染文档列表 =====
    function renderDocList() {
        var html = '';
        allDocItems = [];

        docIndex.forEach(function(category) {
            // 分类标题
            html += '<li class="doc-category">' + escapeHtml(category.category) + '</li>';

            // 文档链接
            category.docs.forEach(function(doc) {
                html += '<li class="doc-item" data-file="' + escapeHtml(doc.file) + '">';
                html += '<a href="#' + encodeURIComponent(doc.file) + '" class="doc-link">' + escapeHtml(doc.title) + '</a>';
                html += '</li>';
                allDocItems.push({
                    file: doc.file,
                    title: doc.title,
                    category: category.category
                });
            });
        });

        docList.innerHTML = html;
    }

    // ===== 绑定事件 =====
    function bindEvents() {
        // 文档点击事件
        docList.addEventListener('click', function(e) {
            var target = e.target;
            if (target.classList.contains('doc-link')) {
                e.preventDefault();
                var file = target.parentElement.dataset.file;
                loadDoc(file);
                closeSidebar();
            }
        });

        // 搜索功能
        searchInput.addEventListener('input', function(e) {
            var keyword = e.target.value.toLowerCase().trim();
            filterDocs(keyword);
        });

        // 移动端菜单切换
        menuToggle.addEventListener('click', function() {
            openSidebar();
        });

        sidebarClose.addEventListener('click', function() {
            closeSidebar();
        });

        // 返回顶部
        backToTop.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // 滚动监听
        window.addEventListener('scroll', checkBackToTop);

        // URL hash 变化监听
        window.addEventListener('hashchange', function() {
            var hash = window.location.hash.slice(1);
            if (hash) {
                loadDoc(decodeURIComponent(hash));
            }
        });

        // 点击遮罩层关闭侧边栏
        document.addEventListener('click', function(e) {
            if (sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) &&
                !menuToggle.contains(e.target)) {
                closeSidebar();
            }
        });
    }

    // ===== 加载初始文档 =====
    function loadInitialDoc() {
        var hash = window.location.hash.slice(1);
        if (hash) {
            loadDoc(decodeURIComponent(hash));
        } else {
            // 加载第一个文档
            if (allDocItems.length > 0) {
                loadDoc(allDocItems[0].file);
            } else {
                showEmpty();
            }
        }
    }

    // ===== 加载文档 =====
    function loadDoc(file) {
        // 更新活动状态
        updateActiveState(file);

        // 显示加载状态
        showLoading();

        // 更新 URL
        history.replaceState(null, '', '#' + encodeURIComponent(file));

        // 检测是否为 file:// 协议
        var isFileProtocol = window.location.protocol === 'file:';
        
        if (isFileProtocol) {
            // file:// 协议下使用 XMLHttpRequest（部分浏览器支持）
            loadDocWithXHR(file);
        } else {
            // HTTP 协议下使用 fetch
            loadDocWithFetch(file);
        }
    }

    // ===== 使用 Fetch 加载文档 =====
    function loadDocWithFetch(file) {
        fetch(DOC_DIR + file)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('文档不存在: ' + file);
                }
                return response.text();
            })
            .then(function(markdown) {
                renderMarkdown(markdown);
                currentDoc = file;
            })
            .catch(function(error) {
                showError(error.message);
            });
    }

    // ===== 使用 XHR 加载文档（支持 file:// 协议）=====
    function loadDocWithXHR(file) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', DOC_DIR + file, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 0 || xhr.status === 200) {
                    // 成功加载
                    renderMarkdown(xhr.responseText);
                    currentDoc = file;
                } else {
                    showError('文档不存在: ' + file + '<br/><small>请通过 HTTP 服务器访问，或将文档文件放到正确位置</small>');
                }
            }
        };
        xhr.onerror = function() {
            showError('无法加载文档<br/><small>请使用 HTTP 服务器访问：<br/>http://localhost:8081/ai-doc.html</small>');
        };
        try {
            xhr.send();
        } catch (e) {
            showError('浏览器安全策略阻止访问本地文件<br/><small>请使用 HTTP 服务器访问：<br/>http://localhost:8081/ai-doc.html</small>');
        }
    }

    // ===== 渲染 Markdown =====
    function renderMarkdown(markdown) {
        if (typeof marked !== 'undefined') {
            // 配置 marked
            marked.setOptions({
                breaks: true,
                gfm: true
            });
            docContent.innerHTML = marked.parse(markdown);
        } else {
            // 如果 marked.js 未加载，显示原始文本
            docContent.innerHTML = '<pre>' + escapeHtml(markdown) + '</pre>';
        }
    }

    // ===== 更新活动状态 =====
    function updateActiveState(file) {
        var items = docList.querySelectorAll('.doc-item');
        items.forEach(function(item) {
            item.classList.remove('active');
            if (item.dataset.file === file) {
                item.classList.add('active');
            }
        });
    }

    // ===== 搜索过滤 =====
    function filterDocs(keyword) {
        var items = docList.querySelectorAll('.doc-item');
        var categories = docList.querySelectorAll('.doc-category');

        items.forEach(function(item) {
            var title = item.querySelector('.doc-link').textContent.toLowerCase();
            var file = item.dataset.file.toLowerCase();
            var match = !keyword || title.indexOf(keyword) >= 0 || file.indexOf(keyword) >= 0;
            item.style.display = match ? '' : 'none';
        });

        // 隐藏空的分类
        categories.forEach(function(cat) {
            var nextItem = cat.nextElementSibling;
            var hasVisible = false;
            while (nextItem && !nextItem.classList.contains('doc-category')) {
                if (nextItem.style.display !== 'none') {
                    hasVisible = true;
                    break;
                }
                nextItem = nextItem.nextElementSibling;
            }
            cat.style.display = hasVisible ? '' : 'none';
        });
    }

    // ===== 显示加载状态 =====
    function showLoading() {
        docContent.innerHTML = '<div class="doc-loading"><div class="loading-spinner"></div><p>正在加载文档...</p></div>';
    }

    // ===== 显示空状态 =====
    function showEmpty() {
        docContent.innerHTML = '<div class="doc-empty"><div class="doc-empty-icon">📭</div><p>暂无文档</p></div>';
    }

    // ===== 显示错误 =====
    function showError(message) {
        docContent.innerHTML = '<div class="doc-empty"><div class="doc-empty-icon">❌</div><p>' + escapeHtml(message) + '</p><p style="margin-top:16px;font-size:14px;">请确保文档文件位于 assets/doc/ 目录下</p></div>';
    }

    // ===== 打开侧边栏 =====
    function openSidebar() {
        sidebar.classList.add('open');
    }

    // ===== 关闭侧边栏 =====
    function closeSidebar() {
        sidebar.classList.remove('open');
    }

    // ===== 检查返回顶部按钮 =====
    function checkBackToTop() {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }

    // ===== 工具函数 =====
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 启动
    init();
})();