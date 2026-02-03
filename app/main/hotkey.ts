// app/main/hotkey.ts
// Global hotkey management with keydown/keyup detection

import { globalShortcut } from 'electron';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import { getConfig, setConfig } from './config';
import { EventEmitter } from 'events';

// Keycode mapping - uiohook uses raw keycodes
const KEYCODE_MAP: Record<number, string> = {
    // Function keys
    0x3B: 'F1',
    0x3C: 'F2',
    0x3D: 'F3',
    0x3E: 'F4',
    0x3F: 'F5',
    0x40: 'F6',
    0x41: 'F7',
    0x42: 'F8',
    0x43: 'F9',
    0x44: 'F10',
    0x57: 'F11',
    0x58: 'F12',
    // Navigation
    0x52: 'Insert',
    0x47: 'Home',
    0x4F: 'End',
    0x49: 'PageUp',
    0x51: 'PageDown',
    // Numpad
    0x4E: 'NumpadAdd',
    0x4A: 'NumpadSubtract',
    0x37: 'NumpadMultiply',
    0xB5: 'NumpadDivide',
    // Others
    0xC5: 'Pause',
    0x46: 'ScrollLock',
};

class HotkeyManager extends EventEmitter {
    private isListening: boolean = false;
    private currentHotkey: string = 'F1';
    private isKeyDown: boolean = false;
    private hotkeyMode: 'push-to-talk' | 'toggle' = 'push-to-talk';
    private isRecording: boolean = false;
    private isCapturingNewHotkey: boolean = false;

    constructor() {
        super();
        this.setupUIOHook();
    }

    private setupUIOHook(): void {
        uIOhook.on('keydown', (event) => {
            if (this.isCapturingNewHotkey) {
                this.handleNewHotkeyCapture(event.keycode);
                return;
            }

            if (!this.isListening) return;

            const keyName = this.keycodeToName(event.keycode);
            if (keyName === this.currentHotkey && !this.isKeyDown) {
                this.isKeyDown = true;
                this.handleHotkeyDown();
            }
        });

        uIOhook.on('keyup', (event) => {
            if (!this.isListening) return;

            const keyName = this.keycodeToName(event.keycode);
            if (keyName === this.currentHotkey && this.isKeyDown) {
                this.isKeyDown = false;
                this.handleHotkeyUp();
            }
        });
    }

    private handleHotkeyDown(): void {
        if (this.hotkeyMode === 'push-to-talk') {
            this.emit('start');
        } else {
            // Toggle mode
            if (this.isRecording) {
                this.isRecording = false;
                this.emit('stop');
            } else {
                this.isRecording = true;
                this.emit('start');
            }
        }
    }

    private handleHotkeyUp(): void {
        if (this.hotkeyMode === 'push-to-talk') {
            this.emit('stop');
        }
        // Toggle mode doesn't react to keyup
    }

    private handleNewHotkeyCapture(keycode: number): void {
        const keyName = this.keycodeToName(keycode);
        if (keyName) {
            this.emit('hotkey-captured', keyName);
            this.stopCapturingHotkey();
        }
    }

    start(): void {
        const config = getConfig();
        this.currentHotkey = config.hotkey;
        this.hotkeyMode = config.hotkeyMode;
        this.isListening = true;
        this.isKeyDown = false;
        this.isRecording = false;

        try {
            uIOhook.start();
        } catch (error) {
            console.error('Failed to start uIOhook:', error);
            // Fallback to globalShortcut (toggle only)
            this.startFallback();
        }
    }

    stop(): void {
        this.isListening = false;
        this.isKeyDown = false;
        try {
            uIOhook.stop();
        } catch (error) {
            console.error('Failed to stop uIOhook:', error);
        }
        globalShortcut.unregisterAll();
    }

    private startFallback(): void {
        console.log('Using fallback globalShortcut (toggle mode only)');
        this.hotkeyMode = 'toggle';

        const success = globalShortcut.register(this.currentHotkey, () => {
            if (this.isRecording) {
                this.isRecording = false;
                this.emit('stop');
            } else {
                this.isRecording = true;
                this.emit('start');
            }
        });

        if (!success) {
            console.error('Failed to register fallback hotkey:', this.currentHotkey);
            this.emit('error', `Não foi possível registrar a hotkey ${this.currentHotkey}`);
        }
    }

    updateHotkey(newHotkey: string): boolean {
        const wasListening = this.isListening;

        if (wasListening) {
            this.stop();
        }

        this.currentHotkey = newHotkey;
        setConfig({ hotkey: newHotkey });

        if (wasListening) {
            this.start();
        }

        return true;
    }

    updateMode(mode: 'push-to-talk' | 'toggle'): void {
        this.hotkeyMode = mode;
        setConfig({ hotkeyMode: mode });
    }

    startCapturingHotkey(): void {
        this.isCapturingNewHotkey = true;
        this.isListening = false;
    }

    stopCapturingHotkey(): void {
        this.isCapturingNewHotkey = false;
        this.isListening = true;
    }

    getCurrentHotkey(): string {
        return this.currentHotkey;
    }

    getMode(): 'push-to-talk' | 'toggle' {
        return this.hotkeyMode;
    }

    // Utility: Convert uiohook keycode to key name
    private keycodeToName(keycode: number): string | null {
        return KEYCODE_MAP[keycode] || null;
    }
}

export const hotkeyManager = new HotkeyManager();
