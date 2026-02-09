// app/main/tray.ts
// System tray management

import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import { showSettingsWindow } from './windows';
import { getConfig } from './config';

let tray: Tray | null = null;

export function createTray(): Tray {
    const iconPath = getIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip('Max-Text - Speech to Text');

    updateTrayMenu();

    tray.on('double-click', () => {
        showSettingsWindow();
    });

    return tray;
}

export function updateTrayMenu(isRecording: boolean = false): void {
    if (!tray) return;

    const config = getConfig();

    const contextMenu = Menu.buildFromTemplate([
        {
            label: isRecording ? '🔴 Gravando...' : '⚪ Pronto',
            enabled: false,
        },
        { type: 'separator' },
        {
            label: `Hotkey: ${config.hotkey}`,
            enabled: false,
        },
        {
            label: `Modo: ${config.hotkeyMode === 'push-to-talk' ? 'Push-to-Talk' : 'Toggle'}`,
            enabled: false,
        },
        { type: 'separator' },
        {
            label: 'Configurações',
            click: () => showSettingsWindow(),
        },
        { type: 'separator' },
        {
            label: 'Sair',
            click: () => {
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
}

export function setTrayRecording(isRecording: boolean): void {
    if (!tray) return;

    const iconPath = isRecording ? getRecordingIconPath() : getIconPath();
    const icon = nativeImage.createFromPath(iconPath);
    tray.setImage(icon.resize({ width: 16, height: 16 }));

    updateTrayMenu(isRecording);
}

function getIconPath(): string {
    const resourcesPath = getResourcesPath();
    const fs = require('fs');

    // Prefer .ico on Windows if available, otherwise fall back to .png
    if (process.platform === 'win32') {
        const icoPath = path.join(resourcesPath, 'icons', 'icon.ico');
        try {
            fs.accessSync(icoPath);
            return icoPath;
        } catch {
            // .ico not found, fall through to .png
        }
    }

    return path.join(resourcesPath, 'icons', 'icon.png');
}

function getRecordingIconPath(): string {
    const resourcesPath = getResourcesPath();
    const fs = require('fs');

    // Try .ico first on Windows, then .png
    const candidates = process.platform === 'win32'
        ? ['recording.ico', 'recording.png']
        : ['recording.png'];

    for (const name of candidates) {
        const candidate = path.join(resourcesPath, 'icons', name);
        try {
            fs.accessSync(candidate);
            return candidate;
        } catch {
            // try next
        }
    }

    // Fallback to regular icon
    return getIconPath();
}

function getResourcesPath(): string {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'resources');
    }
    return path.join(__dirname, '..', '..', '..', 'resources');
}

export function destroyTray(): void {
    if (tray) {
        tray.destroy();
        tray = null;
    }
}
