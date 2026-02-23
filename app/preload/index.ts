// app/preload/index.ts
// Secure IPC bridge for renderer processes

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { AppConfig, TranscriptionResult, RecordingStatus, AudioDevice, HistoryEntry, AppStatus } from '../../shared/types';

// API exposed to renderer via window.api
const api = {
    // ============ Config ============

    getConfig: (): Promise<AppConfig> => {
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_GET);
    },

    setConfig: (config: Partial<AppConfig>): Promise<AppConfig> => {
        return ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SET, config);
    },

    onConfigUpdated: (callback: (config: AppConfig) => void) => {
        const handler = (_: Electron.IpcRendererEvent, config: AppConfig) => callback(config);
        ipcRenderer.on(IPC_CHANNELS.CONFIG_UPDATED, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.CONFIG_UPDATED, handler);
    },

    // ============ Recording ============

    onRecordingStart: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on(IPC_CHANNELS.RECORDING_START, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_START, handler);
    },

    onRecordingStop: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on(IPC_CHANNELS.RECORDING_STOP, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_STOP, handler);
    },

    sendAudioChunk: (buffer: ArrayBuffer, tempPath: string): void => {
        ipcRenderer.send(IPC_CHANNELS.AUDIO_CHUNK, buffer, tempPath);
    },

    sendAudioForTranscription: (audioData: number[]): void => {
        ipcRenderer.send(IPC_CHANNELS.AUDIO_SEND, audioData);
    },

    // ============ Transcription ============

    onTranscriptionPartial: (callback: (result: TranscriptionResult) => void) => {
        const handler = (_: Electron.IpcRendererEvent, result: TranscriptionResult) => callback(result);
        ipcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_PARTIAL, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPTION_PARTIAL, handler);
    },

    onTranscriptionFinal: (callback: (result: TranscriptionResult) => void) => {
        const handler = (_: Electron.IpcRendererEvent, result: TranscriptionResult) => callback(result);
        ipcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_FINAL, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPTION_FINAL, handler);
    },

    onTranscriptionError: (callback: (error: string) => void) => {
        const handler = (_: Electron.IpcRendererEvent, error: string) => callback(error);
        ipcRenderer.on(IPC_CHANNELS.TRANSCRIPTION_ERROR, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.TRANSCRIPTION_ERROR, handler);
    },

    // ============ Hotkey ============

    getHotkey: (): Promise<{ hotkey: string; mode: 'push-to-talk' | 'toggle' }> => {
        return ipcRenderer.invoke(IPC_CHANNELS.HOTKEY_GET);
    },

    setHotkey: (hotkey: string): Promise<boolean> => {
        return ipcRenderer.invoke(IPC_CHANNELS.HOTKEY_SET, hotkey);
    },

    startCapturingHotkey: (): void => {
        ipcRenderer.send(IPC_CHANNELS.HOTKEY_REGISTER_START);
    },

    stopCapturingHotkey: (): void => {
        ipcRenderer.send(IPC_CHANNELS.HOTKEY_REGISTER_STOP);
    },

    onHotkeyCaptured: (callback: (key: string) => void) => {
        const handler = (_: Electron.IpcRendererEvent, key: string) => callback(key);
        ipcRenderer.on(IPC_CHANNELS.HOTKEY_REGISTERED, handler);
        return () => ipcRenderer.removeListener(IPC_CHANNELS.HOTKEY_REGISTERED, handler);
    },

    // ============ Whisper ============

    getWhisperModels: (): Promise<Array<{ name: string; installed: boolean; path: string }>> => {
        return ipcRenderer.invoke(IPC_CHANNELS.WHISPER_MODELS_LIST);
    },

    getWhisperStatus: (): Promise<{ available: boolean; modelsPath: string }> => {
        return ipcRenderer.invoke(IPC_CHANNELS.WHISPER_STATUS);
    },

    getSherpaStatus: (): Promise<{ available: boolean; modelInstalled: boolean }> => {
        return ipcRenderer.invoke('sherpa:status');
    },

    // ============ Windows ============

    showOverlay: (): void => {
        ipcRenderer.send(IPC_CHANNELS.WINDOW_OVERLAY_SHOW);
    },

    hideOverlay: (): void => {
        ipcRenderer.send(IPC_CHANNELS.WINDOW_OVERLAY_HIDE);
    },

    showSettings: (): void => {
        ipcRenderer.send(IPC_CHANNELS.WINDOW_SETTINGS_SHOW);
    },

    // ============ History ============

    getHistory: (): Promise<HistoryEntry[]> => {
        return ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET);
    },

    clearHistory: (): void => {
        ipcRenderer.send(IPC_CHANNELS.HISTORY_CLEAR);
    },

    deleteHistoryEntry: (id: string): void => {
        ipcRenderer.send(IPC_CHANNELS.HISTORY_ENTRY_DELETE, id);
    },

    // ============ Clipboard ============

    copyToClipboard: (text: string): void => {
        ipcRenderer.send(IPC_CHANNELS.CLIPBOARD_COPY, text);
    },

    // ============ App ============

    getAppStatus: (): Promise<AppStatus> => {
        return ipcRenderer.invoke(IPC_CHANNELS.APP_STATUS);
    },

    quit: (): void => {
        ipcRenderer.send(IPC_CHANNELS.APP_QUIT);
    },
};

// Expose API to renderer
contextBridge.exposeInMainWorld('api', api);

// Type declaration for window.api
export type API = typeof api;
