// app/renderer/settings/settings.js
// Settings window main script

class SettingsController {
    constructor() {
        this.config = {};
        this.isCapturingHotkey = false;
        this.testingMic = false;
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;

        this.setupTabs();
        this.setupListeners();
        this.loadInitialData();
    }

    // ============ Tabs ============

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');

                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding content
                contents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `tab-${tabId}`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    // ============ Load Data ============

    async loadInitialData() {
        try {
            // Load config
            this.config = await window.api.getConfig();
            this.updateUIFromConfig();

            // Load hotkey info
            const hotkeyInfo = await window.api.getHotkey();
            this.updateHotkeyDisplay(hotkeyInfo.hotkey, hotkeyInfo.mode);

            // Load whisper status
            await this.loadWhisperStatus();

            // Load app status
            await this.loadAppStatus();

            // Load audio devices
            await this.loadAudioDevices();

        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    updateUIFromConfig() {
        // Hotkey mode
        const modeRadios = document.querySelectorAll('input[name="hotkey-mode"]');
        modeRadios.forEach(radio => {
            radio.checked = radio.value === this.config.hotkeyMode;
        });

        // Whisper model
        const modelSelect = document.getElementById('whisper-model');
        if (modelSelect) {
            modelSelect.value = this.config.whisperModel;
        }

        // Output settings
        const copyCheckbox = document.getElementById('copy-clipboard');
        const historyCheckbox = document.getElementById('save-history');
        if (copyCheckbox) copyCheckbox.checked = this.config.copyToClipboard;
        if (historyCheckbox) historyCheckbox.checked = this.config.saveHistory;
    }

    updateHotkeyDisplay(hotkey, mode) {
        const hotkeyInput = document.getElementById('current-hotkey');
        const hotkeyDisplay = document.getElementById('hotkey-display');

        if (hotkeyInput) hotkeyInput.value = hotkey;
        if (hotkeyDisplay) hotkeyDisplay.textContent = hotkey;
    }

    async loadWhisperStatus() {
        try {
            const status = await window.api.getWhisperStatus();
            const models = await window.api.getWhisperModels();

            // Update models path
            const pathInput = document.getElementById('models-path');
            if (pathInput) pathInput.value = status.modelsPath;

            // Update models list
            const modelsList = document.getElementById('models-list');
            if (modelsList) {
                modelsList.innerHTML = models.map(model => `
          <div class="model-item">
            <div class="model-info">
              <span class="model-name">${model.name}</span>
            </div>
            <span class="model-status ${model.installed ? 'installed' : 'missing'}">
              ${model.installed ? '✓ Instalado' : '✗ Não instalado'}
            </span>
          </div>
        `).join('');
            }

            // Update whisper status alert
            const statusAlert = document.getElementById('whisper-status');
            if (statusAlert) {
                if (status.available) {
                    statusAlert.className = 'alert alert-success';
                    statusAlert.innerHTML = '<span class="alert-icon">✅</span><span>Whisper.cpp disponível</span>';
                } else {
                    statusAlert.className = 'alert alert-warning';
                    statusAlert.innerHTML = `
            <span class="alert-icon">⚠️</span>
            <span>Whisper.cpp não encontrado. Baixe de <a href="https://github.com/ggerganov/whisper.cpp" target="_blank">github.com/ggerganov/whisper.cpp</a></span>
          `;
                }
            }

        } catch (error) {
            console.error('Error loading whisper status:', error);
        }
    }

    async loadAppStatus() {
        try {
            const status = await window.api.getAppStatus();

            const permissionStatus = document.getElementById('permission-status');
            if (permissionStatus) {
                if (status.microphonePermission === 'granted') {
                    permissionStatus.className = 'permission-status granted';
                    permissionStatus.innerHTML = '<span class="status-icon">✅</span><span>Permissão concedida</span>';
                } else if (status.microphonePermission === 'denied') {
                    permissionStatus.className = 'permission-status denied';
                    permissionStatus.innerHTML = '<span class="status-icon">❌</span><span>Permissão negada</span>';
                } else {
                    permissionStatus.innerHTML = '<span class="status-icon">❓</span><span>Permissão não solicitada</span>';
                }
            }
        } catch (error) {
            console.error('Error loading app status:', error);
        }
    }

    async loadAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevices = devices.filter(d => d.kind === 'audioinput');

            const select = document.getElementById('audio-device');
            if (select) {
                // Keep default option
                const defaultOption = select.options[0];
                select.innerHTML = '';
                select.appendChild(defaultOption);

                audioDevices.forEach(device => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Microfone ${select.options.length}`;
                    if (device.deviceId === this.config.audioDeviceId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading audio devices:', error);
        }
    }

    // ============ Event Listeners ============

    setupListeners() {
        // Config updates from main
        window.api.onConfigUpdated((config) => {
            this.config = config;
            this.updateUIFromConfig();
        });

        // Hotkey captured
        window.api.onHotkeyCaptured((key) => {
            if (this.isCapturingHotkey) {
                this.finishCapturingHotkey(key);
            }
        });

        // ---- Hotkey Section ----

        const btnChangeHotkey = document.getElementById('btn-change-hotkey');
        if (btnChangeHotkey) {
            btnChangeHotkey.addEventListener('click', () => this.startCapturingHotkey());
        }

        const modeRadios = document.querySelectorAll('input[name="hotkey-mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.saveConfig({ hotkeyMode: e.target.value });
            });
        });

        // ---- Audio Section ----

        const btnRefreshDevices = document.getElementById('btn-refresh-devices');
        if (btnRefreshDevices) {
            btnRefreshDevices.addEventListener('click', () => this.loadAudioDevices());
        }

        const btnTestMic = document.getElementById('btn-test-mic');
        if (btnTestMic) {
            btnTestMic.addEventListener('click', () => this.toggleMicTest());
        }

        const audioDeviceSelect = document.getElementById('audio-device');
        if (audioDeviceSelect) {
            audioDeviceSelect.addEventListener('change', () => {
                this.saveConfig({ audioDeviceId: audioDeviceSelect.value || null });
            });
        }

        // ---- Whisper Section ----

        const whisperModelSelect = document.getElementById('whisper-model');
        if (whisperModelSelect) {
            whisperModelSelect.addEventListener('change', () => {
                this.saveConfig({ whisperModel: whisperModelSelect.value });
            });
        }

        // ---- Output Section ----

        const copyCheckbox = document.getElementById('copy-clipboard');
        if (copyCheckbox) {
            copyCheckbox.addEventListener('change', () => {
                this.saveConfig({ copyToClipboard: copyCheckbox.checked });
            });
        }

        const historyCheckbox = document.getElementById('save-history');
        if (historyCheckbox) {
            historyCheckbox.addEventListener('change', () => {
                this.saveConfig({ saveHistory: historyCheckbox.checked });
            });
        }

        const btnViewHistory = document.getElementById('btn-view-history');
        if (btnViewHistory) {
            btnViewHistory.addEventListener('click', () => this.loadHistory());
        }

        const btnClearHistory = document.getElementById('btn-clear-history');
        if (btnClearHistory) {
            btnClearHistory.addEventListener('click', () => {
                if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
                    window.api.clearHistory();
                    this.loadHistory();
                }
            });
        }
    }

    // ============ Hotkey Capture ============

    startCapturingHotkey() {
        this.isCapturingHotkey = true;

        const hotkeyInput = document.getElementById('current-hotkey');
        const hint = document.getElementById('hotkey-hint');
        const btn = document.getElementById('btn-change-hotkey');

        if (hotkeyInput) hotkeyInput.value = '...';
        if (hint) hint.classList.add('visible');
        if (btn) {
            btn.textContent = 'Cancelar';
            btn.onclick = () => this.cancelCapturingHotkey();
        }

        window.api.startCapturingHotkey();
    }

    finishCapturingHotkey(key) {
        this.isCapturingHotkey = false;

        const hotkeyInput = document.getElementById('current-hotkey');
        const hint = document.getElementById('hotkey-hint');
        const btn = document.getElementById('btn-change-hotkey');

        if (hotkeyInput) hotkeyInput.value = key;
        if (hint) hint.classList.remove('visible');
        if (btn) {
            btn.textContent = 'Alterar';
            btn.onclick = () => this.startCapturingHotkey();
        }

        // Save new hotkey
        window.api.setHotkey(key);
        this.updateHotkeyDisplay(key, this.config.hotkeyMode);
    }

    cancelCapturingHotkey() {
        this.isCapturingHotkey = false;
        window.api.stopCapturingHotkey();

        const hotkeyInput = document.getElementById('current-hotkey');
        const hint = document.getElementById('hotkey-hint');
        const btn = document.getElementById('btn-change-hotkey');

        if (hotkeyInput) hotkeyInput.value = this.config.hotkey;
        if (hint) hint.classList.remove('visible');
        if (btn) {
            btn.textContent = 'Alterar';
            btn.onclick = () => this.startCapturingHotkey();
        }
    }

    // ============ Mic Test ============

    async toggleMicTest() {
        const btn = document.getElementById('btn-test-mic');

        if (this.testingMic) {
            this.stopMicTest();
            if (btn) btn.textContent = '🎤 Testar';
        } else {
            await this.startMicTest();
            if (btn) btn.textContent = '⏹️ Parar';
        }
    }

    async startMicTest() {
        try {
            const select = document.getElementById('audio-device');
            const deviceId = select ? select.value : null;

            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: deviceId ? { deviceId: { exact: deviceId } } : true
            });

            this.audioContext = new AudioContext();
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            this.testingMic = true;
            this.animateMeter();

            // Update permission status
            const permissionStatus = document.getElementById('permission-status');
            if (permissionStatus) {
                permissionStatus.className = 'permission-status granted';
                permissionStatus.innerHTML = '<span class="status-icon">✅</span><span>Permissão concedida</span>';
            }

        } catch (error) {
            console.error('Error accessing microphone:', error);

            const permissionStatus = document.getElementById('permission-status');
            if (permissionStatus) {
                permissionStatus.className = 'permission-status denied';
                permissionStatus.innerHTML = '<span class="status-icon">❌</span><span>Permissão negada</span>';
            }
        }
    }

    stopMicTest() {
        this.testingMic = false;

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.analyser = null;
        }

        const meterBar = document.getElementById('meter-bar');
        if (meterBar) meterBar.style.width = '0%';
    }

    animateMeter() {
        if (!this.testingMic || !this.analyser) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = Math.min(100, (average / 255) * 100 * 2);

        const meterBar = document.getElementById('meter-bar');
        if (meterBar) meterBar.style.width = `${level}%`;

        requestAnimationFrame(() => this.animateMeter());
    }

    // ============ History ============

    async loadHistory() {
        try {
            const history = await window.api.getHistory();
            const historyList = document.getElementById('history-list');

            if (historyList) {
                if (history.length === 0) {
                    historyList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Nenhum histórico</p>';
                } else {
                    historyList.innerHTML = history.slice(0, 20).map(entry => `
            <div class="history-item">
              <div class="history-item-header">
                <span>${new Date(entry.timestamp).toLocaleString('pt-BR')}</span>
                <span>${Math.round(entry.duration / 1000)}s</span>
              </div>
              <div class="history-item-text">${this.escapeHtml(entry.text)}</div>
            </div>
          `).join('');
                }
            }
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    // ============ Utils ============

    async saveConfig(partial) {
        try {
            this.config = await window.api.setConfig(partial);
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SettingsController();
});
