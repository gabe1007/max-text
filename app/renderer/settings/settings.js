// app/renderer/settings/settings.js
// Settings window — Apple-style sidebar controller

const SECTION_META = {
  hotkey:  { title: 'Hotkey',  subtitle: 'Configure a tecla de atalho global' },
  audio:   { title: 'Áudio',  subtitle: 'Selecione e teste seu microfone' },
  whisper: { title: 'Whisper', subtitle: 'Gerencie os modelos de transcrição' },
  output:  { title: 'Saída',  subtitle: 'Configure o que acontece após a transcrição' },
  future:  { title: 'Futuro', subtitle: 'Funcionalidades em desenvolvimento' },
};

class SettingsController {
  constructor() {
    this.config = {};
    this.isCapturingHotkey = false;
    this.testingMic = false;
    this.audioContext = null;
    this.analyser = null;
    this.mediaStream = null;

    this.setupNavigation();
    this.setupSegmentedControl();
    this.setupListeners();
    this.loadInitialData();
  }

  // ============ Sidebar Navigation ============

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contents = document.querySelectorAll('.tab-content');
    const titleEl = document.getElementById('section-title');
    const subtitleEl = document.getElementById('section-subtitle');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tabId = item.getAttribute('data-tab');

        // Active nav
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        // Show section
        contents.forEach(c => {
          c.classList.remove('active');
          if (c.id === `tab-${tabId}`) c.classList.add('active');
        });

        // Update header
        const meta = SECTION_META[tabId];
        if (meta) {
          if (titleEl) titleEl.textContent = meta.title;
          if (subtitleEl) subtitleEl.textContent = meta.subtitle;
        }
      });
    });
  }

  // ============ Segmented Control ============

  setupSegmentedControl() {
    const segments = document.querySelectorAll('.segmented-control .segment');
    segments.forEach(seg => {
      seg.addEventListener('click', () => {
        segments.forEach(s => s.classList.remove('active'));
        seg.classList.add('active');

        const mode = seg.getAttribute('data-mode');
        if (mode) this.saveConfig({ hotkeyMode: mode });
      });
    });
  }

  // ============ Load Data ============

  async loadInitialData() {
    try {
      this.config = await window.api.getConfig();
      this.updateUIFromConfig();

      const hotkeyInfo = await window.api.getHotkey();
      this.updateHotkeyDisplay(hotkeyInfo.hotkey, hotkeyInfo.mode);

      await this.loadWhisperStatus();
      await this.loadAppStatus();
      await this.loadAudioDevices();
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  updateUIFromConfig() {
    // Segmented control for hotkey mode
    const segments = document.querySelectorAll('.segmented-control .segment');
    segments.forEach(seg => {
      seg.classList.toggle('active', seg.getAttribute('data-mode') === this.config.hotkeyMode);
    });

    // Whisper model
    const modelSelect = document.getElementById('whisper-model');
    if (modelSelect) modelSelect.value = this.config.whisperModel;

    // Toggle switches
    const copyToggle = document.getElementById('copy-clipboard');
    const historyToggle = document.getElementById('save-history');
    if (copyToggle) copyToggle.checked = this.config.copyToClipboard;
    if (historyToggle) historyToggle.checked = this.config.saveHistory;
  }

  updateHotkeyDisplay(hotkey) {
    const hotkeyInput = document.getElementById('current-hotkey');
    const hotkeyDisplay = document.getElementById('hotkey-display');
    if (hotkeyInput) hotkeyInput.value = hotkey;
    if (hotkeyDisplay) hotkeyDisplay.textContent = hotkey;
  }

  async loadWhisperStatus() {
    try {
      const status = await window.api.getWhisperStatus();
      const models = await window.api.getWhisperModels();

      const pathInput = document.getElementById('models-path');
      if (pathInput) pathInput.value = status.modelsPath;

      const modelsList = document.getElementById('models-list');
      if (modelsList) {
        modelsList.innerHTML = models.map(model => `
          <div class="model-item">
            <div class="model-info">
              <span class="model-name">${model.name}</span>
            </div>
            <span class="model-badge ${model.installed ? 'installed' : 'missing'}">
              ${model.installed ? '✓ Instalado' : '—'}
            </span>
          </div>
        `).join('');
      }

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
      const el = document.getElementById('permission-status');
      if (!el) return;

      if (status.microphonePermission === 'granted') {
        el.className = 'status-badge granted';
        el.textContent = '✅ Concedida';
      } else if (status.microphonePermission === 'denied') {
        el.className = 'status-badge denied';
        el.textContent = '❌ Negada';
      } else {
        el.className = 'status-badge unknown';
        el.textContent = '❓ Não solicitada';
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
        const defaultOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(defaultOption);

        audioDevices.forEach(device => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = device.label || `Microfone ${select.options.length}`;
          if (device.deviceId === this.config.audioDeviceId) option.selected = true;
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
      if (this.isCapturingHotkey) this.finishCapturingHotkey(key);
    });

    // ---- Hotkey ----
    const btnChangeHotkey = document.getElementById('btn-change-hotkey');
    if (btnChangeHotkey) {
      btnChangeHotkey.addEventListener('click', () => this.startCapturingHotkey());
    }

    // ---- Audio ----
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

    // ---- Whisper ----
    const whisperModelSelect = document.getElementById('whisper-model');
    if (whisperModelSelect) {
      whisperModelSelect.addEventListener('change', () => {
        this.saveConfig({ whisperModel: whisperModelSelect.value });
      });
    }

    // ---- Output toggles ----
    const copyToggle = document.getElementById('copy-clipboard');
    if (copyToggle) {
      copyToggle.addEventListener('change', () => {
        this.saveConfig({ copyToClipboard: copyToggle.checked });
      });
    }

    const historyToggle = document.getElementById('save-history');
    if (historyToggle) {
      historyToggle.addEventListener('change', () => {
        this.saveConfig({ saveHistory: historyToggle.checked });
      });
    }

    // ---- History ----
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

    if (hotkeyInput) hotkeyInput.value = '…';
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

    window.api.setHotkey(key);
    this.updateHotkeyDisplay(key);
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
      if (btn) btn.textContent = 'Testar';
    } else {
      await this.startMicTest();
      if (btn) btn.textContent = 'Parar';
    }
  }

  async startMicTest() {
    try {
      const select = document.getElementById('audio-device');
      const deviceId = select ? select.value : null;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });

      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.testingMic = true;
      this.animateMeter();

      const el = document.getElementById('permission-status');
      if (el) {
        el.className = 'status-badge granted';
        el.textContent = '✅ Concedida';
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      const el = document.getElementById('permission-status');
      if (el) {
        el.className = 'status-badge denied';
        el.textContent = '❌ Negada';
      }
    }
  }

  stopMicTest() {
    this.testingMic = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
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
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const level = Math.min(100, (avg / 255) * 200);
    const bar = document.getElementById('meter-bar');
    if (bar) bar.style.width = `${level}%`;
    requestAnimationFrame(() => this.animateMeter());
  }

  // ============ History ============

  async loadHistory() {
    try {
      const history = await window.api.getHistory();
      const list = document.getElementById('history-list');
      if (!list) return;

      if (history.length === 0) {
        list.innerHTML = '<div class="history-empty">Nenhum histórico</div>';
      } else {
        list.innerHTML = history.slice(0, 20).map(entry => `
          <div class="history-item">
            <div class="history-meta">
              <span>${new Date(entry.timestamp).toLocaleString('pt-BR')}</span>
              <span>${Math.round(entry.duration / 1000)}s</span>
            </div>
            <div class="history-text">${this.escapeHtml(entry.text)}</div>
          </div>
        `).join('');
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

// Boot
document.addEventListener('DOMContentLoaded', () => {
  new SettingsController();
});
