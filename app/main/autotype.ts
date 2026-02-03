// app/main/autotype.ts
// Auto-type functionality - simulates keyboard to paste text

import { clipboard } from 'electron';
import { exec } from 'child_process';

/**
 * Types text at the current cursor position.
 * Uses clipboard + simulated Ctrl+V via PowerShell.
 */
export async function autoTypeText(text: string): Promise<void> {
    if (!text || !text.trim()) {
        console.log('autoTypeText: empty text, skipping');
        return;
    }

    console.log('autoTypeText: pasting text:', text.substring(0, 50) + '...');

    // Write new text to clipboard
    clipboard.writeText(text);

    // Small delay to ensure clipboard is ready
    await sleep(100);

    // Simulate Ctrl+V using PowerShell
    try {
        await simulateCtrlV();
        console.log('autoTypeText: Ctrl+V simulated successfully');
    } catch (error) {
        console.error('autoTypeText: Ctrl+V failed, text is in clipboard - press Ctrl+V manually');
    }
}

async function simulateCtrlV(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Use PowerShell to send Ctrl+V keypress - single line command
        const command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`;

        exec(command, { timeout: 5000 }, (error) => {
            if (error) {
                console.error('simulateCtrlV error:', error.message);
                reject(error);
            } else {
                resolve();
            }
        });
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
