/**
 * 气球和气泡交互效果
 * 点击气球：放大效果后随机破碎
 * 点击气泡：立即破裂
 */

(function() {
    // 初始化交互效果
    function initInteractions() {
        console.log('初始化气球和气泡交互效果');
        
        // 气球点击效果
        const balloons = document.querySelectorAll('.balloon');
        console.log('找到气球数量:', balloons.length);
        
        balloons.forEach(balloon => {
            balloon.addEventListener('click', handleBalloonClick);
            balloon.addEventListener('touchstart', handleBalloonTouch, { passive: false });
        });

        // 气泡点击效果
        const bubbles = document.querySelectorAll('.bubble');
        console.log('找到气泡数量:', bubbles.length);
        
        bubbles.forEach(bubble => {
            bubble.addEventListener('click', handleBubbleClick);
            bubble.addEventListener('touchstart', handleBubbleTouch, { passive: false });
        });
    }

    /**
     * 处理气球点击
     * @param {Event} e - 点击事件
     */
    function handleBalloonClick(e) {
        e.stopPropagation();
        e.preventDefault();
        
        console.log('气球被点击');
        
        const balloon = e.currentTarget;
        
        // 停止所有动画
        balloon.style.animation = 'none';
        
        // 添加放大效果
        balloon.style.transform = 'scale(1.3)';
        balloon.style.transition = 'transform 0.2s ease';
        
        // 随机延迟后破碎（0.2-0.5秒）
        const delay = Math.random() * 300 + 200;
        
        setTimeout(() => {
            // 添加破碎动画
            balloon.classList.add('pop');
            
            // 创建碎片效果
            createBalloonFragments(balloon);
            
            // 动画结束后移除元素并重新创建
            setTimeout(() => {
                balloon.remove();
                recreateBalloon(balloon);
            }, 400);
        }, delay);
    }

    /**
     * 处理气球触摸（移动端）
     * @param {Event} e - 触摸事件
     */
    function handleBalloonTouch(e) {
        e.stopPropagation();
        e.preventDefault();
        handleBalloonClick(e);
    }

    /**
     * 处理气泡点击
     * @param {Event} e - 点击事件
     */
    function handleBubbleClick(e) {
        e.stopPropagation();
        e.preventDefault();
        
        console.log('气泡被点击');
        
        const bubble = e.currentTarget;
        
        // 停止所有动画
        bubble.style.animation = 'none';
        
        // 添加破裂动画
        bubble.classList.add('pop');
        
        // 创建破裂粒子效果
        createBubbleParticles(bubble);
        
        // 动画结束后移除元素并重新创建
        setTimeout(() => {
            bubble.remove();
            recreateBubble(bubble);
        }, 300);
    }

    /**
     * 处理气泡触摸（移动端）
     * @param {Event} e - 触摸事件
     */
    function handleBubbleTouch(e) {
        e.stopPropagation();
        e.preventDefault();
        handleBubbleClick(e);
    }

    /**
     * 创建气球碎片效果
     * @param {HTMLElement} balloon - 气球元素
     */
    function createBalloonFragments(balloon) {
        const rect = balloon.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 创建6-8个碎片
        const fragmentCount = Math.floor(Math.random() * 3) + 6;
        
        for (let i = 0; i < fragmentCount; i++) {
            const fragment = document.createElement('div');
            fragment.className = 'balloon-fragment';
            
            // 获取气球的颜色
            const balloonClass = balloon.className.split(' ')[1];
            fragment.style.background = getBalloonColor(balloonClass);
            
            // 设置位置和大小
            fragment.style.left = centerX + 'px';
            fragment.style.top = centerY + 'px';
            fragment.style.width = Math.random() * 15 + 10 + 'px';
            fragment.style.height = Math.random() * 15 + 10 + 'px';
            
            // 计算随机方向和距离
            const angle = Math.random() * Math.PI * 2; // 0到2π
            const distance = Math.random() * 100 + 50;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance + 50; // 添加向下重力
            
            // 设置动画终点位置
            fragment.style.setProperty('--end-x', endX + 'px');
            fragment.style.setProperty('--end-y', endY + 'px');
            
            document.body.appendChild(fragment);
            
            // 动画结束后移除
            setTimeout(() => fragment.remove(), 600);
        }
    }

    /**
     * 创建气泡破裂粒子效果
     * @param {HTMLElement} bubble - 气泡元素
     */
    function createBubbleParticles(bubble) {
        const rect = bubble.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 创建8-12个小粒子
        const particleCount = Math.floor(Math.random() * 5) + 8;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'bubble-particle';
            
            // 设置位置
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            
            // 计算随机方向和距离
            const angle = Math.random() * Math.PI * 2; // 0到2π
            const distance = Math.random() * 60 + 30;
            const endX = Math.cos(angle) * distance;
            const endY = Math.sin(angle) * distance;
            
            // 设置动画终点位置
            particle.style.setProperty('--end-x', endX + 'px');
            particle.style.setProperty('--end-y', endY + 'px');
            
            document.body.appendChild(particle);
            
            // 动画结束后移除
            setTimeout(() => particle.remove(), 400);
        }
    }

    /**
     * 获取气球颜色
     * @param {string} balloonClass - 气球类名
     * @returns {string} - 颜色值
     */
    function getBalloonColor(balloonClass) {
        const colors = {
            'balloon-1': 'rgba(255, 182, 193, 0.8)',
            'balloon-2': 'rgba(135, 206, 250, 0.8)',
            'balloon-3': 'rgba(255, 218, 185, 0.8)',
            'balloon-4': 'rgba(152, 251, 152, 0.8)',
            'balloon-5': 'rgba(221, 160, 221, 0.8)',
            'balloon-6': 'rgba(255, 255, 224, 0.8)',
            'balloon-7': 'rgba(176, 224, 230, 0.8)',
            'balloon-8': 'rgba(255, 160, 122, 0.8)'
        };
        return colors[balloonClass] || 'rgba(255, 255, 255, 0.8)';
    }

    /**
     * 重新创建气球
     * @param {HTMLElement} oldBalloon - 旧的气球元素
     */
    function recreateBalloon(oldBalloon) {
        const balloonClass = oldBalloon.className.split(' ')[1];
        const newBalloon = document.createElement('div');
        newBalloon.className = `balloon ${balloonClass}`;
        
        // 添加点击事件
        newBalloon.addEventListener('click', handleBalloonClick);
        newBalloon.addEventListener('touchstart', handleBalloonTouch, { passive: false });
        
        // 添加到容器
        const container = document.querySelector('.balloon-container');
        if (container) {
            container.appendChild(newBalloon);
        }
    }

    /**
     * 重新创建气泡
     * @param {HTMLElement} oldBubble - 旧的气泡元素
     */
    function recreateBubble(oldBubble) {
        const bubbleClass = oldBubble.className.split(' ')[1];
        const newBubble = document.createElement('div');
        newBubble.className = `bubble ${bubbleClass}`;
        
        // 添加点击事件
        newBubble.addEventListener('click', handleBubbleClick);
        newBubble.addEventListener('touchstart', handleBubbleTouch, { passive: false });
        
        // 添加到容器
        const container = document.querySelector('.bubble-container');
        if (container) {
            container.appendChild(newBubble);
        }
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInteractions);
    } else {
        initInteractions();
    }
})();