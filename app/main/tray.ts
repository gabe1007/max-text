// app/main/tray.ts
// System tray management

import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
import { showSettingsWindow } from './windows';
import { getConfig } from './config';

let tray: Tray | null = null;

export function createTray(): Tray {
    const iconPath = getTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

    tray = new Tray(icon);
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

    const iconPath = isRecording ? getTrayRecordingIconPath() : getTrayIconPath();
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray.setImage(icon);

    updateTrayMenu(isRecording);
}

function getTrayIconPath(): string {
    const resourcesPath = getResourcesPath();
    return path.join(resourcesPath, 'icons', 'icon.png');
}

function getTrayRecordingIconPath(): string {
    const resourcesPath = getResourcesPath();
    return path.join(resourcesPath, 'icons', 'recording.png');
}

export function getAppIconPath(): string {
    const resourcesPath = getResourcesPath();
    const fs = require('fs');

    if (process.platform === 'win32') {
        const icoPath = path.join(resourcesPath, 'icons', 'icon.ico');
        try {
            fs.accessSync(icoPath);
            return icoPath;
        } catch {
            // fall through to .png
        }
    }

    return path.join(resourcesPath, 'icons', 'icon.png');
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
