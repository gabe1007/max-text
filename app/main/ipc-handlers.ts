// app/main/ipc-handlers.ts
// IPC handlers for main process

import { ipcMain, clipboard, systemPreferences } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { AppConfig, RecordingStatus, TranscriptionResult } from '../../shared/types';
import {
    getConfig,
    setConfig,
    getHistory,
    addHistoryEntry,
    deleteHistoryEntry,
    clearHistory,
    getModelsPath
} from './config';
import { whisperManager, ensureModelsDirectory } from './whisper';
import { sherpaManager, ensureSherpaModelsDirectory } from './sherpa';
import { hotkeyManager } from './hotkey';
import { showOverlay, hideOverlay, showSettingsWindow, sendToOverlay, sendToAll } from './windows';

export function setupIPCHandlers(): void {
    // ============ Config ============

    ipcMain.handle(IPC_CHANNELS.CONFIG_GET, (): AppConfig => {
        return getConfig();
    });

    ipcMain.handle(IPC_CHANNELS.CONFIG_SET, (_, partialConfig: Partial<AppConfig>): AppConfig => {
        const newConfig = setConfig(partialConfig);
        sendToAll(IPC_CHANNELS.CONFIG_UPDATED, newConfig);
        return newConfig;
    });

    // ============ Hotkey ============

    ipcMain.handle(IPC_CHANNELS.HOTKEY_GET, (): { hotkey: string; mode: 'push-to-talk' | 'toggle' } => {
        return {
            hotkey: hotkeyManager.getCurrentHotkey(),
            mode: hotkeyManager.getMode(),
        };
    });

    ipcMain.handle(IPC_CHANNELS.HOTKEY_SET, (_, hotkey: string): boolean => {
        return hotkeyManager.updateHotkey(hotkey);
    });

    ipcMain.on(IPC_CHANNELS.HOTKEY_REGISTER_START, () => {
        hotkeyManager.startCapturingHotkey();
    });

    ipcMain.on(IPC_CHANNELS.HOTKEY_REGISTER_STOP, () => {
        hotkeyManager.stopCapturingHotkey();
    });

    // ============ Whisper ============

    ipcMain.handle(IPC_CHANNELS.WHISPER_MODELS_LIST, () => {
        ensureModelsDirectory();
        return whisperManager.getInstalledModels();
    });

    ipcMain.handle(IPC_CHANNELS.WHISPER_STATUS, () => {
        return {
            available: whisperManager.isAvailable(),
            modelsPath: getModelsPath(),
        };
    });

    // ============ Sherpa / Parakeet ============

    ipcMain.handle('sherpa:status', () => {
        ensureSherpaModelsDirectory();
        return {
            available: sherpaManager.isAvailable(),
            modelInstalled: sherpaManager.isModelInstalled(),
        };
    });

    // ============ Windows ============

    ipcMain.on(IPC_CHANNELS.WINDOW_OVERLAY_SHOW, () => {
        showOverlay();
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_OVERLAY_HIDE, () => {
        hideOverlay();
    });

    ipcMain.on(IPC_CHANNELS.WINDOW_SETTINGS_SHOW, () => {
        showSettingsWindow();
    });

    // ============ History ============

    ipcMain.handle(IPC_CHANNELS.HISTORY_GET, () => {
        return getHistory();
    });

    ipcMain.on(IPC_CHANNELS.HISTORY_CLEAR, () => {
        clearHistory();
    });

    ipcMain.on(IPC_CHANNELS.HISTORY_ENTRY_DELETE, (_, id: string) => {
        deleteHistoryEntry(id);
    });

    // ============ Clipboard ============

    ipcMain.on(IPC_CHANNELS.CLIPBOARD_COPY, (_, text: string) => {
        clipboard.writeText(text);
    });

    // ============ App Status ============

    ipcMain.handle(IPC_CHANNELS.APP_STATUS, async () => {
        let micPermission: 'granted' | 'denied' | 'prompt' = 'prompt';

        if (process.platform === 'darwin') {
            const status = systemPreferences.getMediaAccessStatus('microphone');
            micPermission = status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'prompt';
        } else {
            // On Windows/Linux, assume granted (will fail at runtime if not)
            micPermission = 'granted';
        }

        return {
            isReady: true,
            whisperAvailable: whisperManager.isAvailable(),
            microphonePermission: micPermission,
            currentHotkey: hotkeyManager.getCurrentHotkey(),
            hotkeyMode: hotkeyManager.getMode(),
        };
    });

    ipcMain.on(IPC_CHANNELS.APP_QUIT, () => {
        const { app } = require('electron');
        app.quit();
    });
}

// ============ Recording Session Handlers ============

export function setupRecordingHandlers(): void {
    // Receive audio chunks from renderer
    ipcMain.on(IPC_CHANNELS.AUDIO_CHUNK, async (_, audioBuffer: ArrayBuffer, tempPath: string) => {
        try {
            const config = getConfig();
            const manager = config.transcriptionEngine === 'parakeet' ? sherpaManager : whisperManager;
            const result = await manager.transcribe(tempPath);
            sendToOverlay(IPC_CHANNELS.TRANSCRIPTION_PARTIAL, result);
        } catch (error) {
            console.error('Transcription error:', error);
            sendToOverlay(IPC_CHANNELS.TRANSCRIPTION_ERROR, (error as Error).message);
        }
    });

    // Receive full audio from renderer for transcription
    ipcMain.on(IPC_CHANNELS.AUDIO_SEND, async (_, audioData: number[]) => {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const { exec } = require('child_process');

        try {
            console.log('Received audio data, size:', audioData.length);

            // Create temp directory
            const tempDir = path.join(os.tmpdir(), 'max-text');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Save WebM audio to temp file
            const webmPath = path.join(tempDir, `audio_${Date.now()}.webm`);
            const wavPath = path.join(tempDir, `audio_${Date.now()}.wav`);

            fs.writeFileSync(webmPath, Buffer.from(audioData));
            console.log('Saved WebM to:', webmPath);

            // Try to use ffmpeg to convert WebM to WAV
            // If ffmpeg is not available, try to use the webm directly
            const ffmpegPath = 'ffmpeg'; // Assumes ffmpeg is in PATH

            const convertCommand = `"${ffmpegPath}" -i "${webmPath}" -ar 16000 -ac 1 -y "${wavPath}"`;

            exec(convertCommand, { timeout: 30000 }, async (error: any) => {
                let audioPath = wavPath;

                if (error) {
                    console.log('FFmpeg not found or conversion failed, trying WebM directly');
                    audioPath = webmPath;
                } else {
                    console.log('Converted to WAV:', wavPath);
                }

                try {
                    // Run transcription with active engine
                    const config = getConfig();
                    const manager = config.transcriptionEngine === 'parakeet' ? sherpaManager : whisperManager;
                    const result = await manager.transcribe(audioPath);
                    console.log('Transcription result:', result.text);

                    // Send result back to overlay and handle output
                    sendToOverlay(IPC_CHANNELS.TRANSCRIPTION_FINAL, result);

                    // Auto-type the result to cursor position
                    if (result.text && result.text.trim()) {
                        const { autoTypeText } = require('./autotype');
                        await autoTypeText(result.text);
                    }

                } catch (transcribeError) {
                    console.error('Whisper transcription error:', transcribeError);
                    sendToOverlay(IPC_CHANNELS.TRANSCRIPTION_ERROR, (transcribeError as Error).message);
                }

                // Cleanup temp files
                try {
                    if (fs.existsSync(webmPath)) fs.unlinkSync(webmPath);
                    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
                } catch (e) { /* ignore cleanup errors */ }
            });

        } catch (error) {
            console.error('Error processing audio:', error);
            sendToOverlay(IPC_CHANNELS.TRANSCRIPTION_ERROR, (error as Error).message);
        }
    });
}
