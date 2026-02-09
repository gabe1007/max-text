// app/main/windows.ts
// Window management for overlay and settings

import { BrowserWindow, screen, app } from 'electron';
import * as path from 'path';

let overlayWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

// ============ Overlay Window ============

export function createOverlayWindow(): BrowserWindow {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        return overlayWindow;
    }

    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;

    // Compact overlay size - just for wave visualization
    const overlayWidth = 280;
    const overlayHeight = 56;

    overlayWindow = new BrowserWindow({
        width: overlayWidth,
        height: overlayHeight,
        x: Math.round((screenWidth - overlayWidth) / 2),
        y: screenHeight - overlayHeight - 40,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        focusable: false,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const overlayPath = path.join(__dirname, '..', 'renderer', 'overlay', 'index.html');
    overlayWindow.loadFile(overlayPath);

    overlayWindow.on('closed', () => {
        overlayWindow = null;
    });

    return overlayWindow;
}

export function showOverlay(): void {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
        createOverlayWindow();
    }
    overlayWindow?.show();
}

export function hideOverlay(): void {
    overlayWindow?.hide();
}

export function isOverlayVisible(): boolean {
    return overlayWindow?.isVisible() ?? false;
}

export function getOverlayWindow(): BrowserWindow | null {
    return overlayWindow;
}

// ============ Settings Window ============

export function createSettingsWindow(): BrowserWindow {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus();
        return settingsWindow;
    }

    settingsWindow = new BrowserWindow({
        width: 740,
        height: 560,
        minWidth: 540,
        minHeight: 420,
        title: 'Max-Text',
        show: false,
        icon: path.join(__dirname, '..', '..', '..', 'resources', 'icons', 'icon.png'),
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#1c1c1e',
        vibrancy: 'sidebar',
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload', 'index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    const settingsPath = path.join(__dirname, '..', 'renderer', 'settings', 'index.html');
    settingsWindow.loadFile(settingsPath);

    settingsWindow.once('ready-to-show', () => {
        settingsWindow?.show();
    });

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });

    // Remove menu bar
    settingsWindow.setMenuBarVisibility(false);

    return settingsWindow;
}

export function showSettingsWindow(): void {
    if (!settingsWindow || settingsWindow.isDestroyed()) {
        createSettingsWindow();
    } else {
        settingsWindow.focus();
    }
}

export function hideSettingsWindow(): void {
    settingsWindow?.hide();
}

export function getSettingsWindow(): BrowserWindow | null {
    return settingsWindow;
}

// ============ Utility ============

export function sendToOverlay(channel: string, ...args: unknown[]): void {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send(channel, ...args);
    }
}

export function sendToSettings(channel: string, ...args: unknown[]): void {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.webContents.send(channel, ...args);
    }
}

export function sendToAll(channel: string, ...args: unknown[]): void {
    sendToOverlay(channel, ...args);
    sendToSettings(channel, ...args);
}

export function closeAllWindows(): void {
    overlayWindow?.close();
    settingsWindow?.close();
}
