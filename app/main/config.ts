// app/main/config.ts
// Configuration persistence using electron-store

import Store from 'electron-store';
import { AppConfig, HistoryEntry } from '../../shared/types';
import { DEFAULT_CONFIG, validateConfig } from '../../shared/config-schema';
import { app } from 'electron';
import * as path from 'path';

interface StoreSchema {
    config: AppConfig;
    history: HistoryEntry[];
}

const store = new Store<StoreSchema>({
    name: 'max-text-config',
    defaults: {
        config: {
            ...DEFAULT_CONFIG,
            modelPath: path.join(app.getPath('userData'), 'models'),
        },
        history: [],
    },
});

export function getConfig(): AppConfig {
    const config = store.get('config');
    return validateConfig(config);
}

export function setConfig(partialConfig: Partial<AppConfig>): AppConfig {
    const currentConfig = getConfig();
    const newConfig = validateConfig({ ...currentConfig, ...partialConfig });
    store.set('config', newConfig);
    return newConfig;
}

export function resetConfig(): AppConfig {
    const defaultWithPath = {
        ...DEFAULT_CONFIG,
        modelPath: path.join(app.getPath('userData'), 'models'),
    };
    store.set('config', defaultWithPath);
    return defaultWithPath;
}

// History management
export function getHistory(): HistoryEntry[] {
    return store.get('history', []);
}

export function addHistoryEntry(entry: HistoryEntry): void {
    const history = getHistory();
    history.unshift(entry); // Add to beginning
    // Keep only last 100 entries
    if (history.length > 100) {
        history.length = 100;
    }
    store.set('history', history);
}

export function deleteHistoryEntry(id: string): void {
    const history = getHistory().filter(entry => entry.id !== id);
    store.set('history', history);
}

export function clearHistory(): void {
    store.set('history', []);
}

export function getModelsPath(): string {
    const config = getConfig();
    return config.modelPath || path.join(app.getPath('userData'), 'models');
}

export function getWhisperBinaryPath(): string {
    const binName = process.platform === 'win32' ? 'whisper.exe' : 'whisper';
    const isDev = !app.isPackaged;

    if (isDev) {
        return path.join(app.getAppPath(), 'resources', 'bin', 'whisper', binName);
    } else {
        return path.join(process.resourcesPath, 'bin', 'whisper', binName);
    }
}

export function getSherpaOnnxBinaryPath(): string {
    const binName = process.platform === 'win32' ? 'sherpa-onnx-offline.exe' : 'sherpa-onnx-offline';
    const isDev = !app.isPackaged;

    if (isDev) {
        return path.join(app.getAppPath(), 'resources', 'bin', 'sherpa', binName);
    } else {
        return path.join(process.resourcesPath, 'bin', 'sherpa', binName);
    }
}

export function getSherpaModelsPath(): string {
    return path.join(getModelsPath(), 'parakeet-0.6b');
}
