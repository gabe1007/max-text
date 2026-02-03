// core/chunker.ts
// Audio chunking for streaming transcription

export interface AudioChunk {
    data: Blob;
    index: number;
    timestamp: number;
    duration: number;
}

export class AudioChunker {
    private mediaRecorder: MediaRecorder | null = null;
    private chunks: Blob[] = [];
    private chunkIndex: number = 0;
    private startTime: number = 0;
    private chunkDuration: number;
    private onChunk: ((chunk: AudioChunk) => void) | null = null;

    constructor(chunkDurationMs: number = 2000) {
        this.chunkDuration = chunkDurationMs;
    }

    start(stream: MediaStream, onChunk: (chunk: AudioChunk) => void): void {
        this.onChunk = onChunk;
        this.chunks = [];
        this.chunkIndex = 0;
        this.startTime = Date.now();

        // Choose best supported mime type
        const mimeType = this.getSupportedMimeType();

        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: 64000,
        });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.chunks.push(event.data);
                this.emitChunk();
            }
        };

        this.mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event);
        };

        // Start recording with chunk intervals
        this.mediaRecorder.start(this.chunkDuration);
    }

    stop(): Blob | null {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.chunks.length > 0) {
            return new Blob(this.chunks, { type: this.getSupportedMimeType() });
        }

        return null;
    }

    pause(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
        }
    }

    resume(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
        }
    }

    private emitChunk(): void {
        if (this.chunks.length === 0 || !this.onChunk) return;

        const latestChunk = this.chunks[this.chunks.length - 1];
        const chunk: AudioChunk = {
            data: latestChunk,
            index: this.chunkIndex++,
            timestamp: Date.now(),
            duration: this.chunkDuration,
        };

        this.onChunk(chunk);
    }

    private getSupportedMimeType(): string {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return 'audio/webm';
    }

    getRecordedDuration(): number {
        return Date.now() - this.startTime;
    }

    isRecording(): boolean {
        return this.mediaRecorder?.state === 'recording';
    }
}

// Utility: Convert blob to ArrayBuffer
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return blob.arrayBuffer();
}

// Utility: Convert blob to base64
export async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
