/**
 * 背景图片管理器
 * 用于在首页和计算器页面随机显示风景背景图
 */

(function() {
    // 本地背景图片列表（5张风景图）
    const backgrounds = [
        'assets/backgrounds/landscape1.jpg',  // 风景1
        'assets/backgrounds/landscape2.jpg',  // 风景2
        'assets/backgrounds/landscape3.jpg',  // 风景3
        'assets/backgrounds/landscape4.jpg',  // 风景4
        'assets/backgrounds/landscape5.jpg'   // 风景5
    ];

    // 备用渐变背景（如果图片加载失败）
    const fallbackGradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];

    // 当前背景索引
    let currentBackgroundIndex = -1;

    /**
     * 随机选择一张背景图片
     * @returns {string} 背景图片URL
     */
    function getRandomBackground() {
        let newIndex;
        // 确保不会连续两次选择同一张图片
        do {
            newIndex = Math.floor(Math.random() * backgrounds.length);
        } while (newIndex === currentBackgroundIndex && backgrounds.length > 1);

        currentBackgroundIndex = newIndex;
        return backgrounds[newIndex];
    }

    /**
     * 设置背景图片
     * @param {string} imageUrl - 图片URL
     */
    function setBackground(imageUrl) {
        const body = document.body;

        // 创建背景容器
        let bgContainer = document.getElementById('dynamic-background');
        if (!bgContainer) {
            bgContainer = document.createElement('div');
            bgContainer.id = 'dynamic-background';
            bgContainer.className = 'dynamic-background';
            body.insertBefore(bgContainer, body.firstChild);
        }

        // 先设置备用渐变背景
        bgContainer.style.background = fallbackGradients[currentBackgroundIndex] || fallbackGradients[0];
        bgContainer.classList.add('loaded');

        // 预加载图片
        const img = new Image();
        
        img.onload = function() {
            // 图片加载完成后设置背景
            bgContainer.style.backgroundImage = `url(${imageUrl})`;
            bgContainer.style.backgroundSize = 'cover';
            bgContainer.style.backgroundPosition = 'center center';
            
            // 添加淡入动画
            setTimeout(() => {
                bgContainer.classList.add('fade-in');
            }, 100);
        };

        img.onerror = function() {
            console.warn('背景图片加载失败，使用备用渐变背景:', imageUrl);
            // 保持备用渐变背景
            bgContainer.classList.add('loaded');
        };

        img.src = imageUrl;
    }

    /**
     * 初始化背景
     */
    function initBackground() {
        const randomBg = getRandomBackground();
        setBackground(randomBg);
    }

    /**
     * 切换到下一张背景（可选功能）
     */
    function nextBackground() {
        const nextBg = getRandomBackground();
        setBackground(nextBg);
    }

    // 页面加载完成后初始化背景
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackground);
    } else {
        initBackground();
    }

    // 导出功能（如果需要手动切换背景）
    window.BackgroundManager = {
        init: initBackground,
        next: nextBackground,
        getCurrent: () => backgrounds[currentBackgroundIndex]
    };
})();