// shared/types.ts
// Core type definitions for Max-Text

export interface AppConfig {
    // Hotkey settings
    hotkey: string;
    hotkeyMode: 'push-to-talk' | 'toggle';

    // Audio settings
    audioDeviceId: string | null;

    // Whisper settings
    whisperModel: WhisperModel;
    modelPath: string;
    useGpu: boolean; // Use GPU acceleration if available

    // Output settings
    copyToClipboard: boolean;
    saveHistory: boolean;

    // Future LLM settings (placeholder)
    llmEnabled: boolean;
    llmModel: string | null;
}

export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

export interface TranscriptionResult {
    text: string;
    isPartial: boolean;
    timestamp: number;
    chunkIndex: number;
}

export interface TranscriptionSession {
    id: string;
    startTime: number;
    endTime: number | null;
    chunks: TranscriptionResult[];
    finalText: string;
}

export interface RecordingStatus {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    audioLevel: number;
}

export interface AudioDevice {
    deviceId: string;
    label: string;
    isDefault: boolean;
}

export interface WhisperModelInfo {
    name: WhisperModel;
    size: string;
    installed: boolean;
    path: string | null;
}

export interface HotkeyEvent {
    type: 'keydown' | 'keyup';
    key: string;
    timestamp: number;
}

export interface AppStatus {
    isReady: boolean;
    whisperAvailable: boolean;
    microphonePermission: 'granted' | 'denied' | 'prompt';
    currentHotkey: string;
    hotkeyMode: 'push-to-talk' | 'toggle';
}

// History entry for saved transcriptions
export interface HistoryEntry {
    id: string;
    timestamp: number;
    text: string;
    duration: number;
    model: WhisperModel;
}
