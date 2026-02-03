// shared/config-schema.ts
// Default configuration and validation

import { AppConfig, WhisperModel } from './types';
import * as path from 'path';

export const DEFAULT_CONFIG: AppConfig = {
    // Hotkey
    hotkey: 'F1',
    hotkeyMode: 'push-to-talk',

    // Audio
    audioDeviceId: null, // null = default device

    // Whisper
    whisperModel: 'base',
    modelPath: '', // Will be set based on app path
    useGpu: true, // Default to GPU if available

    // Output
    copyToClipboard: true,
    saveHistory: false,

    // Future LLM
    llmEnabled: false,
    llmModel: null,
};

export const WHISPER_MODELS: Record<WhisperModel, { size: string; params: string }> = {
    tiny: { size: '75 MB', params: '39M' },
    base: { size: '142 MB', params: '74M' },
    small: { size: '466 MB', params: '244M' },
    medium: { size: '1.5 GB', params: '769M' },
    large: { size: '2.9 GB', params: '1550M' },
};

export const SUPPORTED_HOTKEYS = [
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Insert', 'Home', 'End', 'PageUp', 'PageDown',
    'NumpadAdd', 'NumpadSubtract', 'NumpadMultiply', 'NumpadDivide',
    'Pause', 'ScrollLock',
];

export function validateConfig(config: Partial<AppConfig>): AppConfig {
    return {
        ...DEFAULT_CONFIG,
        ...config,
        // Ensure valid values
        hotkey: config.hotkey && SUPPORTED_HOTKEYS.includes(config.hotkey)
            ? config.hotkey
            : DEFAULT_CONFIG.hotkey,
        hotkeyMode: config.hotkeyMode === 'toggle' ? 'toggle' : 'push-to-talk',
        whisperModel: isValidModel(config.whisperModel)
            ? config.whisperModel
            : DEFAULT_CONFIG.whisperModel,
    };
}

function isValidModel(model: unknown): model is WhisperModel {
    return typeof model === 'string' &&
        ['tiny', 'base', 'small', 'medium', 'large'].includes(model);
}

export const WHISPER_MODEL_URLS: Record<WhisperModel, string> = {
    tiny: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    base: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    small: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    medium: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    large: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin',
};

export const AUDIO_SETTINGS = {
    sampleRate: 16000, // Whisper expects 16kHz
    channelCount: 1,   // Mono
    chunkDuration: 2000, // 2 seconds per chunk
    format: 'audio/webm;codecs=opus',
};
