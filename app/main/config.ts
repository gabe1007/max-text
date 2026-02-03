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

export function getWhisperBinaryPath(useGpu: boolean = true): string {
    const isDev = !app.isPackaged;
    const baseDir = isDev
        ? path.join(app.getAppPath(), 'resources', 'bin')
        : path.join(process.resourcesPath, 'bin');

    if (process.platform === 'win32') {
        // Try GPU binary first if useGpu is true
        if (useGpu) {
            const gpuPath = path.join(baseDir, 'whisper-cuda.exe');
            const fs = require('fs');
            if (fs.existsSync(gpuPath)) {
                return gpuPath;
            }
            console.log('GPU binary not found, falling back to CPU');
        }
        return path.join(baseDir, 'whisper.exe');
    } else {
        // Linux
        if (useGpu) {
            const gpuPath = path.join(baseDir, 'whisper-cuda');
            const fs = require('fs');
            if (fs.existsSync(gpuPath)) {
                return gpuPath;
            }
            console.log('GPU binary not found, falling back to CPU');
        }
        return path.join(baseDir, 'whisper');
    }
}

// Check if GPU binary is available
export function isGpuAvailable(): boolean {
    const isDev = !app.isPackaged;
    const baseDir = isDev
        ? path.join(app.getAppPath(), 'resources', 'bin')
        : path.join(process.resourcesPath, 'bin');

    const gpuBinaryName = process.platform === 'win32' ? 'whisper-cuda.exe' : 'whisper-cuda';
    const gpuPath = path.join(baseDir, gpuBinaryName);

    const fs = require('fs');
    return fs.existsSync(gpuPath);
}
