// app/main/session.ts
// Recording session management

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { app, clipboard } from 'electron';

import { whisperManager } from './whisper';
import { getConfig, addHistoryEntry } from './config';
import { sendToOverlay } from './windows';
import { autoTypeText } from './autotype';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { TranscriptionResult, TranscriptionSession, HistoryEntry } from '../../shared/types';

class SessionManager extends EventEmitter {
    private currentSession: TranscriptionSession | null = null;
    private tempDir: string;
    private chunkQueue: string[] = [];
    private isProcessingQueue: boolean = false;

    constructor() {
        super();
        this.tempDir = path.join(os.tmpdir(), 'max-text');
        this.ensureTempDir();
    }

    private ensureTempDir(): void {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    startSession(): string {
        const sessionId = this.generateId();

        this.currentSession = {
            id: sessionId,
            startTime: Date.now(),
            endTime: null,
            chunks: [],
            finalText: '',
        };

        whisperManager.resetSession();
        this.chunkQueue = [];

        console.log(`Session started: ${sessionId}`);
        return sessionId;
    }

    async endSession(): Promise<TranscriptionSession | null> {
        if (!this.currentSession) {
            return null;
        }

        this.currentSession.endTime = Date.now();

        // Wait for queue to finish
        while (this.isProcessingQueue) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Combine all chunk texts
        const finalText = this.currentSession.chunks
            .map(c => c.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

        this.currentSession.finalText = finalText;

        const session = { ...this.currentSession };

        // Handle output based on config
        const config = getConfig();

        // Auto-type to current cursor position (this also copies to clipboard)
        if (finalText) {
            await autoTypeText(finalText);
        }

        if (config.saveHistory && finalText) {
            const entry: HistoryEntry = {
                id: session.id,
                timestamp: session.startTime,
                text: finalText,
                duration: (session.endTime || Date.now()) - session.startTime,
                model: config.whisperModel,
            };
            addHistoryEntry(entry);
        }

        // Send final transcription to overlay
        sendToOverlay(IPC_CHANNELS.TRANSCRIPTION_FINAL, {
            text: finalText,
            isPartial: false,
            timestamp: Date.now(),
            chunkIndex: -1,
        });

        // Clean up
        this.cleanupTempFiles();
        this.currentSession = null;

        console.log(`Session ended: ${session.id}, text: "${finalText.substring(0, 50)}..."`);
        return session;
    }

    async processAudioChunk(audioBuffer: Buffer): Promise<void> {
        if (!this.currentSession) {
            console.warn('No active session, ignoring audio chunk');
            return;
        }

        // Save chunk to temp file
        const chunkPath = path.join(this.tempDir, `chunk_${Date.now()}.wav`);
        fs.writeFileSync(chunkPath, audioBuffer);

        this.chunkQueue.push(chunkPath);
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.chunkQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.chunkQueue.length > 0) {
            const chunkPath = this.chunkQueue.shift()!;

            try {
                const result = await whisperManager.transcribe(chunkPath);

                if (this.currentSession) {
                    this.currentSession.chunks.push(result);

                    // Send partial result
                    sendToOverlay(IPC_CHANNELS.TRANSCRIPTION_PARTIAL, result);
                }

                // Clean up chunk file
                try {
                    fs.unlinkSync(chunkPath);
                } catch { }

            } catch (error) {
                console.error('Error processing chunk:', error);
                sendToOverlay(IPC_CHANNELS.TRANSCRIPTION_ERROR, (error as Error).message);
            }
        }

        this.isProcessingQueue = false;
    }

    abortSession(): void {
        if (this.currentSession) {
            whisperManager.abort();
            this.cleanupTempFiles();
            this.currentSession = null;
            this.chunkQueue = [];
            this.isProcessingQueue = false;
        }
    }

    isActive(): boolean {
        return this.currentSession !== null;
    }

    getCurrentSession(): TranscriptionSession | null {
        return this.currentSession;
    }

    private cleanupTempFiles(): void {
        try {
            const files = fs.readdirSync(this.tempDir);
            for (const file of files) {
                if (file.startsWith('chunk_')) {
                    fs.unlinkSync(path.join(this.tempDir, file));
                }
            }
        } catch (error) {
            console.error('Error cleaning temp files:', error);
        }
    }

    private generateId(): string {
        // Simple UUID using crypto
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

export const sessionManager = new SessionManager();
