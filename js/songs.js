(function() {
    var STORAGE_KEY = 'songs_data';
    var editingSongId = null;

    // DOM 元素
    var songList = document.getElementById('songList');
    var emptyState = document.getElementById('emptyState');
    var addSongBtn = document.getElementById('addSongBtn');
    var modalOverlay = document.getElementById('modalOverlay');
    var modalTitle = document.getElementById('modalTitle');
    var modalClose = document.getElementById('modalClose');
    var modalCancelBtn = document.getElementById('modalCancelBtn');
    var modalSaveBtn = document.getElementById('modalSaveBtn');
    var songNameInput = document.getElementById('songNameInput');
    var songArtistInput = document.getElementById('songArtistInput');
    var songLyricsInput = document.getElementById('songLyricsInput');

    // 获取所有歌曲
    function getSongs() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    // 保存歌曲列表
    function saveSongs(songs) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    }

    // 生成唯一 ID
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // 渲染歌曲列表
    function renderSongs() {
        var songs = getSongs();

        // 清空列表（保留空状态元素）
        var cards = songList.querySelectorAll('.song-card');
        cards.forEach(function(card) { card.remove(); });

        if (songs.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        songs.forEach(function(song, index) {
            var card = document.createElement('div');
            card.className = 'song-card';
            card.style.animationDelay = (index * 0.05) + 's';

            var lyricsCount = song.lyrics ? song.lyrics.length : 0;
            var totalRecordings = 0;
            if (song.lyrics) {
                song.lyrics.forEach(function(line) {
                    if (line.recordings) totalRecordings += line.recordings.length;
                });
            }

            card.innerHTML =
                '<div class="song-card-index">' + (index + 1) + '</div>' +
                '<div class="song-card-info">' +
                    '<div class="song-card-name">' + escapeHtml(song.name) + '</div>' +
                    (song.artist ? '<div class="song-card-artist">' + escapeHtml(song.artist) + '</div>' : '') +
                '</div>' +
                '<div class="song-card-meta">' +
                    '<span class="song-card-lyrics-count">' + lyricsCount + ' 句歌词</span>' +
                    (totalRecordings > 0 ? '<span class="song-card-lyrics-count">' + totalRecordings + ' 录音</span>' : '') +
                '</div>' +
                '<div class="song-card-actions">' +
                    '<button class="song-card-action-btn edit-btn" data-id="' + song.id + '" title="编辑">' +
                        '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>' +
                    '</button>' +
                    '<button class="song-card-action-btn delete-btn" data-id="' + song.id + '" title="删除">' +
                        '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
                    '</button>' +
                '</div>';

            // 点击卡片进入详情
            card.addEventListener('click', function(e) {
                if (e.target.closest('.song-card-action-btn')) return;
                window.location.href = 'song-detail.html?id=' + song.id;
            });

            songList.appendChild(card);
        });

        // 绑定编辑按钮
        var editBtns = songList.querySelectorAll('.edit-btn');
        editBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = this.getAttribute('data-id');
                openEditModal(id);
            });
        });

        // 绑定删除按钮
        var deleteBtns = songList.querySelectorAll('.delete-btn');
        deleteBtns.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var id = this.getAttribute('data-id');
                deleteSong(id);
            });
        });
    }

    // 打开添加弹窗
    addSongBtn.addEventListener('click', function() {
        editingSongId = null;
        modalTitle.textContent = '添加歌曲';
        songNameInput.value = '';
        songArtistInput.value = '';
        songLyricsInput.value = '';
        modalOverlay.style.display = 'flex';
    });

    // 打开编辑弹窗
    function openEditModal(id) {
        var songs = getSongs();
        var song = songs.find(function(s) { return s.id === id; });
        if (!song) return;

        editingSongId = id;
        modalTitle.textContent = '编辑歌曲';
        songNameInput.value = song.name;
        songArtistInput.value = song.artist || '';

        // 将歌词数组转为文本
        var lyricsText = '';
        if (song.lyrics) {
            lyricsText = song.lyrics.map(function(line) { return line.text; }).join('\n');
        }
        songLyricsInput.value = lyricsText;

        modalOverlay.style.display = 'flex';
    }

    // 关闭弹窗
    function closeModal() {
        modalOverlay.style.display = 'none';
        editingSongId = null;
    }

    modalClose.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) closeModal();
    });

    // 保存歌曲
    modalSaveBtn.addEventListener('click', function() {
        var name = songNameInput.value.trim();
        var artist = songArtistInput.value.trim();
        var lyricsText = songLyricsInput.value.trim();

        if (!name) {
            alert('请输入歌曲名称');
            return;
        }

        if (!lyricsText) {
            alert('请输入歌词');
            return;
        }

        // 解析歌词
        var lyricsLines = lyricsText.split('\n').filter(function(line) {
            return line.trim() !== '';
        });

        var lyrics = lyricsLines.map(function(text, index) {
            return { id: 'line_' + index, text: text.trim(), recordings: [] };
        });

        var songs = getSongs();

        if (editingSongId) {
            // 编辑模式：保留已有录音
            var songIndex = songs.findIndex(function(s) { return s.id === editingSongId; });
            if (songIndex !== -1) {
                var oldLyrics = songs[songIndex].lyrics || [];
                // 尝试匹配歌词行，保留录音
                lyrics.forEach(function(newLine, newIndex) {
                    var oldLine = oldLyrics[newIndex];
                    if (oldLine && oldLine.recordings) {
                        newLine.recordings = oldLine.recordings;
                    }
                });
                songs[songIndex].name = name;
                songs[songIndex].artist = artist;
                songs[songIndex].lyrics = lyrics;
            }
        } else {
            // 添加模式
            songs.push({
                id: generateId(),
                name: name,
                artist: artist,
                lyrics: lyrics,
                createdAt: Date.now()
            });
        }

        saveSongs(songs);
        closeModal();
        renderSongs();
    });

    // 删除歌曲
    function deleteSong(id) {
        if (!confirm('确定要删除这首歌曲吗？')) return;

        var songs = getSongs();
        songs = songs.filter(function(s) { return s.id !== id; });
        saveSongs(songs);
        renderSongs();
    }

    // HTML 转义
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 初始化
    renderSongs();
})();
