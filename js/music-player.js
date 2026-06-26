(function() {
    // 状态
    var playlist = [];
    var currentIndex = -1;
    var isPlaying = false;
    var audio = new Audio();

    // DOM 元素
    var vinylRecord = document.getElementById('vinylRecord');
    var vinylLabel = document.getElementById('vinylLabel');
    var vinylLabelText = document.getElementById('vinylLabelText');
    var tonearm = document.getElementById('tonearm');
    var songName = document.getElementById('songName');
    var songStatus = document.getElementById('songStatus');
    var currentTimeEl = document.getElementById('currentTime');
    var totalTimeEl = document.getElementById('totalTime');
    var progressBar = document.getElementById('progressBar');
    var progressFill = document.getElementById('progressFill');
    var progressThumb = document.getElementById('progressThumb');
    var playBtn = document.getElementById('playBtn');
    var playIcon = document.getElementById('playIcon');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var volumeSlider = document.getElementById('volumeSlider');
    var selectFilesBtn = document.getElementById('selectFilesBtn');
    var selectFolderBtn = document.getElementById('selectFolderBtn');
    var fileInput = document.getElementById('fileInput');
    var folderInput = document.getElementById('folderInput');
    var playlistSection = document.getElementById('playlistSection');
    var playlistEl = document.getElementById('playlist');
    var playlistCount = document.getElementById('playlistCount');

    // 初始化音量
    audio.volume = volumeSlider.value / 100;

    // 文件选择
    selectFilesBtn.addEventListener('click', function() {
        fileInput.click();
    });

    selectFolderBtn.addEventListener('click', function() {
        folderInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
    });

    folderInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        var audioFiles = [];
        for (var i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('audio/')) {
                audioFiles.push(files[i]);
            }
        }

        if (audioFiles.length === 0) {
            alert('未找到音频文件，请选择音乐文件');
            return;
        }

        // 清空旧列表
        playlist = [];
        playlistEl.innerHTML = '';

        // 添加新文件
        audioFiles.forEach(function(file, index) {
            var url = URL.createObjectURL(file);
            var name = file.name.replace(/\.[^/.]+$/, ''); // 去掉扩展名
            playlist.push({ name: name, url: url, file: file });

            var item = document.createElement('div');
            item.className = 'playlist-item';
            item.innerHTML =
                '<span class="playlist-item-index">' + (index + 1) + '</span>' +
                '<span class="playlist-item-name">' + name + '</span>';
            item.addEventListener('click', function() {
                playSong(index);
            });
            playlistEl.appendChild(item);
        });

        // 显示播放列表
        playlistSection.style.display = 'block';
        playlistCount.textContent = playlist.length + ' 首';

        // 自动播放第一首
        playSong(0);
    }

    // 播放指定歌曲
    function playSong(index) {
        if (index < 0 || index >= playlist.length) return;
        currentIndex = index;

        var song = playlist[currentIndex];
        audio.src = song.url;
        audio.play().then(function() {
            isPlaying = true;
            updatePlayState();
        }).catch(function(err) {
            console.log('播放失败:', err);
            isPlaying = false;
            updatePlayState();
        });

        // 更新 UI
        songName.textContent = song.name;
        songStatus.textContent = '正在播放 ' + (currentIndex + 1) + ' / ' + playlist.length;

        // 更新唱片标签
        var colors = [
            'linear-gradient(135deg, #c0392b, #e74c3c)',
            'linear-gradient(135deg, #2980b9, #3498db)',
            'linear-gradient(135deg, #27ae60, #2ecc71)',
            'linear-gradient(135deg, #8e44ad, #9b59b6)',
            'linear-gradient(135deg, #d35400, #e67e22)',
            'linear-gradient(135deg, #16a085, #1abc9c)',
            'linear-gradient(135deg, #2c3e50, #34495e)',
            'linear-gradient(135deg, #c0392b, #f39c12)'
        ];
        vinylLabel.style.background = colors[currentIndex % colors.length];
        vinylLabelText.textContent = '♪';

        // 高亮当前播放项
        var items = playlistEl.querySelectorAll('.playlist-item');
        items.forEach(function(item, i) {
            item.classList.toggle('active', i === currentIndex);
        });

        // 滚动到当前项
        if (items[currentIndex]) {
            items[currentIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    // 播放/暂停切换
    playBtn.addEventListener('click', function() {
        if (playlist.length === 0) {
            alert('请先选择音乐文件');
            return;
        }

        if (currentIndex === -1) {
            playSong(0);
            return;
        }

        if (isPlaying) {
            audio.pause();
            isPlaying = false;
        } else {
            audio.play();
            isPlaying = true;
        }
        updatePlayState();
    });

    // 上一首
    prevBtn.addEventListener('click', function() {
        if (playlist.length === 0) return;
        var prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        playSong(prevIndex);
    });

    // 下一首
    nextBtn.addEventListener('click', function() {
        if (playlist.length === 0) return;
        var nextIndex = (currentIndex + 1) % playlist.length;
        playSong(nextIndex);
    });

    // 音量控制
    volumeSlider.addEventListener('input', function() {
        audio.volume = this.value / 100;
    });

    // 进度条拖拽/点击
    var isDraggingProgress = false;

    function seekTo(e) {
        if (!audio.duration) return;
        var rect = progressBar.getBoundingClientRect();
        var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        var percent = Math.max(0, Math.min(1, x / rect.width));
        audio.currentTime = percent * audio.duration;
        updateProgress();
    }

    progressBar.addEventListener('mousedown', function(e) {
        isDraggingProgress = true;
        seekTo(e);
    });

    progressBar.addEventListener('touchstart', function(e) {
        isDraggingProgress = true;
        seekTo(e);
    }, { passive: true });

    document.addEventListener('mousemove', function(e) {
        if (isDraggingProgress) seekTo(e);
    });

    document.addEventListener('touchmove', function(e) {
        if (isDraggingProgress) seekTo(e);
    }, { passive: true });

    document.addEventListener('mouseup', function() {
        isDraggingProgress = false;
    });

    document.addEventListener('touchend', function() {
        isDraggingProgress = false;
    });

    // 音频事件
    audio.addEventListener('timeupdate', function() {
        updateProgress();
    });

    audio.addEventListener('loadedmetadata', function() {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', function() {
        // 自动播放下一首
        var nextIndex = (currentIndex + 1) % playlist.length;
        playSong(nextIndex);
    });

    audio.addEventListener('play', function() {
        isPlaying = true;
        updatePlayState();
    });

    audio.addEventListener('pause', function() {
        isPlaying = false;
        updatePlayState();
    });

    // 更新播放状态（唱片旋转 + 唱臂位置 + 按钮图标）
    function updatePlayState() {
        // 唱片旋转
        if (isPlaying) {
            vinylRecord.classList.add('spinning');
            vinylRecord.classList.remove('paused');
            tonearm.classList.add('playing');
        } else {
            if (vinylRecord.classList.contains('spinning')) {
                vinylRecord.classList.remove('spinning');
                vinylRecord.classList.add('paused');
            }
            tonearm.classList.remove('playing');
        }

        // 播放/暂停图标
        if (isPlaying) {
            playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        } else {
            playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        }

        // 状态文字
        if (currentIndex >= 0) {
            songStatus.textContent = isPlaying
                ? '正在播放 ' + (currentIndex + 1) + ' / ' + playlist.length
                : '已暂停';
        }
    }

    // 更新进度条
    function updateProgress() {
        if (!audio.duration) return;
        var percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = percent + '%';
        progressThumb.style.left = percent + '%';
        currentTimeEl.textContent = formatTime(audio.currentTime);
    }

    // 格式化时间
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }
})();
