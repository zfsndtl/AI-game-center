(function() {
    // 状态
    var images = []; // [{id, img, name, duration, transition}]
    var textOverlays = []; // [{id, text, position, fontSize, color, strokeColor, timing, startImage, endImage, animation}]
    var TRANSITION_DURATION = 0.5;
    var TEXT_ANIM_DURATION = 0.4;
    var TRANSITION_MAP = {
        'page': '📖', 'flash': '⚡', 'zoomin': '🔍', 'zoomout': '🔎', 'blur': '💨',
        'slideleft': '👈', 'slideup': '👆', 'wipe': '🧹', 'rotate': '🔄', 'fade': '✨'
    };

    // 预览状态
    var isPlaying = false;
    var previewStartTime = 0;
    var previewElapsed = 0;
    var animFrameId = null;
    var isExporting = false;

    // DOM
    var canvas = document.getElementById('previewCanvas');
    var ctx = canvas.getContext('2d');
    var canvasPlaceholder = document.getElementById('canvasPlaceholder');
    var playBtn = document.getElementById('playBtn');
    var playIcon = document.getElementById('playIcon');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var progressInfo = document.getElementById('progressInfo');
    var uploadArea = document.getElementById('uploadArea');
    var fileInput = document.getElementById('fileInput');
    var uploadHint = document.getElementById('uploadHint');
    var timelineSection = document.getElementById('timelineSection');
    var timelineList = document.getElementById('timelineList');
    var globalSettings = document.getElementById('globalSettings');
    var globalDuration = document.getElementById('globalDuration');
    var globalTransition = document.getElementById('globalTransition');
    var applyGlobalBtn = document.getElementById('applyGlobalBtn');
    var exportSection = document.getElementById('exportSection');
    var exportBtn = document.getElementById('exportBtn');
    var exportProgress = document.getElementById('exportProgress');
    var exportProgressFill = document.getElementById('exportProgressFill');
    var exportProgressText = document.getElementById('exportProgressText');
    var resultSection = document.getElementById('resultSection');
    var resultVideo = document.getElementById('resultVideo');
    var downloadBtn = document.getElementById('downloadBtn');
    var closeResultBtn = document.getElementById('closeResultBtn');

    // 编辑弹窗
    var editModal = document.getElementById('editModal');
    var editModalClose = document.getElementById('editModalClose');
    var editPreviewImg = document.getElementById('editPreviewImg');
    var editIndex = document.getElementById('editIndex');
    var editDuration = document.getElementById('editDuration');
    var editDurationValue = document.getElementById('editDurationValue');
    var editTransition = document.getElementById('editTransition');
    var removeImageBtn = document.getElementById('removeImageBtn');
    var editSaveBtn = document.getElementById('editSaveBtn');
    var editingIndex = -1;
    var editSelectedTransition = 'page';

    // 文字弹窗
    var textModal = document.getElementById('textModal');
    var textModalTitle = document.getElementById('textModalTitle');
    var textModalClose = document.getElementById('textModalClose');
    var textContentInput = document.getElementById('textContentInput');
    var positionGrid = document.getElementById('positionGrid');
    var textFontSize = document.getElementById('textFontSize');
    var textFontSizeValue = document.getElementById('textFontSizeValue');
    var textColorOptions = document.getElementById('textColorOptions');
    var textStrokeOptions = document.getElementById('textStrokeOptions');
    var textTimingSelect = document.getElementById('textTimingSelect');
    var textImageRangeGroup = document.getElementById('textImageRangeGroup');
    var textStartImage = document.getElementById('textStartImage');
    var textEndImage = document.getElementById('textEndImage');
    var textAnimOptions = document.getElementById('textAnimOptions');
    var removeTextBtn = document.getElementById('removeTextBtn');
    var textSaveBtn = document.getElementById('textSaveBtn');
    var addTextBtn = document.getElementById('addTextBtn');
    var textOverlayList = document.getElementById('textOverlayList');
    var textOverlayEmpty = document.getElementById('textOverlayEmpty');
    var editingTextIndex = -1;
    var editSelectedPosition = 'center';
    var editSelectedColor = '#ffffff';
    var editSelectedStroke = 'none';
    var editSelectedAnim = 'fadeIn';

    // ===== 图片上传 =====
    uploadArea.addEventListener('click', function() { fileInput.click(); });
    uploadArea.addEventListener('dragover', function(e) { e.preventDefault(); this.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', function(e) { e.preventDefault(); this.classList.remove('dragover'); });
    uploadArea.addEventListener('drop', function(e) { e.preventDefault(); this.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', function(e) { handleFiles(e.target.files); this.value = ''; });

    function handleFiles(files) {
        var remaining = 20 - images.length;
        if (remaining <= 0) { alert('最多添加 20 张图片'); return; }
        var imageFiles = [];
        for (var i = 0; i < files.length && imageFiles.length < remaining; i++) {
            if (files[i].type.startsWith('image/')) imageFiles.push(files[i]);
        }
        if (imageFiles.length === 0) return;
        var loaded = 0;
        imageFiles.forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    images.push({
                        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                        img: img, src: e.target.result,
                        name: file.name.replace(/\.[^/.]+$/, ''),
                        duration: parseFloat(globalDuration.value),
                        transition: globalTransition.value
                    });
                    loaded++;
                    if (loaded === imageFiles.length) updateUI();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ===== UI 更新 =====
    function updateUI() {
        var count = images.length;
        uploadHint.textContent = '已添加 ' + count + ' 张图片' + (count >= 20 ? ' (已满)' : '');
        canvasPlaceholder.style.display = count === 0 ? 'flex' : 'none';
        if (count > 0) {
            timelineSection.style.display = 'block';
            globalSettings.style.display = 'block';
            exportSection.style.display = 'block';
            renderTimeline();
            renderTextOverlayList();
            drawFrame(0);
        } else {
            timelineSection.style.display = 'none';
            globalSettings.style.display = 'none';
            exportSection.style.display = 'none';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        updateProgressInfo();
    }

    function renderTimeline() {
        timelineList.innerHTML = '';
        images.forEach(function(item, index) {
            var el = document.createElement('div');
            el.className = 'timeline-item';
            el.innerHTML =
                '<img class="timeline-item-img" src="' + item.src + '" alt="" />' +
                '<div class="timeline-item-info"><span class="timeline-item-index">#' + (index + 1) + '</span><span class="timeline-item-duration">' + item.duration + 's</span></div>' +
                '<div class="timeline-item-transition">' + (TRANSITION_MAP[item.transition] || '📖') + '</div>';
            el.addEventListener('click', function() { openEditModal(index); });
            timelineList.appendChild(el);
        });
    }

    // ===== 文字叠加列表 =====
    function renderTextOverlayList() {
        var items = textOverlayList.querySelectorAll('.text-overlay-item');
        items.forEach(function(el) { el.remove(); });
        textOverlayEmpty.style.display = textOverlays.length === 0 ? 'block' : 'none';
        textOverlays.forEach(function(item, index) {
            var el = document.createElement('div');
            el.className = 'text-overlay-item';
            var timingText = item.timing === 'all' ? '全程' : ('第' + item.startImage + '-' + item.endImage + '张');
            el.innerHTML =
                '<div class="text-overlay-item-color" style="background:' + item.color + ';"></div>' +
                '<div class="text-overlay-item-content">' +
                    '<div class="text-overlay-item-text">' + escapeHtml(item.text) + '</div>' +
                    '<div class="text-overlay-item-meta">' + item.fontSize + 'px · ' + timingText + ' · ' + item.position + '</div>' +
                '</div>' +
                '<div class="text-overlay-item-actions">' +
                    '<button class="text-overlay-item-btn edit-text-btn" data-index="' + index + '">' +
                        '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>' +
                    '</button>' +
                    '<button class="text-overlay-item-btn delete-btn delete-text-btn" data-index="' + index + '">' +
                        '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
                    '</button>' +
                '</div>';
            el.querySelector('.edit-text-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                openTextModal(parseInt(this.getAttribute('data-index')));
            });
            el.querySelector('.delete-text-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.getAttribute('data-index'));
                if (confirm('确定删除这条文字吗？')) {
                    textOverlays.splice(idx, 1);
                    renderTextOverlayList();
                    if (!isPlaying) drawFrame(previewElapsed);
                }
            });
            textOverlayList.appendChild(el);
        });
    }

    // ===== 画布渲染 =====
    function drawImageCover(img, x, y, w, h, offsetX, offsetY, scale, alpha, blurAmount) {
        ctx.save();
        ctx.globalAlpha = alpha !== undefined ? alpha : 1;
        if (blurAmount) ctx.filter = 'blur(' + blurAmount + 'px)';
        var imgRatio = img.width / img.height;
        var canvasRatio = w / h;
        var drawW, drawH;
        if (imgRatio > canvasRatio) { drawH = h; drawW = h * imgRatio; }
        else { drawW = w; drawH = w / imgRatio; }
        var dx = x + (w - drawW) / 2;
        var dy = y + (h - drawH) / 2;
        if (scale && scale !== 1) {
            var cx = x + w / 2, cy = y + h / 2;
            ctx.translate(cx, cy); ctx.scale(scale, scale); ctx.translate(-cx, -cy);
        }
        ctx.drawImage(img, dx + (offsetX || 0), dy + (offsetY || 0), drawW, drawH);
        ctx.restore();
    }

    function getCurrentImageIndex(elapsed) {
        if (images.length === 0) return -1;
        var acc = 0;
        for (var i = 0; i < images.length; i++) {
            var segDuration = images[i].duration;
            if (i < images.length - 1) segDuration += TRANSITION_DURATION;
            if (elapsed < acc + segDuration) return i;
            acc += segDuration;
        }
        return images.length - 1;
    }

    function drawFrame(elapsed) {
        if (images.length === 0) return;
        var totalTime = getTotalDuration();
        if (elapsed >= totalTime) elapsed = totalTime - 0.001;
        if (elapsed < 0) elapsed = 0;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 找到当前图片
        var acc = 0, currentIndex = 0;
        for (var i = 0; i < images.length; i++) {
            var segDuration = images[i].duration;
            if (i < images.length - 1) segDuration += TRANSITION_DURATION;
            if (elapsed < acc + segDuration) { currentIndex = i; break; }
            acc += segDuration;
            if (i === images.length - 1) currentIndex = i;
        }

        var item = images[currentIndex];
        var localTime = elapsed - acc;
        var inTransition = false, transitionProgress = 0, nextIndex = currentIndex + 1;

        if (currentIndex < images.length - 1 && localTime > item.duration) {
            inTransition = true;
            transitionProgress = Math.min(1, Math.max(0, (localTime - item.duration) / TRANSITION_DURATION));
        }

        if (!inTransition) {
            drawImageCover(item.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, 1, 0);
        } else {
            var nextItem = images[nextIndex];
            var t = transitionProgress;
            var easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            drawTransition(item.transition, item, nextItem, easeT);
        }

        // 绘制文字叠加
        drawTextOverlays(elapsed, currentIndex);
    }

    // ===== 转场动画 =====
    function drawTransition(type, current, next, t) {
        switch (type) {
            case 'page': drawPageTransition(current, next, t); break;
            case 'flash': drawFlashTransition(current, next, t); break;
            case 'zoomin': drawZoomInTransition(current, next, t); break;
            case 'zoomout': drawZoomOutTransition(current, next, t); break;
            case 'blur': drawBlurTransition(current, next, t); break;
            case 'slideleft': drawSlideLeftTransition(current, next, t); break;
            case 'slideup': drawSlideUpTransition(current, next, t); break;
            case 'wipe': drawWipeTransition(current, next, t); break;
            case 'rotate': drawRotateTransition(current, next, t); break;
            case 'fade': drawFadeTransition(current, next, t); break;
            default: drawFlashTransition(current, next, t);
        }
    }

    function drawPageTransition(current, next, t) {
        var w = canvas.width, h = canvas.height;
        ctx.save();
        var scaleX = Math.cos(t * Math.PI);
        if (scaleX > 0) { var cw = w * scaleX; ctx.beginPath(); ctx.rect((w - cw) / 2, 0, cw, h); ctx.clip(); drawImageCover(current.img, 0, 0, w, h, 0, 0, 1, 1, 0); }
        ctx.restore();
        ctx.save();
        var nsx = Math.cos((1 - t) * Math.PI);
        if (nsx > 0) { var nw = w * nsx; ctx.beginPath(); ctx.rect((w - nw) / 2, 0, nw, h); ctx.clip(); drawImageCover(next.img, 0, 0, w, h, 0, 0, 1, 1, 0); }
        ctx.restore();
    }

    function drawFlashTransition(current, next, t) {
        if (t < 0.5) drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, 1 - t * 2, 0);
        else drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, (t - 0.5) * 2, 0);
    }

    function drawZoomInTransition(current, next, t) {
        if (t < 0.5) drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, 1 + t * 0.6, 1 - t * 2, 0);
        else drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, 0.7 + (t - 0.5) * 0.6, (t - 0.5) * 2, 0);
    }

    function drawZoomOutTransition(current, next, t) {
        if (t < 0.5) drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, 1 - t * 0.4, 1 - t * 2, 0);
        else drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, 1.3 - (t - 0.5) * 0.6, (t - 0.5) * 2, 0);
    }

    function drawBlurTransition(current, next, t) {
        if (t < 0.5) drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, Math.max(0, 1 - t * 1.5), t * 30);
        else drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, Math.min(1, (t - 0.5) * 2), (1 - t) * 30);
    }

    function drawSlideLeftTransition(current, next, t) {
        var w = canvas.width, h = canvas.height;
        var offset = t * w;
        drawImageCover(current.img, 0, 0, w, h, -offset, 0, 1, 1, 0);
        drawImageCover(next.img, 0, 0, w, h, w - offset, 0, 1, 1, 0);
    }

    function drawSlideUpTransition(current, next, t) {
        var w = canvas.width, h = canvas.height;
        var offset = t * h;
        drawImageCover(current.img, 0, 0, w, h, 0, -offset, 1, 1, 0);
        drawImageCover(next.img, 0, 0, w, h, 0, h - offset, 1, 1, 0);
    }

    function drawWipeTransition(current, next, t) {
        var w = canvas.width, h = canvas.height;
        var wipeX = t * w;
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, w - wipeX, h); ctx.clip();
        drawImageCover(current.img, 0, 0, w, h, 0, 0, 1, 1, 0);
        ctx.restore();
        ctx.save();
        ctx.beginPath(); ctx.rect(w - wipeX, 0, wipeX, h); ctx.clip();
        drawImageCover(next.img, 0, 0, w, h, 0, 0, 1, 1, 0);
        ctx.restore();
    }

    function drawRotateTransition(current, next, t) {
        var w = canvas.width, h = canvas.height;
        var cx = w / 2, cy = h / 2;
        // 当前图旋转淡出
        ctx.save();
        var angle1 = t * Math.PI / 2;
        var scale1 = 1 - t * 0.3;
        ctx.globalAlpha = 1 - t;
        ctx.translate(cx, cy); ctx.rotate(angle1); ctx.scale(scale1, scale1); ctx.translate(-cx, -cy);
        drawImageCover(current.img, 0, 0, w, h, 0, 0, 1, 1, 0);
        ctx.restore();
        // 新图从反方向旋转进入
        ctx.save();
        var angle2 = (1 - t) * (-Math.PI / 2);
        var scale2 = 0.7 + t * 0.3;
        ctx.globalAlpha = t;
        ctx.translate(cx, cy); ctx.rotate(angle2); ctx.scale(scale2, scale2); ctx.translate(-cx, -cy);
        drawImageCover(next.img, 0, 0, w, h, 0, 0, 1, 1, 0);
        ctx.restore();
    }

    function drawFadeTransition(current, next, t) {
        drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, 1 - t, 0);
        drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, t, 0);
    }

    // ===== 文字叠加渲染 =====
    function drawTextOverlays(elapsed, currentImageIndex) {
        textOverlays.forEach(function(overlay) {
            // 判断是否应该显示
            if (!shouldShowText(overlay, elapsed, currentImageIndex)) return;

            // 计算文字出现时间（用于动画）
            var appearTime = getTextAppearTime(overlay);
            var timeSinceAppear = elapsed - appearTime;
            var animProgress = Math.min(1, Math.max(0, timeSinceAppear / TEXT_ANIM_DURATION));
            var easeAnim = animProgress < 0.5 ? 2 * animProgress * animProgress : -1 + (4 - 2 * animProgress) * animProgress;

            // 计算位置
            var pos = getTextPosition(overlay.position, overlay.fontSize);

            ctx.save();

            // 应用入场动画
            var alpha = 1, offsetX = 0, offsetY = 0, scaleVal = 1, displayText = overlay.text;
            switch (overlay.animation) {
                case 'fadeIn':
                    alpha = easeAnim;
                    break;
                case 'slideUp':
                    alpha = easeAnim;
                    offsetY = (1 - easeAnim) * 30;
                    break;
                case 'scaleIn':
                    alpha = easeAnim;
                    scaleVal = 0.5 + easeAnim * 0.5;
                    break;
                case 'typewriter':
                    var charCount = Math.floor(easeAnim * overlay.text.length);
                    displayText = overlay.text.substring(0, charCount);
                    break;
                default: break;
            }

            ctx.globalAlpha = alpha;
            ctx.font = 'bold ' + overlay.fontSize + 'px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = pos.align;
            ctx.textBaseline = pos.baseline;

            var tx = pos.x, ty = pos.y;
            if (scaleVal !== 1) {
                ctx.translate(tx, ty);
                ctx.scale(scaleVal, scaleVal);
                ctx.translate(-tx, -ty);
            }

            // 描边
            if (overlay.strokeColor && overlay.strokeColor !== 'none') {
                ctx.strokeStyle = overlay.strokeColor;
                ctx.lineWidth = 3;
                ctx.lineJoin = 'round';
                ctx.strokeText(displayText, tx + offsetX, ty + offsetY);
            }

            // 阴影增强可读性
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            // 填充文字
            ctx.fillStyle = overlay.color;
            ctx.fillText(displayText, tx + offsetX, ty + offsetY);

            ctx.restore();
        });
    }

    function shouldShowText(overlay, elapsed, currentImageIndex) {
        if (overlay.timing === 'all') return true;
        // 判断当前在第几张图
        var acc = 0;
        for (var i = 0; i < images.length; i++) {
            var segDuration = images[i].duration;
            if (i < images.length - 1) segDuration += TRANSITION_DURATION;
            if (elapsed < acc + segDuration) {
                return (i + 1) >= overlay.startImage && (i + 1) <= overlay.endImage;
            }
            acc += segDuration;
        }
        return (images.length) >= overlay.startImage && (images.length) <= overlay.endImage;
    }

    function getTextAppearTime(overlay) {
        if (overlay.timing === 'all') return 0;
        var acc = 0;
        for (var i = 0; i < overlay.startImage - 1 && i < images.length; i++) {
            acc += images[i].duration;
            if (i < images.length - 1) acc += TRANSITION_DURATION;
        }
        return acc;
    }

    function getTextPosition(position, fontSize) {
        var w = canvas.width, h = canvas.height;
        var pad = fontSize * 0.8;
        var positions = {
            'top-left': { x: pad, y: pad, align: 'left', baseline: 'top' },
            'top-center': { x: w / 2, y: pad, align: 'center', baseline: 'top' },
            'top-right': { x: w - pad, y: pad, align: 'right', baseline: 'top' },
            'center-left': { x: pad, y: h / 2, align: 'left', baseline: 'middle' },
            'center': { x: w / 2, y: h / 2, align: 'center', baseline: 'middle' },
            'center-right': { x: w - pad, y: h / 2, align: 'right', baseline: 'middle' },
            'bottom-left': { x: pad, y: h - pad, align: 'left', baseline: 'bottom' },
            'bottom-center': { x: w / 2, y: h - pad, align: 'center', baseline: 'bottom' },
            'bottom-right': { x: w - pad, y: h - pad, align: 'right', baseline: 'bottom' }
        };
        return positions[position] || positions['center'];
    }

    // ===== 时间计算 =====
    function getTotalDuration() {
        var total = 0;
        for (var i = 0; i < images.length; i++) {
            total += images[i].duration;
            if (i < images.length - 1) total += TRANSITION_DURATION;
        }
        return total;
    }

    function formatTime(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function updateProgressInfo() {
        var total = getTotalDuration();
        progressInfo.textContent = formatTime(previewElapsed || 0) + ' / ' + formatTime(total);
    }

    // ===== 预览播放 =====
    playBtn.addEventListener('click', function() {
        if (images.length === 0) return;
        if (isPlaying) stopPreview(); else startPreview();
    });

    prevBtn.addEventListener('click', function() {
        if (images.length === 0) return;
        stopPreview();
        var acc = 0;
        for (var i = 0; i < images.length; i++) {
            var seg = images[i].duration + (i < images.length - 1 ? TRANSITION_DURATION : 0);
            if (acc > 0 && previewElapsed <= acc + seg) { previewElapsed = Math.max(0, acc - (i > 0 ? TRANSITION_DURATION : 0)); break; }
            acc += seg;
        }
        drawFrame(previewElapsed); updateProgressInfo();
    });

    nextBtn.addEventListener('click', function() {
        if (images.length === 0) return;
        stopPreview();
        var acc = 0;
        for (var i = 0; i < images.length; i++) {
            var seg = images[i].duration + (i < images.length - 1 ? TRANSITION_DURATION : 0);
            if (acc > previewElapsed) { previewElapsed = acc; break; }
            acc += seg;
        }
        drawFrame(previewElapsed); updateProgressInfo();
    });

    function startPreview() {
        isPlaying = true;
        playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        previewStartTime = performance.now() - previewElapsed * 1000;
        previewLoop();
    }

    function stopPreview() {
        isPlaying = false;
        playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    }

    function previewLoop() {
        if (!isPlaying) return;
        previewElapsed = (performance.now() - previewStartTime) / 1000;
        var total = getTotalDuration();
        if (previewElapsed >= total) { previewElapsed = 0; previewStartTime = performance.now(); }
        drawFrame(previewElapsed);
        updateProgressInfo();
        animFrameId = requestAnimationFrame(previewLoop);
    }

    // ===== 全局设置 =====
    applyGlobalBtn.addEventListener('click', function() {
        var dur = parseFloat(globalDuration.value);
        var trans = globalTransition.value;
        images.forEach(function(item) { item.duration = dur; item.transition = trans; });
        renderTimeline(); updateProgressInfo();
    });

    // ===== 图片编辑弹窗 =====
    function openEditModal(index) {
        editingIndex = index;
        var item = images[index];
        editPreviewImg.src = item.src;
        editIndex.textContent = '#' + (index + 1) + ' ' + item.name;
        editDuration.value = item.duration;
        editDurationValue.textContent = item.duration + ' 秒';
        editSelectedTransition = item.transition;
        updateTransitionButtons();
        editModal.style.display = 'flex';
    }

    function closeEditModal() { editModal.style.display = 'none'; editingIndex = -1; }
    editModalClose.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', function(e) { if (e.target === editModal) closeEditModal(); });
    editDuration.addEventListener('input', function() { editDurationValue.textContent = this.value + ' 秒'; });

    var transitionBtns = editTransition.querySelectorAll('.transition-opt');
    transitionBtns.forEach(function(btn) {
        btn.addEventListener('click', function() { editSelectedTransition = this.getAttribute('data-value'); updateTransitionButtons(); });
    });

    function updateTransitionButtons() {
        transitionBtns.forEach(function(btn) { btn.classList.toggle('active', btn.getAttribute('data-value') === editSelectedTransition); });
    }

    removeImageBtn.addEventListener('click', function() {
        if (editingIndex < 0) return;
        if (!confirm('确定要移除这张图片吗？')) return;
        images.splice(editingIndex, 1);
        closeEditModal(); stopPreview(); previewElapsed = 0; updateUI();
    });

    editSaveBtn.addEventListener('click', function() {
        if (editingIndex < 0) return;
        images[editingIndex].duration = parseFloat(editDuration.value);
        images[editingIndex].transition = editSelectedTransition;
        closeEditModal(); renderTimeline(); updateProgressInfo();
        if (!isPlaying) drawFrame(previewElapsed);
    });

    // ===== 文字编辑弹窗 =====
    addTextBtn.addEventListener('click', function() { openTextModal(-1); });

    function openTextModal(index) {
        editingTextIndex = index;
        if (index >= 0) {
            // 编辑模式
            var item = textOverlays[index];
            textModalTitle.textContent = '编辑文字';
            textContentInput.value = item.text;
            editSelectedPosition = item.position;
            textFontSize.value = item.fontSize;
            textFontSizeValue.textContent = item.fontSize + 'px';
            editSelectedColor = item.color;
            editSelectedStroke = item.strokeColor || 'none';
            textTimingSelect.value = item.timing;
            textStartImage.value = item.startImage || 1;
            textEndImage.value = item.endImage || images.length;
            editSelectedAnim = item.animation || 'fadeIn';
            removeTextBtn.style.display = 'flex';
        } else {
            // 新增模式
            textModalTitle.textContent = '添加文字';
            textContentInput.value = '';
            editSelectedPosition = 'center';
            textFontSize.value = 32;
            textFontSizeValue.textContent = '32px';
            editSelectedColor = '#ffffff';
            editSelectedStroke = 'none';
            textTimingSelect.value = 'all';
            textStartImage.value = 1;
            textEndImage.value = images.length;
            editSelectedAnim = 'fadeIn';
            removeTextBtn.style.display = 'none';
        }
        textImageRangeGroup.style.display = textTimingSelect.value === 'image' ? 'block' : 'none';
        updatePositionGrid();
        updateColorButtons();
        updateStrokeButtons();
        updateTextAnimButtons();
        textModal.style.display = 'flex';
    }

    function closeTextModal() { textModal.style.display = 'none'; editingTextIndex = -1; }
    textModalClose.addEventListener('click', closeTextModal);
    textModal.addEventListener('click', function(e) { if (e.target === textModal) closeTextModal(); });

    textFontSize.addEventListener('input', function() { textFontSizeValue.textContent = this.value + 'px'; });

    // 位置网格
    positionGrid.querySelectorAll('.position-cell').forEach(function(cell) {
        cell.addEventListener('click', function() {
            editSelectedPosition = this.getAttribute('data-pos');
            updatePositionGrid();
        });
    });

    function updatePositionGrid() {
        positionGrid.querySelectorAll('.position-cell').forEach(function(cell) {
            cell.classList.toggle('active', cell.getAttribute('data-pos') === editSelectedPosition);
        });
    }

    // 颜色选项
    textColorOptions.querySelectorAll('.color-opt').forEach(function(btn) {
        btn.addEventListener('click', function() { editSelectedColor = this.getAttribute('data-color'); updateColorButtons(); });
    });

    function updateColorButtons() {
        textColorOptions.querySelectorAll('.color-opt').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-color') === editSelectedColor);
        });
    }

    // 描边选项
    textStrokeOptions.querySelectorAll('.stroke-opt').forEach(function(btn) {
        btn.addEventListener('click', function() { editSelectedStroke = this.getAttribute('data-color'); updateStrokeButtons(); });
    });

    function updateStrokeButtons() {
        textStrokeOptions.querySelectorAll('.stroke-opt').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-color') === editSelectedStroke);
        });
    }

    // 显示时机
    textTimingSelect.addEventListener('change', function() {
        textImageRangeGroup.style.display = this.value === 'image' ? 'block' : 'none';
    });

    // 文字动画
    textAnimOptions.querySelectorAll('.text-anim-opt').forEach(function(btn) {
        btn.addEventListener('click', function() { editSelectedAnim = this.getAttribute('data-value'); updateTextAnimButtons(); });
    });

    function updateTextAnimButtons() {
        textAnimOptions.querySelectorAll('.text-anim-opt').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-value') === editSelectedAnim);
        });
    }

    // 删除文字
    removeTextBtn.addEventListener('click', function() {
        if (editingTextIndex < 0) return;
        if (!confirm('确定删除这条文字吗？')) return;
        textOverlays.splice(editingTextIndex, 1);
        closeTextModal();
        renderTextOverlayList();
        if (!isPlaying) drawFrame(previewElapsed);
    });

    // 保存文字
    textSaveBtn.addEventListener('click', function() {
        var text = textContentInput.value.trim();
        if (!text) { alert('请输入文字内容'); return; }

        var data = {
            id: 'txt_' + Date.now(),
            text: text,
            position: editSelectedPosition,
            fontSize: parseInt(textFontSize.value),
            color: editSelectedColor,
            strokeColor: editSelectedStroke,
            timing: textTimingSelect.value,
            startImage: parseInt(textStartImage.value) || 1,
            endImage: parseInt(textEndImage.value) || images.length,
            animation: editSelectedAnim
        };

        if (editingTextIndex >= 0) {
            data.id = textOverlays[editingTextIndex].id;
            textOverlays[editingTextIndex] = data;
        } else {
            textOverlays.push(data);
        }

        closeTextModal();
        renderTextOverlayList();
        if (!isPlaying) drawFrame(previewElapsed);
    });

    // ===== 视频导出 =====
    exportBtn.addEventListener('click', function() {
        if (images.length < 5) { alert('至少需要 5 张图片才能导出视频'); return; }
        if (isExporting) return;
        exportVideo();
    });

    function exportVideo() {
        isExporting = true;
        exportBtn.disabled = true;
        exportProgress.style.display = 'block';
        resultSection.style.display = 'none';

        var totalDuration = getTotalDuration();
        var fps = 30;
        var totalFrames = Math.ceil(totalDuration * fps);

        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        var exportCtx = exportCanvas.getContext('2d');

        var stream = exportCanvas.captureStream(fps);
        var mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        var recorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 5000000 });
        var chunks = [];

        recorder.ondataavailable = function(e) { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = function() {
            var blob = new Blob(chunks, { type: 'video/webm' });
            var url = URL.createObjectURL(blob);
            resultVideo.src = url;
            resultSection.style.display = 'block';
            exportProgress.style.display = 'none';
            exportBtn.disabled = false;
            isExporting = false;
            downloadBtn.onclick = function() {
                var a = document.createElement('a'); a.href = url; a.download = 'video_' + Date.now() + '.webm'; a.click();
            };
        };

        recorder.start();
        var currentFrame = 0;

        function renderExportFrame() {
            if (currentFrame >= totalFrames) { recorder.stop(); return; }
            var elapsed = currentFrame / fps;
            var tempCtx = ctx;
            ctx = exportCtx;
            drawFrame(elapsed);
            ctx = tempCtx;
            var progress = Math.round((currentFrame / totalFrames) * 100);
            exportProgressFill.style.width = progress + '%';
            exportProgressText.textContent = '导出中... ' + progress + '%';
            currentFrame++;
            setTimeout(renderExportFrame, 1);
        }
        renderExportFrame();
    }

    closeResultBtn.addEventListener('click', function() {
        resultSection.style.display = 'none';
        if (resultVideo.src) { URL.revokeObjectURL(resultVideo.src); resultVideo.src = ''; }
    });

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 初始化
    updateUI();
})();
(function() {
    // 状态
    var images = []; // [{id, img, name, duration, transition}]
    var TRANSITION_DURATION = 0.5; // 转场动画时长(秒)
    var TRANSITION_MAP = {
        'page': '📖', 'flash': '⚡', 'zoomin': '🔍', 'zoomout': '🔎', 'blur': '💨'
    };

    // 预览状态
    var isPlaying = false;
    var previewStartTime = 0;
    var previewElapsed = 0;
    var animFrameId = null;

    // 导出状态
    var isExporting = false;

    // DOM
    var canvas = document.getElementById('previewCanvas');
    var ctx = canvas.getContext('2d');
    var canvasPlaceholder = document.getElementById('canvasPlaceholder');
    var playBtn = document.getElementById('playBtn');
    var playIcon = document.getElementById('playIcon');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var progressInfo = document.getElementById('progressInfo');
    var uploadArea = document.getElementById('uploadArea');
    var fileInput = document.getElementById('fileInput');
    var uploadHint = document.getElementById('uploadHint');
    var timelineSection = document.getElementById('timelineSection');
    var timelineList = document.getElementById('timelineList');
    var globalSettings = document.getElementById('globalSettings');
    var globalDuration = document.getElementById('globalDuration');
    var globalTransition = document.getElementById('globalTransition');
    var applyGlobalBtn = document.getElementById('applyGlobalBtn');
    var exportSection = document.getElementById('exportSection');
    var exportBtn = document.getElementById('exportBtn');
    var exportProgress = document.getElementById('exportProgress');
    var exportProgressFill = document.getElementById('exportProgressFill');
    var exportProgressText = document.getElementById('exportProgressText');
    var resultSection = document.getElementById('resultSection');
    var resultVideo = document.getElementById('resultVideo');
    var downloadBtn = document.getElementById('downloadBtn');
    var closeResultBtn = document.getElementById('closeResultBtn');

    // 编辑弹窗
    var editModal = document.getElementById('editModal');
    var editModalClose = document.getElementById('editModalClose');
    var editPreviewImg = document.getElementById('editPreviewImg');
    var editIndex = document.getElementById('editIndex');
    var editDuration = document.getElementById('editDuration');
    var editDurationValue = document.getElementById('editDurationValue');
    var editTransition = document.getElementById('editTransition');
    var removeImageBtn = document.getElementById('removeImageBtn');
    var editSaveBtn = document.getElementById('editSaveBtn');
    var editingIndex = -1;
    var editSelectedTransition = 'page';

    // ===== 图片上传 =====
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
        this.value = '';
    });

    function handleFiles(files) {
        var remaining = 20 - images.length;
        if (remaining <= 0) {
            alert('最多添加 20 张图片');
            return;
        }

        var imageFiles = [];
        for (var i = 0; i < files.length && imageFiles.length < remaining; i++) {
            if (files[i].type.startsWith('image/')) {
                imageFiles.push(files[i]);
            }
        }

        if (imageFiles.length === 0) return;

        var loaded = 0;
        imageFiles.forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    images.push({
                        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                        img: img,
                        src: e.target.result,
                        name: file.name.replace(/\.[^/.]+$/, ''),
                        duration: parseFloat(globalDuration.value),
                        transition: globalTransition.value
                    });
                    loaded++;
                    if (loaded === imageFiles.length) {
                        updateUI();
                    }
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ===== UI 更新 =====
    function updateUI() {
        var count = images.length;
        uploadHint.textContent = '已添加 ' + count + ' 张图片' + (count >= 20 ? ' (已满)' : '');

        // 占位符
        canvasPlaceholder.style.display = count === 0 ? 'flex' : 'none';

        // 时间轴
        if (count > 0) {
            timelineSection.style.display = 'block';
            globalSettings.style.display = 'block';
            exportSection.style.display = 'block';
            renderTimeline();
            drawFrame(0);
        } else {
            timelineSection.style.display = 'none';
            globalSettings.style.display = 'none';
            exportSection.style.display = 'none';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        updateProgressInfo();
    }

    function renderTimeline() {
        timelineList.innerHTML = '';
        images.forEach(function(item, index) {
            var el = document.createElement('div');
            el.className = 'timeline-item';
            el.setAttribute('data-index', index);
            el.innerHTML =
                '<img class="timeline-item-img" src="' + item.src + '" alt="" />' +
                '<div class="timeline-item-info">' +
                    '<span class="timeline-item-index">#' + (index + 1) + '</span>' +
                    '<span class="timeline-item-duration">' + item.duration + 's</span>' +
                '</div>' +
                '<div class="timeline-item-transition">' + (TRANSITION_MAP[item.transition] || '📖') + '</div>';

            el.addEventListener('click', function() {
                openEditModal(index);
            });

            timelineList.appendChild(el);
        });
    }

    // ===== 画布渲染 =====
    function drawImageCover(img, x, y, w, h, offsetX, offsetY, scale, alpha, blurAmount) {
        ctx.save();
        ctx.globalAlpha = alpha !== undefined ? alpha : 1;
        if (blurAmount) {
            ctx.filter = 'blur(' + blurAmount + 'px)';
        }

        // object-fit: cover 计算
        var imgRatio = img.width / img.height;
        var canvasRatio = w / h;
        var drawW, drawH;
        if (imgRatio > canvasRatio) {
            drawH = h;
            drawW = h * imgRatio;
        } else {
            drawW = w;
            drawH = w / imgRatio;
        }

        var dx = x + (w - drawW) / 2;
        var dy = y + (h - drawH) / 2;

        if (scale && scale !== 1) {
            var cx = x + w / 2;
            var cy = y + h / 2;
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);
        }

        ctx.drawImage(img, dx + (offsetX || 0), dy + (offsetY || 0), drawW, drawH);
        ctx.restore();
    }

    function drawFrame(elapsed) {
        if (images.length === 0) return;

        var totalTime = getTotalDuration();
        if (elapsed >= totalTime) elapsed = totalTime - 0.001;
        if (elapsed < 0) elapsed = 0;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 找到当前图片索引
        var acc = 0;
        var currentIndex = 0;
        for (var i = 0; i < images.length; i++) {
            var segDuration = images[i].duration;
            if (i < images.length - 1) segDuration += TRANSITION_DURATION;
            if (elapsed < acc + segDuration) {
                currentIndex = i;
                break;
            }
            acc += segDuration;
            if (i === images.length - 1) currentIndex = i;
        }

        var item = images[currentIndex];
        var localTime = elapsed - acc;

        // 判断是否在转场中
        var inTransition = false;
        var transitionProgress = 0;
        var nextIndex = currentIndex + 1;

        if (currentIndex < images.length - 1 && localTime > item.duration) {
            inTransition = true;
            transitionProgress = (localTime - item.duration) / TRANSITION_DURATION;
            transitionProgress = Math.min(1, Math.max(0, transitionProgress));
        }

        if (!inTransition) {
            // 正常显示
            drawImageCover(item.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, 1, 0);
        } else {
            // 转场动画
            var nextItem = images[nextIndex];
            var t = transitionProgress;
            var easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut

            switch (item.transition) {
                case 'page':
                    // 翻页: 当前图从右向左翻转消失，新图从左向右翻转出现
                    drawPageTransition(item, nextItem, easeT);
                    break;
                case 'flash':
                    // 黑闪: 当前图淡出到黑，新图从黑淡入
                    drawFlashTransition(item, nextItem, easeT);
                    break;
                case 'zoomin':
                    // 放大: 当前图放大淡出，新图从缩小状态放大到正常
                    drawZoomInTransition(item, nextItem, easeT);
                    break;
                case 'zoomout':
                    // 缩小: 当前图缩小淡出，新图从放大状态缩小到正常
                    drawZoomOutTransition(item, nextItem, easeT);
                    break;
                case 'blur':
                    // 模糊: 当前图模糊淡出，新图从模糊变清晰
                    drawBlurTransition(item, nextItem, easeT);
                    break;
                default:
                    drawFlashTransition(item, nextItem, easeT);
            }
        }
    }

    // ===== 转场动画实现 =====
    function drawPageTransition(current, next, t) {
        var w = canvas.width;
        var h = canvas.height;

        // 当前图: 从右侧翻转到左侧 (3D 模拟)
        ctx.save();
        var scaleX = Math.cos(t * Math.PI);
        if (scaleX > 0) {
            var currentW = w * scaleX;
            var currentX = (w - currentW) / 2;
            ctx.beginPath();
            ctx.rect(currentX, 0, currentW, h);
            ctx.clip();
            drawImageCover(current.img, 0, 0, w, h, 0, 0, 1, 1, 0);
        }
        ctx.restore();

        // 新图: 从左侧翻转到右侧
        ctx.save();
        var nextScaleX = Math.cos((1 - t) * Math.PI);
        if (nextScaleX > 0) {
            var nextW = w * nextScaleX;
            var nextX = (w - nextW) / 2;
            ctx.beginPath();
            ctx.rect(nextX, 0, nextW, h);
            ctx.clip();
            drawImageCover(next.img, 0, 0, w, h, 0, 0, 1, 1, 0);
        }
        ctx.restore();
    }

    function drawFlashTransition(current, next, t) {
        if (t < 0.5) {
            // 当前图淡出
            var alpha1 = 1 - t * 2;
            drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, alpha1, 0);
        } else {
            // 新图淡入
            var alpha2 = (t - 0.5) * 2;
            drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, alpha2, 0);
        }
    }

    function drawZoomInTransition(current, next, t) {
        if (t < 0.5) {
            // 当前图放大 + 淡出
            var scale1 = 1 + t * 0.6;
            var alpha1 = 1 - t * 2;
            drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, scale1, alpha1, 0);
        } else {
            // 新图从缩小到正常 + 淡入
            var scale2 = 0.7 + (t - 0.5) * 0.6;
            var alpha2 = (t - 0.5) * 2;
            drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, scale2, alpha2, 0);
        }
    }

    function drawZoomOutTransition(current, next, t) {
        if (t < 0.5) {
            // 当前图缩小 + 淡出
            var scale1 = 1 - t * 0.4;
            var alpha1 = 1 - t * 2;
            drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, scale1, alpha1, 0);
        } else {
            // 新图从放大到正常 + 淡入
            var scale2 = 1.3 - (t - 0.5) * 0.6;
            var alpha2 = (t - 0.5) * 2;
            drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, scale2, alpha2, 0);
        }
    }

    function drawBlurTransition(current, next, t) {
        if (t < 0.5) {
            // 当前图模糊 + 淡出
            var blur1 = t * 30;
            var alpha1 = 1 - t * 1.5;
            drawImageCover(current.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, Math.max(0, alpha1), blur1);
        } else {
            // 新图从模糊到清晰 + 淡入
            var blur2 = (1 - t) * 30;
            var alpha2 = (t - 0.5) * 2;
            drawImageCover(next.img, 0, 0, canvas.width, canvas.height, 0, 0, 1, Math.min(1, alpha2), blur2);
        }
    }

    // ===== 时间计算 =====
    function getTotalDuration() {
        var total = 0;
        for (var i = 0; i < images.length; i++) {
            total += images[i].duration;
            if (i < images.length - 1) total += TRANSITION_DURATION;
        }
        return total;
    }

    function formatTime(seconds) {
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function updateProgressInfo() {
        var total = getTotalDuration();
        var current = previewElapsed || 0;
        progressInfo.textContent = formatTime(current) + ' / ' + formatTime(total);
    }

    // ===== 预览播放 =====
    playBtn.addEventListener('click', function() {
        if (images.length === 0) return;

        if (isPlaying) {
            stopPreview();
        } else {
            startPreview();
        }
    });

    prevBtn.addEventListener('click', function() {
        if (images.length === 0) return;
        stopPreview();
        // 跳到上一张图片的起始位置
        var target = findPreviousImageStart(previewElapsed);
        previewElapsed = target;
        drawFrame(previewElapsed);
        updateProgressInfo();
    });

    nextBtn.addEventListener('click', function() {
        if (images.length === 0) return;
        stopPreview();
        // 跳到下一张图片的起始位置
        var target = findNextImageStart(previewElapsed);
        previewElapsed = target;
        drawFrame(previewElapsed);
        updateProgressInfo();
    });

    function findPreviousImageStart(elapsed) {
        var acc = 0;
        for (var i = 0; i < images.length; i++) {
            var segDuration = images[i].duration;
            if (i < images.length - 1) segDuration += TRANSITION_DURATION;
            if (acc > 0 && elapsed <= acc + segDuration) {
                return Math.max(0, acc - (i > 0 ? TRANSITION_DURATION : 0));
            }
            acc += segDuration;
        }
        return 0;
    }

    function findNextImageStart(elapsed) {
        var acc = 0;
        for (var i = 0; i < images.length; i++) {
            var segDuration = images[i].duration;
            if (i < images.length - 1) segDuration += TRANSITION_DURATION;
            if (acc > elapsed) return acc;
            acc += segDuration;
        }
        return 0;
    }

    function startPreview() {
        isPlaying = true;
        playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        previewStartTime = performance.now() - previewElapsed * 1000;
        previewLoop();
    }

    function stopPreview() {
        isPlaying = false;
        playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
    }

    function previewLoop() {
        if (!isPlaying) return;

        var now = performance.now();
        previewElapsed = (now - previewStartTime) / 1000;
        var total = getTotalDuration();

        if (previewElapsed >= total) {
            previewElapsed = 0;
            previewStartTime = now;
        }

        drawFrame(previewElapsed);
        updateProgressInfo();
        animFrameId = requestAnimationFrame(previewLoop);
    }

    // ===== 全局设置 =====
    applyGlobalBtn.addEventListener('click', function() {
        var dur = parseFloat(globalDuration.value);
        var trans = globalTransition.value;
        images.forEach(function(item) {
            item.duration = dur;
            item.transition = trans;
        });
        renderTimeline();
        updateProgressInfo();
    });

    // ===== 编辑弹窗 =====
    function openEditModal(index) {
        editingIndex = index;
        var item = images[index];
        editPreviewImg.src = item.src;
        editIndex.textContent = '#' + (index + 1) + ' ' + item.name;
        editDuration.value = item.duration;
        editDurationValue.textContent = item.duration + ' 秒';
        editSelectedTransition = item.transition;
        updateTransitionButtons();
        editModal.style.display = 'flex';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        editingIndex = -1;
    }

    editModalClose.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', function(e) {
        if (e.target === editModal) closeEditModal();
    });

    editDuration.addEventListener('input', function() {
        editDurationValue.textContent = this.value + ' 秒';
    });

    var transitionBtns = editTransition.querySelectorAll('.transition-opt');
    transitionBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            editSelectedTransition = this.getAttribute('data-value');
            updateTransitionButtons();
        });
    });

    function updateTransitionButtons() {
        transitionBtns.forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-value') === editSelectedTransition);
        });
    }

    removeImageBtn.addEventListener('click', function() {
        if (editingIndex < 0) return;
        if (!confirm('确定要移除这张图片吗？')) return;
        images.splice(editingIndex, 1);
        closeEditModal();
        stopPreview();
        previewElapsed = 0;
        updateUI();
    });

    editSaveBtn.addEventListener('click', function() {
        if (editingIndex < 0) return;
        images[editingIndex].duration = parseFloat(editDuration.value);
        images[editingIndex].transition = editSelectedTransition;
        closeEditModal();
        renderTimeline();
        updateProgressInfo();
        if (!isPlaying) drawFrame(previewElapsed);
    });

    // ===== 视频导出 =====
    exportBtn.addEventListener('click', function() {
        if (images.length < 5) {
            alert('至少需要 5 张图片才能导出视频');
            return;
        }
        if (isExporting) return;
        exportVideo();
    });

    function exportVideo() {
        isExporting = true;
        exportBtn.disabled = true;
        exportProgress.style.display = 'block';
        resultSection.style.display = 'none';

        var totalDuration = getTotalDuration();
        var fps = 30;
        var totalFrames = Math.ceil(totalDuration * fps);
        var frameInterval = 1000 / fps;

        // 使用离屏 canvas 保证导出质量
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        var exportCtx = exportCanvas.getContext('2d');

        var stream = exportCanvas.captureStream(fps);
        var mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
        }

        var recorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            videoBitsPerSecond: 5000000
        });
        var chunks = [];

        recorder.ondataavailable = function(e) {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = function() {
            var blob = new Blob(chunks, { type: 'video/webm' });
            var url = URL.createObjectURL(blob);
            resultVideo.src = url;
            resultSection.style.display = 'block';
            exportProgress.style.display = 'none';
            exportBtn.disabled = false;
            isExporting = false;

            // 保存下载链接
            downloadBtn.onclick = function() {
                var a = document.createElement('a');
                a.href = url;
                a.download = 'video_' + Date.now() + '.webm';
                a.click();
            };
        };

        recorder.start();

        var currentFrame = 0;
        var origCtx = ctx;

        function renderExportFrame() {
            if (currentFrame >= totalFrames) {
                recorder.stop();
                return;
            }

            var elapsed = currentFrame / fps;

            // 渲染到导出 canvas
            var tempCtx = ctx;
            ctx = exportCtx;
            drawFrame(elapsed);
            ctx = tempCtx;

            // 更新进度
            var progress = Math.round((currentFrame / totalFrames) * 100);
            exportProgressFill.style.width = progress + '%';
            exportProgressText.textContent = '导出中... ' + progress + '%';

            currentFrame++;
            setTimeout(renderExportFrame, 1);
        }

        renderExportFrame();
    }

    closeResultBtn.addEventListener('click', function() {
        resultSection.style.display = 'none';
        if (resultVideo.src) {
            URL.revokeObjectURL(resultVideo.src);
            resultVideo.src = '';
        }
    });

    // 初始化
    updateUI();
})();
