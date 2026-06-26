(function() {
    // 当前 HSV 状态 (H: 0-360, S: 0-100, V: 0-100)
    let hue = 0;
    let saturation = 100;
    let value = 100;

    // DOM 元素
    const gradientArea = document.getElementById('gradientArea');
    const gradientCursor = document.getElementById('gradientCursor');
    const hueStrip = document.getElementById('hueStrip');
    const hueCursor = document.getElementById('hueCursor');
    const previewColor = document.getElementById('previewColor');
    const previewHex = document.getElementById('previewHex');
    const previewRgb = document.getElementById('previewRgb');
    const hexValue = document.getElementById('hexValue');
    const rgbValue = document.getElementById('rgbValue');
    const hslValue = document.getElementById('hslValue');
    const hexInput = document.getElementById('hexInput');
    const applyBtn = document.getElementById('applyBtn');
    const presetsGrid = document.getElementById('presetsGrid');
    const recentSection = document.getElementById('recentSection');
    const recentGrid = document.getElementById('recentGrid');
    const copyBtns = document.querySelectorAll('.picker-copy-btn');

    // 预设颜色
    const presetColors = [
        '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFF00', '#ADFF2F', '#00FF00', '#00FA9A',
        '#00FFFF', '#00BFFF', '#0000FF', '#4B0082', '#8B00FF', '#FF00FF', '#FF1493', '#FF69B4',
        '#FFFFFF', '#C0C0C0', '#808080', '#404040', '#000000', '#8B4513', '#A0522D', '#D2691E',
        '#F0E68C', '#BDB76B', '#DAA520', '#B8860B', '#556B2F', '#6B8E23', '#228B22', '#006400'
    ];

    // 初始化预设颜色
    function initPresets() {
        presetColors.forEach(function(color) {
            var swatch = document.createElement('div');
            swatch.className = 'picker-color-swatch';
            swatch.style.background = color;
            swatch.addEventListener('click', function() {
                setColorFromHex(color);
            });
            presetsGrid.appendChild(swatch);
        });
    }

    // 初始化最近使用
    function initRecent() {
        var recent = getRecentColors();
        if (recent.length > 0) {
            recentSection.style.display = 'block';
            recentGrid.innerHTML = '';
            recent.forEach(function(color) {
                var swatch = document.createElement('div');
                swatch.className = 'picker-color-swatch';
                swatch.style.background = color;
                swatch.addEventListener('click', function() {
                    setColorFromHex(color);
                });
                recentGrid.appendChild(swatch);
            });
        }
    }

    // 获取最近使用的颜色
    function getRecentColors() {
        try {
            var stored = localStorage.getItem('colorPicker_recent');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    // 保存最近使用的颜色
    function saveRecentColor(hex) {
        var recent = getRecentColors();
        // 移除重复
        recent = recent.filter(function(c) { return c.toUpperCase() !== hex.toUpperCase(); });
        // 添加到开头
        recent.unshift(hex.toUpperCase());
        // 只保留最近 16 个
        if (recent.length > 16) recent = recent.slice(0, 16);
        try {
            localStorage.setItem('colorPicker_recent', JSON.stringify(recent));
        } catch (e) {}
        initRecent();
    }

    // 更新渐变区域的背景
    function updateGradient() {
        var hueColor = 'hsl(' + hue + ', 100%, 50%)';
        gradientArea.style.background = 
            'linear-gradient(to top, #000, transparent), ' +
            'linear-gradient(to right, #fff, ' + hueColor + ')';
    }

    // 更新光标位置
    function updateCursors() {
        // 渐变区域光标
        var x = saturation + '%';
        var y = (100 - value) + '%';
        gradientCursor.style.left = x;
        gradientCursor.style.top = y;

        // 色相条光标
        var huePercent = (hue / 360) * 100;
        hueCursor.style.top = huePercent + '%';
    }

    // 更新颜色显示
    function updateDisplay() {
        var rgb = hsvToRgb(hue, saturation, value);
        var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

        // 预览
        previewColor.style.background = hex;
        previewHex.textContent = hex;
        previewRgb.textContent = 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';

        // 颜色值
        hexValue.textContent = hex;
        rgbValue.textContent = 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
        hslValue.textContent = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';

        // 同步输入框
        hexInput.value = hex;
    }

    // 从 HEX 设置颜色
    function setColorFromHex(hex) {
        var rgb = hexToRgb(hex);
        if (!rgb) return;
        var hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        hue = hsv.h;
        saturation = hsv.s;
        value = hsv.v;
        updateGradient();
        updateCursors();
        updateDisplay();
    }

    // 渐变区域交互
    var isDraggingGradient = false;

    function handleGradientInteraction(e) {
        e.preventDefault();
        var rect = gradientArea.getBoundingClientRect();
        var clientX, clientY;

        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        var x = clientX - rect.left;
        var y = clientY - rect.top;

        saturation = Math.max(0, Math.min(100, (x / rect.width) * 100));
        value = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));

        updateCursors();
        updateDisplay();
    }

    gradientArea.addEventListener('mousedown', function(e) {
        isDraggingGradient = true;
        handleGradientInteraction(e);
    });

    gradientArea.addEventListener('touchstart', function(e) {
        isDraggingGradient = true;
        handleGradientInteraction(e);
    }, { passive: false });

    document.addEventListener('mousemove', function(e) {
        if (isDraggingGradient) handleGradientInteraction(e);
    });

    document.addEventListener('touchmove', function(e) {
        if (isDraggingGradient) handleGradientInteraction(e);
    }, { passive: false });

    document.addEventListener('mouseup', function() {
        if (isDraggingGradient) {
            isDraggingGradient = false;
            saveRecentColor(hexValue.textContent);
        }
    });

    document.addEventListener('touchend', function() {
        if (isDraggingGradient) {
            isDraggingGradient = false;
            saveRecentColor(hexValue.textContent);
        }
    });

    // 色相条交互
    var isDraggingHue = false;

    function handleHueInteraction(e) {
        e.preventDefault();
        var rect = hueStrip.getBoundingClientRect();
        var clientY;

        if (e.touches) {
            clientY = e.touches[0].clientY;
        } else {
            clientY = e.clientY;
        }

        var y = clientY - rect.top;
        hue = Math.max(0, Math.min(360, (y / rect.height) * 360));

        updateGradient();
        updateCursors();
        updateDisplay();
    }

    hueStrip.addEventListener('mousedown', function(e) {
        isDraggingHue = true;
        handleHueInteraction(e);
    });

    hueStrip.addEventListener('touchstart', function(e) {
        isDraggingHue = true;
        handleHueInteraction(e);
    }, { passive: false });

    document.addEventListener('mousemove', function(e) {
        if (isDraggingHue) handleHueInteraction(e);
    });

    document.addEventListener('touchmove', function(e) {
        if (isDraggingHue) handleHueInteraction(e);
    }, { passive: false });

    document.addEventListener('mouseup', function() {
        if (isDraggingHue) {
            isDraggingHue = false;
            saveRecentColor(hexValue.textContent);
        }
    });

    document.addEventListener('touchend', function() {
        if (isDraggingHue) {
            isDraggingHue = false;
            saveRecentColor(hexValue.textContent);
        }
    });

    // 复制按钮
    copyBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var targetId = this.dataset.target;
            var text = document.getElementById(targetId).textContent;
            
            copyToClipboard(text);
            
            this.textContent = '已复制';
            this.classList.add('copied');
            
            var self = this;
            setTimeout(function() {
                self.textContent = '复制';
                self.classList.remove('copied');
            }, 1500);
        });
    });

    // 复制到剪贴板
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function() {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
        } catch (e) {}
        document.body.removeChild(textarea);
    }

    // 应用按钮
    applyBtn.addEventListener('click', function() {
        var hex = hexInput.value.trim();
        if (!hex.startsWith('#')) hex = '#' + hex;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            setColorFromHex(hex);
            saveRecentColor(hex);
        } else {
            alert('请输入有效的 HEX 颜色值，如 #FF0000');
        }
    });

    // 颜色转换函数
    function hsvToRgb(h, s, v) {
        s /= 100;
        v /= 100;
        var c = v * s;
        var x = c * (1 - Math.abs((h / 60) % 2 - 1));
        var m = v - c;
        var r, g, b;

        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(function(x) {
            var hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        if (hex.length !== 6) return null;
        var num = parseInt(hex, 16);
        if (isNaN(num)) return null;
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, v = max;
        var d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            v: Math.round(v * 100)
        };
    }

    // 初始化
    initPresets();
    initRecent();
    updateGradient();
    updateCursors();
    updateDisplay();
})();
