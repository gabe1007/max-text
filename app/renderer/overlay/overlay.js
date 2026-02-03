// app/renderer/overlay/overlay.js
// Overlay window main script

class OverlayController {
    constructor() {
        this.statusDot = document.querySelector('.status-dot');
        this.statusText = document.getElementById('status-text');
        this.timer = document.getElementById('timer');
        this.transcription = document.getElementById('transcription');
        this.visualizerCanvas = document.getElementById('visualizer');
        this.visualizerCtx = this.visualizerCanvas.getContext('2d');

        this.isRecording = false;
        this.startTime = 0;
        this.timerInterval = null;
        this.transcriptionText = '';

        // Audio
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.animationFrame = null;
        this.mediaRecorder = null;
        this.audioChunks = [];

        this.setupListeners();
        this.resizeCanvas();
    }

    setupListeners() {
        // Recording events from main process
        window.api.onRecordingStart(() => {
            this.startRecording();
        });

        window.api.onRecordingStop(() => {
            this.stopRecording();
        });

        // Transcription events
        window.api.onTranscriptionPartial((result) => {
            this.updateTranscription(result.text, true);
        });

        window.api.onTranscriptionFinal((result) => {
            this.updateTranscription(result.text, false);
            this.setStatus('done', 'Concluído');
        });

        window.api.onTranscriptionError((error) => {
            console.error('Transcription error:', error);
            this.showError(error);
        });

        // Resize handling
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.visualizerCanvas.parentElement;
        this.visualizerCanvas.width = container.clientWidth - 8;
        this.visualizerCanvas.height = 40;
    }

    async startRecording() {
        this.isRecording = true;
        this.startTime = Date.now();
        this.transcriptionText = '';
        this.audioChunks = [];
        this.transcription.innerHTML = '<span class="placeholder">Fale agora...</span>';

        this.setStatus('recording', 'Gravando...');
        this.startTimer();

        try {
            // Get microphone stream
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // Setup audio context for visualization
            this.audioContext = new AudioContext({ sampleRate: 16000 });
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;
            source.connect(this.analyser);

            this.startVisualization();
            this.startAudioRecording();

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showError('Não foi possível acessar o microfone. Verifique as permissões.');
        }
    }

    async stopRecording() {
        this.isRecording = false;
        this.setStatus('processing', 'Processando...');
        this.stopTimer();

        // Stop visualization
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Clear canvas
        this.visualizerCtx.clearRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);

        // Stop media recorder and wait for final data
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            await this.stopAndProcessRecording();
        }

        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
            this.analyser = null;
        }
    }

    startAudioRecording() {
        if (!this.mediaStream) return;

        // Use WAV-compatible format if possible, fallback to webm
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : 'audio/webm';

        this.mediaRecorder = new MediaRecorder(this.mediaStream, {
            mimeType,
            audioBitsPerSecond: 128000,
        });

        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        // Start recording
        this.mediaRecorder.start(100); // Get data every 100ms
    }

    async stopAndProcessRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                try {
                    // Create blob from chunks
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

                    // Convert to ArrayBuffer
                    const arrayBuffer = await audioBlob.arrayBuffer();

                    // Send to main process for transcription
                    console.log('Sending audio to main process, size:', arrayBuffer.byteLength);
                    window.api.sendAudioForTranscription(Array.from(new Uint8Array(arrayBuffer)));

                } catch (error) {
                    console.error('Error processing audio:', error);
                    this.showError('Erro ao processar áudio');
                }
                resolve();
            };

            this.mediaRecorder.stop();
        });
    }

    startVisualization() {
        if (!this.analyser) return;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            if (!this.isRecording) return;

            this.animationFrame = requestAnimationFrame(draw);

            this.analyser.getByteFrequencyData(dataArray);

            const ctx = this.visualizerCtx;
            const width = this.visualizerCanvas.width;
            const height = this.visualizerCanvas.height;

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Draw bars
            const barCount = 40;
            const barWidth = (width / barCount) - 2;
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
                const value = dataArray[i * step];
                const barHeight = (value / 255) * height * 0.9;
                const x = i * (barWidth + 2);
                const y = height - barHeight;

                // Gradient color based on intensity
                const hue = 200 + (value / 255) * 60;
                const saturation = 70 + (value / 255) * 30;
                const lightness = 40 + (value / 255) * 20;

                ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                ctx.fillRect(x, y, barWidth, barHeight);

                ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                ctx.shadowBlur = value > 100 ? 10 : 0;
            }

            ctx.shadowBlur = 0;
        };

        draw();
    }

    startTimer() {
        this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const elapsed = Date.now() - this.startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    setStatus(state, text) {
        this.statusDot.className = 'status-dot ' + state;
        this.statusText.textContent = text;

        const container = document.querySelector('.overlay-container');
        container.className = 'overlay-container ' + state;
    }

    updateTranscription(text, isPartial) {
        this.transcriptionText = text;

        if (text && text.trim()) {
            const className = isPartial ? 'partial' : 'final';
            this.transcription.innerHTML = `<span class="${className}">${this.escapeHtml(text)}</span>`;
        } else {
            this.transcription.innerHTML = '<span class="placeholder">Fale agora...</span>';
        }

        // Auto-scroll
        this.transcription.scrollTop = this.transcription.scrollHeight;
    }

    showError(message) {
        this.statusDot.className = 'status-dot';
        this.statusDot.style.background = '#ef4444';
        this.statusText.textContent = 'Erro';
        this.transcription.innerHTML = `<span style="color: #ef4444;">${this.escapeHtml(message)}</span>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new OverlayController();
});
