// app/main/index.ts
// Main process entry point

import { app, BrowserWindow } from 'electron';
import { createTray, destroyTray, setTrayRecording } from './tray';
import { createOverlayWindow, showOverlay, hideOverlay, closeAllWindows } from './windows';
import { hotkeyManager } from './hotkey';
import { setupIPCHandlers, setupRecordingHandlers } from './ipc-handlers';
import { sessionManager } from './session';
import { ensureModelsDirectory } from './whisper';
import { getConfig } from './config';

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Focus settings window if already open
        const { showSettingsWindow } = require('./windows');
        showSettingsWindow();
    });
}

// App lifecycle
app.whenReady().then(() => {
    console.log('Max-Text starting...');

    // Setup
    ensureModelsDirectory();
    setupIPCHandlers();
    setupRecordingHandlers();

    // Create tray
    createTray();

    // Pre-create overlay window (hidden)
    createOverlayWindow();

    // Setup hotkey events
    setupHotkeyEvents();

    // Start listening for hotkeys
    hotkeyManager.start();

    console.log('Max-Text ready. Hotkey:', getConfig().hotkey);
});

function setupHotkeyEvents(): void {
    hotkeyManager.on('start', () => {
        console.log('Recording started');
        setTrayRecording(true);
        showOverlay();
        sessionManager.startSession();

        // Notify overlay to start recording
        const { sendToOverlay } = require('./windows');
        const { IPC_CHANNELS } = require('../../shared/ipc-channels');
        sendToOverlay(IPC_CHANNELS.RECORDING_START);
    });

    hotkeyManager.on('stop', async () => {
        console.log('Recording stopped');

        // Notify overlay to stop recording
        const { sendToOverlay } = require('./windows');
        const { IPC_CHANNELS } = require('../../shared/ipc-channels');
        sendToOverlay(IPC_CHANNELS.RECORDING_STOP);

        // End session and get final text
        const session = await sessionManager.endSession();

        setTrayRecording(false);

        // Hide overlay after a short delay
        setTimeout(() => {
            hideOverlay();
        }, 1500);

        if (session && session.finalText) {
            console.log('Final transcription:', session.finalText);
        }
    });

    hotkeyManager.on('error', (error: string) => {
        console.error('Hotkey error:', error);
        const { dialog } = require('electron');
        dialog.showErrorBox('Erro de Hotkey', error);
    });

    hotkeyManager.on('hotkey-captured', (key: string) => {
        console.log('New hotkey captured:', key);
        const { sendToAll } = require('./windows');
        const { IPC_CHANNELS } = require('../../shared/ipc-channels');
        sendToAll(IPC_CHANNELS.HOTKEY_REGISTERED, key);
    });
}

// Prevent app from quitting when all windows are closed
app.on('window-all-closed', (event: Event) => {
    // Keep app running in tray
    event.preventDefault?.();
});

app.on('before-quit', () => {
    hotkeyManager.stop();
    destroyTray();
    closeAllWindows();
});

// Handle activation (macOS)
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        const { showSettingsWindow } = require('./windows');
        showSettingsWindow();
    }
});
