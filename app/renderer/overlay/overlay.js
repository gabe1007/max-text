// app/renderer/overlay/overlay.js
// Overlay window - Apple-inspired wave visualization

class OverlayController {
    constructor() {
        this.statusDot = document.querySelector('.status-dot');
        this.visualizerCanvas = document.getElementById('visualizer');
        this.visualizerCtx = this.visualizerCanvas.getContext('2d');

        this.isRecording = false;

        // Audio
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.animationFrame = null;
        this.mediaRecorder = null;
        this.audioChunks = [];

        // Smooth animation values
        this.barHeights = [];
        this.targetHeights = [];

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
            // Keep recording state
        });

        window.api.onTranscriptionFinal((result) => {
            this.setStatus('done');
        });

        window.api.onTranscriptionError((error) => {
            console.error('Transcription error:', error);
            this.setStatus('error');
        });

        // Resize handling
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.visualizerCanvas.parentElement;
        this.visualizerCanvas.width = container.clientWidth;
        this.visualizerCanvas.height = 28;

        // Initialize bar heights for smooth animation
        const barCount = 24;
        this.barHeights = new Array(barCount).fill(2);
        this.targetHeights = new Array(barCount).fill(2);
    }

    async startRecording() {
        this.isRecording = true;
        this.audioChunks = [];

        this.setStatus('recording');

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
            this.analyser.fftSize = 128;
            this.analyser.smoothingTimeConstant = 0.85;
            source.connect(this.analyser);

            this.startVisualization();
            this.startAudioRecording();

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.setStatus('error');
        }
    }

    async stopRecording() {
        this.isRecording = false;
        this.setStatus('processing');

        // Stop visualization
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Animate bars to rest
        this.animateBarsToRest();

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

    animateBarsToRest() {
        const animate = () => {
            let allAtRest = true;

            for (let i = 0; i < this.barHeights.length; i++) {
                if (this.barHeights[i] > 2) {
                    this.barHeights[i] = Math.max(2, this.barHeights[i] * 0.85);
                    allAtRest = false;
                }
            }

            this.drawBars();

            if (!allAtRest) {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    startAudioRecording() {
        if (!this.mediaStream) return;

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

        this.mediaRecorder.start(100);
    }

    async stopAndProcessRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    const arrayBuffer = await audioBlob.arrayBuffer();
                    console.log('Sending audio to main process, size:', arrayBuffer.byteLength);
                    window.api.sendAudioForTranscription(Array.from(new Uint8Array(arrayBuffer)));
                } catch (error) {
                    console.error('Error processing audio:', error);
                    this.setStatus('error');
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

            const barCount = this.barHeights.length;
            const step = Math.floor(bufferLength / barCount);

            // Update target heights
            for (let i = 0; i < barCount; i++) {
                const value = dataArray[i * step];
                const normalizedHeight = (value / 255) * 24 + 2;
                this.targetHeights[i] = normalizedHeight;
            }

            // Smooth interpolation towards target (Apple-like smooth animation)
            for (let i = 0; i < barCount; i++) {
                const diff = this.targetHeights[i] - this.barHeights[i];
                this.barHeights[i] += diff * 0.25;
            }

            this.drawBars();
        };

        draw();
    }

    drawBars() {
        const ctx = this.visualizerCtx;
        const width = this.visualizerCanvas.width;
        const height = this.visualizerCanvas.height;
        const barCount = this.barHeights.length;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Bar dimensions
        const totalGap = (barCount - 1) * 3;
        const barWidth = (width - totalGap) / barCount;
        const centerY = height / 2;

        for (let i = 0; i < barCount; i++) {
            const barHeight = this.barHeights[i];
            const x = i * (barWidth + 3);
            const y = centerY - barHeight / 2;

            // Apple-style blue gradient
            const intensity = barHeight / 26;
            const alpha = 0.6 + intensity * 0.4;

            // Create gradient with Apple blue
            const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
            gradient.addColorStop(0, `rgba(0, 122, 255, ${alpha})`);
            gradient.addColorStop(1, `rgba(10, 132, 255, ${alpha * 0.8})`);

            ctx.fillStyle = gradient;

            // Rounded bars
            const radius = Math.min(barWidth / 2, barHeight / 2, 2);
            this.roundRect(ctx, x, y, barWidth, barHeight, radius);
            ctx.fill();
        }
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    setStatus(state) {
        this.statusDot.className = 'status-dot ' + state;

        const container = document.querySelector('.overlay-container');
        container.className = 'overlay-container ' + state;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new OverlayController();
});
