(function() {
    var STORAGE_KEY = 'songs_data';
    var songId = null;
    var currentLineIndex = -1;
    var pendingAudioData = null;
    var mediaRecorder = null;
    var audioChunks = [];
    var recordingTimer = null;
    var recordingSeconds = 0;
    var currentAudio = null;

    // 从 URL 获取歌曲 ID
    var params = new URLSearchParams(window.location.search);
    songId = params.get('id');

    if (!songId) {
        window.location.href = 'songs.html';
        return;
    }

    // DOM 元素
    var songInfoName = document.getElementById('songInfoName');
    var songInfoArtist = document.getElementById('songInfoArtist');
    var lyricsList = document.getElementById('lyricsList');
    var emptyLyrics = document.getElementById('emptyLyrics');
    var maxRecordingsSelect = document.getElementById('maxRecordingsSelect');
    var sortOrderSelect = document.getElementById('sortOrderSelect');

    // 弹窗元素
    var recordModal = document.getElementById('recordModal');
    var recordModalClose = document.getElementById('recordModalClose');
    var recordLyricLine = document.getElementById('recordLyricLine');
    var recorderNameInput = document.getElementById('recorderNameInput');
    var uploadAudioBtn = document.getElementById('uploadAudioBtn');
    var recordAudioBtn = document.getElementById('recordAudioBtn');
    var audioFileInput = document.getElementById('audioFileInput');
    var recordingPanel = document.getElementById('recordingPanel');
    var recordingStatus = document.getElementById('recordingStatus');
    var recordingTimerEl = document.getElementById('recordingTimer');
    var startRecordBtn = document.getElementById('startRecordBtn');
    var stopRecordBtn = document.getElementById('stopRecordBtn');
    var cancelRecordBtn = document.getElementById('cancelRecordBtn');
    var audioPreview = document.getElementById('audioPreview');
    var audioFileName = document.getElementById('audioFileName');
    var previewAudio = document.getElementById('previewAudio');
    var recordCancelBtn = document.getElementById('recordCancelBtn');
    var recordSaveBtn = document.getElementById('recordSaveBtn');

    // 获取歌曲数据
    function getSong() {
        var songs = getSongs();
        return songs.find(function(s) { return s.id === songId; });
    }

    function getSongs() {
        try {
            var data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveSongs(songs) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    }

    // 渲染页面
    function render() {
        var song = getSong();
        if (!song) {
            alert('歌曲不存在');
            window.location.href = 'songs.html';
            return;
        }

        songInfoName.textContent = song.name;
        songInfoArtist.textContent = song.artist || '未知歌手';

        renderLyrics(song);
    }

    // 渲染歌词列表
    function renderLyrics(song) {
        // 清空
        var cards = lyricsList.querySelectorAll('.lyric-card');
        cards.forEach(function(card) { card.remove(); });

        if (!song.lyrics || song.lyrics.length === 0) {
            emptyLyrics.style.display = 'block';
            return;
        }

        emptyLyrics.style.display = 'none';

        song.lyrics.forEach(function(line, index) {
            var card = document.createElement('div');
            card.className = 'lyric-card';
            card.style.animationDelay = (index * 0.04) + 's';

            // 获取并排序录音
            var recordings = line.recordings || [];
            recordings = sortRecordings(recordings.slice());

            // 限制显示数量
            var maxShow = parseInt(maxRecordingsSelect.value);
            var displayRecordings = maxShow > 0 ? recordings.slice(0, maxShow) : recordings;

            var recordingsHtml = '';
            if (displayRecordings.length === 0) {
                recordingsHtml = '<div class="no-recordings">暂无录音，点击下方按钮添加</div>';
            } else {
                displayRecordings.forEach(function(rec, recIndex) {
                    recordingsHtml +=
                        '<div class="recording-item" data-line="' + index + '" data-rec="' + recIndex + '">' +
                            '<button class="recording-play-btn" data-audio="' + rec.audio + '">' +
                                '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
                            '</button>' +
                            '<div class="recording-info">' +
                                '<div class="recording-name">' + escapeHtml(rec.recorder) + '</div>' +
                                '<div class="recording-time">' + formatTime(rec.createdAt) + '</div>' +
                            '</div>' +
                            '<button class="recording-delete-btn" data-line="' + index + '" data-recid="' + rec.id + '">' +
                                '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>' +
                            '</button>' +
                        '</div>';
                });

                if (maxShow > 0 && recordings.length > maxShow) {
                    recordingsHtml += '<div class="no-recordings">还有 ' + (recordings.length - maxShow) + ' 个录音未显示</div>';
                }
            }

            card.innerHTML =
                '<div class="lyric-text">' + escapeHtml(line.text) + '</div>' +
                '<div class="lyric-recordings">' +
                    '<div class="lyric-recordings-header">' +
                        '<span class="lyric-recordings-title">录音 (' + recordings.length + ')</span>' +
                        '<button class="add-recording-btn" data-line="' + index + '">' +
                            '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>' +
                            '添加录音' +
                        '</button>' +
                    '</div>' +
                    '<div class="lyric-recordings-list">' + recordingsHtml + '</div>' +
                '</div>';

            lyricsList.appendChild(card);
        });

        // 绑定事件
        bindLyricEvents(song);
    }

    // 绑定歌词区域事件
    function bindLyricEvents(song) {
        // 添加录音按钮
        var addBtns = lyricsList.querySelectorAll('.add-recording-btn');
        addBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var lineIndex = parseInt(this.getAttribute('data-line'));
                openRecordModal(song, lineIndex);
            });
        });

        // 播放按钮
        var playBtns = lyricsList.querySelectorAll('.recording-play-btn');
        playBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var audioSrc = this.getAttribute('data-audio');
                var item = this.closest('.recording-item');

                // 停止当前播放
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio = null;
                    var playingItems = lyricsList.querySelectorAll('.recording-item.playing');
                    playingItems.forEach(function(el) { el.classList.remove('playing'); });
                }

                // 播放新音频
                currentAudio = new Audio(audioSrc);
                item.classList.add('playing');
                currentAudio.play();
                currentAudio.addEventListener('ended', function() {
                    item.classList.remove('playing');
                    currentAudio = null;
                });
            });
        });

        // 删除录音按钮
        var deleteBtns = lyricsList.querySelectorAll('.recording-delete-btn');
        deleteBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var lineIndex = parseInt(this.getAttribute('data-line'));
                var recId = this.getAttribute('data-recid');
                deleteRecording(song, lineIndex, recId);
            });
        });
    }

    // 排序录音
    function sortRecordings(recordings) {
        var order = sortOrderSelect.value;
        recordings.sort(function(a, b) {
            switch (order) {
                case 'time-asc': return a.createdAt - b.createdAt;
                case 'time-desc': return b.createdAt - a.createdAt;
                case 'name-asc': return a.recorder.localeCompare(b.recorder);
                case 'name-desc': return b.recorder.localeCompare(a.recorder);
                default: return 0;
            }
        });
        return recordings;
    }

    // 打开录音弹窗
    function openRecordModal(song, lineIndex) {
        currentLineIndex = lineIndex;
        pendingAudioData = null;
        recordLyricLine.textContent = song.lyrics[lineIndex].text;
        recorderNameInput.value = '';
        recordingPanel.style.display = 'none';
        audioPreview.style.display = 'none';
        previewAudio.src = '';
        recordModal.style.display = 'flex';
    }

    // 关闭弹窗
    function closeRecordModal() {
        recordModal.style.display = 'none';
        currentLineIndex = -1;
        pendingAudioData = null;
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
    }

    recordModalClose.addEventListener('click', closeRecordModal);
    recordCancelBtn.addEventListener('click', closeRecordModal);
    recordModal.addEventListener('click', function(e) {
        if (e.target === recordModal) closeRecordModal();
    });

    // 上传音频
    uploadAudioBtn.addEventListener('click', function() {
        audioFileInput.click();
    });

    audioFileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function(ev) {
            pendingAudioData = ev.target.result;
            audioFileName.textContent = file.name;
            previewAudio.src = pendingAudioData;
            audioPreview.style.display = 'block';
            recordingPanel.style.display = 'none';
        };
        reader.readAsDataURL(file);
        audioFileInput.value = '';
    });

    // 录制音频
    recordAudioBtn.addEventListener('click', function() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('您的浏览器不支持录音功能');
            return;
        }

        recordingPanel.style.display = 'block';
        audioPreview.style.display = 'none';
        recordingStatus.textContent = '准备录音...';
        recordingStatus.classList.remove('recording');
        recordingTimerEl.textContent = '0:00';
        startRecordBtn.style.display = 'flex';
        stopRecordBtn.style.display = 'none';
    });

    startRecordBtn.addEventListener('click', function() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(function(stream) {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = function(e) {
                    audioChunks.push(e.data);
                };

                mediaRecorder.onstop = function() {
                    var blob = new Blob(audioChunks, { type: 'audio/webm' });
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                        pendingAudioData = ev.target.result;
                        audioFileName.textContent = '录音 ' + new Date().toLocaleTimeString();
                        previewAudio.src = pendingAudioData;
                        audioPreview.style.display = 'block';
                    };
                    reader.readAsDataURL(blob);

                    // 停止所有音轨
                    stream.getTracks().forEach(function(track) { track.stop(); });
                };

                mediaRecorder.start();
                recordingSeconds = 0;
                recordingStatus.textContent = '正在录音...';
                recordingStatus.classList.add('recording');
                startRecordBtn.style.display = 'none';
                stopRecordBtn.style.display = 'flex';

                recordingTimer = setInterval(function() {
                    recordingSeconds++;
                    var mins = Math.floor(recordingSeconds / 60);
                    var secs = recordingSeconds % 60;
                    recordingTimerEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
                }, 1000);
            })
            .catch(function(err) {
                alert('无法访问麦克风: ' + err.message);
            });
    });

    stopRecordBtn.addEventListener('click', function() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        recordingPanel.style.display = 'none';
        recordingStatus.classList.remove('recording');
    });

    cancelRecordBtn.addEventListener('click', function() {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        recordingPanel.style.display = 'none';
        pendingAudioData = null;
        recordingStatus.classList.remove('recording');
    });

    // 保存录音
    recordSaveBtn.addEventListener('click', function() {
        if (currentLineIndex < 0) return;

        var recorderName = recorderNameInput.value.trim();
        if (!recorderName) {
            alert('请输入录音人名称');
            return;
        }

        if (!pendingAudioData) {
            alert('请先上传或录制音频');
            return;
        }

        var songs = getSongs();
        var songIndex = songs.findIndex(function(s) { return s.id === songId; });
        if (songIndex === -1) return;

        var song = songs[songIndex];
        if (!song.lyrics[currentLineIndex].recordings) {
            song.lyrics[currentLineIndex].recordings = [];
        }

        song.lyrics[currentLineIndex].recordings.push({
            id: 'rec_' + Date.now(),
            recorder: recorderName,
            audio: pendingAudioData,
            createdAt: Date.now()
        });

        saveSongs(songs);
        closeRecordModal();
        render();
    });

    // 删除录音
    function deleteRecording(song, lineIndex, recId) {
        if (!confirm('确定要删除这条录音吗？')) return;

        var songs = getSongs();
        var songIndex = songs.findIndex(function(s) { return s.id === songId; });
        if (songIndex === -1) return;

        var lyrics = songs[songIndex].lyrics;
        if (lyrics[lineIndex] && lyrics[lineIndex].recordings) {
            lyrics[lineIndex].recordings = lyrics[lineIndex].recordings.filter(function(r) {
                return r.id !== recId;
            });
        }

        saveSongs(songs);
        render();
    }

    // 设置变化时重新渲染
    maxRecordingsSelect.addEventListener('change', render);
    sortOrderSelect.addEventListener('change', render);

    // 格式化时间
    function formatTime(timestamp) {
        var d = new Date(timestamp);
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hours = d.getHours();
        var mins = d.getMinutes();
        return month + '/' + day + ' ' + hours + ':' + (mins < 10 ? '0' : '') + mins;
    }

    // HTML 转义
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 初始化
    render();
})();
