/**
 * 碎片拼图效果
 * 用户选择5-10张图片，生成碎片化动画，最终拼成九宫格大图
 */
(function() {
    'use strict';

    // ===== DOM 元素 =====
    var canvas, ctx;
    var fsCanvas, fsCtx;
    var elements = {};

    // ===== 状态 =====
    var uploadedImages = [];
    var fragments = [];
    var isAnimating = false;
    var isPaused = false;
    var animationId = null;
    var mediaRecorder = null;
    var recordedChunks = [];
    var isRecording = false;
    var isFullscreenMode = false;

    // ===== 配置 =====
    var config = {
        fragmentCount: 9,
        animSpeed: 'normal',
        layoutMode: 'grid',
        gridSize: 3
    };

    // 动画速度配置（毫秒）
    var SPEED_CONFIG = {
        slow: { duration: 4000, stagger: 300 },
        normal: { duration: 2500, stagger: 200 },
        fast: { duration: 1500, stagger: 100 }
    };

    // ===== 初始化 =====
    function init() {
        canvas = document.getElementById('puzzleCanvas');
        ctx = canvas.getContext('2d');
        fsCanvas = document.getElementById('fullscreenCanvas');
        fsCtx = fsCanvas.getContext('2d');

        elements = {
            uploadBox: document.getElementById('uploadBox'),
            fileInput: document.getElementById('fileInput'),
            uploadPreview: document.getElementById('uploadPreview'),
            uploadSection: document.getElementById('uploadSection'),
            controlPanel: document.getElementById('controlPanel'),
            canvasSection: document.getElementById('canvasSection'),
            startBtn: document.getElementById('startBtn'),
            resetBtn: document.getElementById('resetBtn'),
            pauseBtn: document.getElementById('pauseBtn'),
            replayBtn: document.getElementById('replayBtn'),
            saveBtn: document.getElementById('saveBtn'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            progressOverlay: document.getElementById('progressOverlay'),
            fragmentCount: document.getElementById('fragmentCount'),
            animSpeed: document.getElementById('animSpeed'),
            layoutMode: document.getElementById('layoutMode'),
            // 全屏相关
            fullscreenModal: document.getElementById('fullscreenModal'),
            closeFullscreenBtn: document.getElementById('closeFullscreenBtn'),
            fsPauseBtn: document.getElementById('fsPauseBtn'),
            fsReplayBtn: document.getElementById('fsReplayBtn'),
            fsDownloadBtn: document.getElementById('fsDownloadBtn'),
            // 下载相关
            downloadOverlay: document.getElementById('downloadOverlay'),
            downloadText: document.getElementById('downloadText'),
            progressBar: document.getElementById('progressBar'),
            downloadPercent: document.getElementById('downloadPercent')
        };

        bindEvents();
    }

    // ===== 绑定事件 =====
    function bindEvents() {
        elements.uploadBox.addEventListener('click', function() {
            elements.fileInput.click();
        });

        elements.fileInput.addEventListener('change', handleFileSelect);

        elements.uploadBox.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        elements.uploadBox.addEventListener('dragleave', function() {
            this.classList.remove('dragover');
        });

        elements.uploadBox.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        elements.startBtn.addEventListener('click', startAnimation);
        elements.resetBtn.addEventListener('click', resetAll);
        elements.pauseBtn.addEventListener('click', togglePause);
        elements.replayBtn.addEventListener('click', replayAnimation);
        elements.saveBtn.addEventListener('click', saveImage);
        elements.fullscreenBtn.addEventListener('click', openFullscreen);
        elements.downloadBtn.addEventListener('click', downloadAnimation);

        // 全屏相关
        elements.closeFullscreenBtn.addEventListener('click', closeFullscreen);
        elements.fsPauseBtn.addEventListener('click', togglePause);
        elements.fsReplayBtn.addEventListener('click', replayAnimation);
        elements.fsDownloadBtn.addEventListener('click', downloadAnimation);

        // ESC关闭全屏
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isFullscreenMode) {
                closeFullscreen();
            }
        });

        elements.fragmentCount.addEventListener('change', function() {
            config.fragmentCount = parseInt(this.value);
            config.gridSize = Math.sqrt(config.fragmentCount);
        });

        elements.animSpeed.addEventListener('change', function() {
            config.animSpeed = this.value;
        });

        elements.layoutMode.addEventListener('change', function() {
            config.layoutMode = this.value;
        });
    }

    // ===== 处理文件选择 =====
    function handleFileSelect(e) {
        handleFiles(e.target.files);
    }

    // ===== 处理文件 =====
    function handleFiles(files) {
        var validFiles = [];

        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            if (file.type.startsWith('image/')) {
                validFiles.push(file);
            }
        }

        if (uploadedImages.length + validFiles.length > 10) {
            alert('最多上传10张图片');
            return;
        }

        if (uploadedImages.length + validFiles.length < 5 && validFiles.length > 0) {
            alert('需要至少5张图片');
        }

        validFiles.forEach(function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    uploadedImages.push({
                        src: e.target.result,
                        img: img,
                        width: img.width,
                        height: img.height
                    });
                    updatePreview();
                    updateStartButton();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // ===== 更新预览 =====
    function updatePreview() {
        elements.uploadPreview.innerHTML = '';

        uploadedImages.forEach(function(item, index) {
            var previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = '<img src="' + item.src + '" alt="预览图">' +
                '<div class="preview-remove" data-index="' + index + '">×</div>';

            previewItem.querySelector('.preview-remove').addEventListener('click', function(e) {
                e.stopPropagation();
                var idx = parseInt(this.dataset.index);
                uploadedImages.splice(idx, 1);
                updatePreview();
                updateStartButton();
            });

            elements.uploadPreview.appendChild(previewItem);
        });
    }

    // ===== 更新开始按钮状态 =====
    function updateStartButton() {
        elements.startBtn.disabled = uploadedImages.length < 5;
    }

    // ===== 开始动画 =====
    function startAnimation() {
        if (uploadedImages.length < 5) {
            alert('请上传至少5张图片');
            return;
        }

        elements.progressOverlay.style.display = 'flex';

        setTimeout(function() {
            prepareCanvas();
            createFragments();
            startFragmentAnimation();
            elements.progressOverlay.style.display = 'none';
            elements.uploadSection.style.display = 'none';
            elements.controlPanel.style.display = 'none';
            elements.canvasSection.style.display = 'flex';
        }, 100);
    }

    // ===== 准备画布 =====
    function prepareCanvas() {
        var maxW = Math.min(window.innerWidth - 40, 900);
        var maxH = Math.min(window.innerHeight - 200, 600);

        var cols = config.layoutMode === 'grid' ? 3 : Math.ceil(Math.sqrt(uploadedImages.length));
        var rows = Math.ceil(uploadedImages.length / cols);

        var aspectRatio = uploadedImages[0].width / uploadedImages[0].height;
        var cellW, cellH;

        if (aspectRatio > 1) {
            cellH = maxH / rows;
            cellW = cellH * aspectRatio;
            if (cellW * cols > maxW) {
                cellW = maxW / cols;
                cellH = cellW / aspectRatio;
            }
        } else {
            cellW = maxW / cols;
            cellH = cellW / aspectRatio;
            if (cellH * rows > maxH) {
                cellH = maxH / rows;
                cellW = cellH * aspectRatio;
            }
        }

        canvas.width = cellW * cols;
        canvas.height = cellH * rows;

        // 全屏画布
        fsCanvas.width = canvas.width;
        fsCanvas.height = canvas.height;

        config.cellWidth = cellW;
        config.cellHeight = cellH;
        config.cols = cols;
        config.rows = rows;
    }

    // ===== 创建碎片 =====
    function createFragments() {
        fragments = [];
        var speedConfig = SPEED_CONFIG[config.animSpeed];
        var startTime = Date.now() + 500;

        uploadedImages.forEach(function(item, imgIndex) {
            var targetCol, targetRow;
            if (config.layoutMode === 'grid') {
                targetCol = imgIndex % 3;
                targetRow = Math.floor(imgIndex / 3);
            } else {
                targetCol = imgIndex % config.cols;
                targetRow = Math.floor(imgIndex / config.cols);
            }

            var targetX = targetCol * config.cellWidth;
            var targetY = targetRow * config.cellHeight;

            var numFragments = config.fragmentCount;
            var gridSize = Math.sqrt(numFragments);
            var fragW = config.cellWidth / gridSize;
            var fragH = config.cellHeight / gridSize;

            for (var i = 0; i < numFragments; i++) {
                var fragCol = i % gridSize;
                var fragRow = Math.floor(i / gridSize);

                var srcX = fragCol * fragW;
                var srcY = fragRow * fragH;

                var destX = targetX + srcX;
                var destY = targetY + srcY;

                var startX, startY;
                var side = Math.floor(Math.random() * 4);
                switch (side) {
                    case 0:
                        startX = Math.random() * canvas.width;
                        startY = -fragH - Math.random() * 200;
                        break;
                    case 1:
                        startX = canvas.width + Math.random() * 200;
                        startY = Math.random() * canvas.height;
                        break;
                    case 2:
                        startX = Math.random() * canvas.width;
                        startY = canvas.height + Math.random() * 200;
                        break;
                    case 3:
                        startX = -fragW - Math.random() * 200;
                        startY = Math.random() * canvas.height;
                        break;
                }

                fragments.push({
                    img: item.img,
                    srcX: srcX,
                    srcY: srcY,
                    srcW: item.width / gridSize,
                    srcH: item.height / gridSize,
                    fragW: fragW,
                    fragH: fragH,
                    startX: startX,
                    startY: startY,
                    destX: destX,
                    destY: destY,
                    currentX: startX,
                    currentY: startY,
                    startTime: startTime + (imgIndex * speedConfig.stagger) + (i * 20),
                    duration: speedConfig.duration + Math.random() * 500,
                    rotation: (Math.random() - 0.5) * Math.PI * 2,
                    alpha: 0
                });
            }
        });

        fragments.sort(function() { return Math.random() - 0.5; });
    }

    // ===== 开始碎片动画 =====
    function startFragmentAnimation() {
        isAnimating = true;
        isPaused = false;
        updatePauseButtons('⏸️ 暂停');
        animateFragments();
    }

    // ===== 动画循环 =====
    function animateFragments() {
        if (!isAnimating || isPaused) return;

        var now = Date.now();
        var allComplete = true;
        var currentCtx = isFullscreenMode ? fsCtx : ctx;
        var currentCanvas = isFullscreenMode ? fsCanvas : canvas;

        currentCtx.fillStyle = '#1a1a2e';
        currentCtx.fillRect(0, 0, currentCanvas.width, currentCanvas.height);

        fragments.forEach(function(frag) {
            var elapsed = now - frag.startTime;

            if (elapsed < 0) {
                allComplete = false;
                return;
            }

            if (elapsed < frag.duration) {
                allComplete = false;

                var progress = elapsed / frag.duration;
                var eased = easeOutQuart(progress);

                frag.currentX = frag.startX + (frag.destX - frag.startX) * eased;
                frag.currentY = frag.startY + (frag.destY - frag.startY) * eased;
                frag.alpha = eased;
            } else {
                frag.currentX = frag.destX;
                frag.currentY = frag.destY;
                frag.alpha = 1;
            }

            currentCtx.save();
            currentCtx.globalAlpha = frag.alpha;
            currentCtx.translate(frag.currentX + frag.fragW / 2, frag.currentY + frag.fragH / 2);

            if (elapsed < frag.duration) {
                currentCtx.rotate(frag.rotation * (1 - easeOutQuart(elapsed / frag.duration)));
            }

            currentCtx.translate(-frag.fragW / 2, -frag.fragH / 2);

            currentCtx.drawImage(
                frag.img,
                frag.srcX * frag.img.width / config.cellWidth,
                frag.srcY * frag.img.height / config.cellHeight,
                frag.srcW,
                frag.srcH,
                0,
                0,
                frag.fragW,
                frag.fragH
            );

            currentCtx.restore();
        });

        if (allComplete) {
            isAnimating = false;
            drawGridLines(currentCtx);
            if (isRecording) {
                stopRecording();
            }
        } else {
            animationId = requestAnimationFrame(animateFragments);
        }
    }

    // ===== 绘制网格线 =====
    function drawGridLines(targetCtx) {
        targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        targetCtx.lineWidth = 2;

        for (var i = 1; i < config.cols; i++) {
            targetCtx.beginPath();
            targetCtx.moveTo(i * config.cellWidth, 0);
            targetCtx.lineTo(i * config.cellWidth, canvas.height);
            targetCtx.stroke();
        }

        for (var j = 1; j < config.rows; j++) {
            targetCtx.beginPath();
            targetCtx.moveTo(0, j * config.cellHeight);
            targetCtx.lineTo(canvas.width, j * config.cellHeight);
            targetCtx.stroke();
        }
    }

    // ===== 缓动函数 =====
    function easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    // ===== 更新所有暂停按钮 =====
    function updatePauseButtons(text) {
        elements.pauseBtn.textContent = text;
        elements.fsPauseBtn.textContent = text;
    }

    // ===== 暂停/继续 =====
    function togglePause() {
        if (!isAnimating) return;

        isPaused = !isPaused;
        updatePauseButtons(isPaused ? '▶️ 继续' : '⏸️ 暂停');

        if (!isPaused) {
            animateFragments();
        }
    }

    // ===== 重播 =====
    function replayAnimation() {
        cancelAnimationFrame(animationId);
        createFragments();
        startFragmentAnimation();
    }

    // ===== 打开全屏（重播效果）=====
    function openFullscreen() {
        isFullscreenMode = true;
        elements.fullscreenModal.style.display = 'flex';

        // 重播动画
        cancelAnimationFrame(animationId);
        createFragments();
        isAnimating = true;
        isPaused = false;
        updatePauseButtons('⏸️ 暂停');
        animateFragments();
    }

    // ===== 关闭全屏 =====
    function closeFullscreen() {
        isFullscreenMode = false;
        elements.fullscreenModal.style.display = 'none';

        // 复制全屏画布状态回来
        ctx.drawImage(fsCanvas, 0, 0);

        // 继续在普通模式播放
        if (isAnimating && !isPaused) {
            animateFragments();
        }
    }

    // ===== 下载动画（重播录制效果）=====
    function downloadAnimation() {
        if (!MediaRecorder || !canvas.captureStream) {
            alert('您的浏览器不支持视频录制功能，请使用最新版Chrome/Firefox浏览器');
            return;
        }

        // 显示全屏模态框和下载进度
        isFullscreenMode = true;
        elements.fullscreenModal.style.display = 'flex';
        elements.downloadOverlay.style.display = 'flex';
        elements.downloadText.textContent = '正在录制动画...';
        elements.progressBar.style.width = '0%';
        elements.downloadPercent.textContent = '0%';

        recordedChunks = [];
        isRecording = true;

        // 使用全屏画布录制（更高分辨率）
        var recordCanvas = fsCanvas;
        var stream = recordCanvas.captureStream(30);

        // 检查支持的格式，优先尝试 MP4
        var mimeTypes = [
            'video/mp4',
            'video/mp4;codecs=h264',
            'video/webm;codecs=h264',
            'video/webm;codecs=vp9',
            'video/webm'
        ];

        var mimeType = 'video/webm';
        for (var i = 0; i < mimeTypes.length; i++) {
            if (MediaRecorder.isTypeSupported(mimeTypes[i])) {
                mimeType = mimeTypes[i];
                break;
            }
        }

        mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 5000000 });

        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = function() {
            saveVideo(mimeType);
        };

        // 开始录制
        mediaRecorder.start(100);

        // 重播动画（从全屏画布）
        cancelAnimationFrame(animationId);
        createFragments();
        isAnimating = true;
        isPaused = false;
        updatePauseButtons('⏸️ 暂停');
        animateFragments();

        // 进度更新
        var speedConfig = SPEED_CONFIG[config.animSpeed];
        var totalDuration = speedConfig.duration + uploadedImages.length * speedConfig.stagger + 1500;
        var startTime = Date.now();

        var progressInterval = setInterval(function() {
            if (!isRecording) {
                clearInterval(progressInterval);
                return;
            }

            var elapsed = Date.now() - startTime;
            var progress = Math.min(100, (elapsed / totalDuration) * 100);
            elements.progressBar.style.width = progress + '%';
            elements.downloadPercent.textContent = Math.floor(progress) + '%';

            if (progress >= 100) {
                clearInterval(progressInterval);
            }
        }, 100);
    }

    // ===== 停止录制 =====
    function stopRecording() {
        isRecording = false;
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    }

    // ===== 保存视频 =====
    function saveVideo(mimeType) {
        elements.downloadText.textContent = '正在保存视频...';

        setTimeout(function() {
            var extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            var blob = new Blob(recordedChunks, { type: mimeType });
            var url = URL.createObjectURL(blob);

            var link = document.createElement('a');
            link.href = url;
            link.download = 'puzzle-animation-' + Date.now() + '.' + extension;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // 关闭全屏模式
            isFullscreenMode = false;
            elements.fullscreenModal.style.display = 'none';
            elements.downloadOverlay.style.display = 'none';

            // 恢复普通画布状态
            if (fragments.length > 0) {
                fragments.forEach(function(frag) {
                    frag.currentX = frag.destX;
                    frag.currentY = frag.destY;
                    frag.alpha = 1;
                });
                drawGridLines(ctx);
            }
        }, 500);
    }

    // ===== 重置所有 =====
    function resetAll() {
        cancelAnimationFrame(animationId);
        uploadedImages = [];
        fragments = [];
        isAnimating = false;
        isPaused = false;
        isRecording = false;

        elements.uploadPreview.innerHTML = '';
        elements.uploadSection.style.display = 'flex';
        elements.controlPanel.style.display = 'flex';
        elements.canvasSection.style.display = 'none';
        elements.startBtn.disabled = true;
        updatePauseButtons('⏸️ 暂停');
        elements.fileInput.value = '';

        closeFullscreen();
    }

    // ===== 保存图片 =====
    function saveImage() {
        var link = document.createElement('a');
        link.download = 'puzzle-' + Date.now() + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    document.addEventListener('DOMContentLoaded', init);
})();