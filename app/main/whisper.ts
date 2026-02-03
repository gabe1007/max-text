// app/main/whisper.ts
// Whisper.cpp execution and management

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { getConfig, getModelsPath, getWhisperBinaryPath } from './config';
import { WhisperModel, TranscriptionResult } from '../../shared/types';

class WhisperManager extends EventEmitter {
    private process: ChildProcess | null = null;
    private isProcessing: boolean = false;
    private chunkIndex: number = 0;

    constructor() {
        super();
    }

    async transcribe(audioPath: string): Promise<TranscriptionResult> {
        return new Promise((resolve, reject) => {
            const config = getConfig();
            const whisperPath = getWhisperBinaryPath(config.useGpu);
            const modelPath = this.getModelFilePath(config.whisperModel);

            // Check if whisper binary exists
            if (!fs.existsSync(whisperPath)) {
                reject(new Error(`Whisper binary not found: ${whisperPath}`));
                return;
            }

            // Check if model exists
            if (!fs.existsSync(modelPath)) {
                reject(new Error(`Model not found: ${modelPath}. Please download the ${config.whisperModel} model.`));
                return;
            }

            this.isProcessing = true;
            const startTime = Date.now();

            console.log('Whisper transcribing:', audioPath);
            console.log('Using model:', modelPath);

            const args = [
                '-m', modelPath,
                '-f', audioPath,
                '-l', 'pt',       // Portuguese
                '-nt',            // No timestamps
                '-otxt',          // Output as text
            ];

            console.log('Whisper args:', args.join(' '));

            let output = '';
            let errorOutput = '';

            this.process = spawn(whisperPath, args);

            this.process.stdout?.on('data', (data) => {
                const text = data.toString();
                console.log('Whisper stdout:', text);
                output += text;
            });

            this.process.stderr?.on('data', (data) => {
                const text = data.toString();
                // Only log non-progress stderr (errors)
                if (!text.includes('whisper_') && !text.includes('%')) {
                    console.log('Whisper stderr:', text);
                }
                errorOutput += text;
            });

            this.process.on('close', (code) => {
                this.isProcessing = false;
                this.process = null;

                if (code === 0) {
                    const text = this.cleanOutput(output);
                    const result: TranscriptionResult = {
                        text,
                        isPartial: false,
                        timestamp: startTime,
                        chunkIndex: this.chunkIndex++,
                    };
                    resolve(result);
                } else {
                    reject(new Error(`Whisper exited with code ${code}: ${errorOutput}`));
                }
            });

            this.process.on('error', (error) => {
                this.isProcessing = false;
                this.process = null;
                reject(error);
            });
        });
    }

    async transcribeStream(audioPath: string, onPartial: (text: string) => void): Promise<string> {
        const config = getConfig();
        const whisperPath = getWhisperBinaryPath();
        const modelPath = this.getModelFilePath(config.whisperModel);

        return new Promise((resolve, reject) => {
            if (!fs.existsSync(whisperPath)) {
                reject(new Error(`Whisper binary not found: ${whisperPath}`));
                return;
            }

            if (!fs.existsSync(modelPath)) {
                reject(new Error(`Model not found: ${modelPath}`));
                return;
            }

            this.isProcessing = true;

            const args = [
                '-m', modelPath,
                '-f', audioPath,
                '-l', 'pt',
                '-nt',
            ];

            let fullOutput = '';

            this.process = spawn(whisperPath, args);

            this.process.stdout?.on('data', (data) => {
                const text = data.toString().trim();
                if (text) {
                    fullOutput += text + ' ';
                    onPartial(this.cleanOutput(fullOutput));
                }
            });

            this.process.on('close', (code) => {
                this.isProcessing = false;
                this.process = null;

                if (code === 0) {
                    resolve(this.cleanOutput(fullOutput));
                } else {
                    reject(new Error(`Whisper process failed with code ${code}`));
                }
            });

            this.process.on('error', (error) => {
                this.isProcessing = false;
                reject(error);
            });
        });
    }

    abort(): void {
        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = null;
            this.isProcessing = false;
        }
    }

    resetSession(): void {
        this.chunkIndex = 0;
    }

    isAvailable(): boolean {
        const whisperPath = getWhisperBinaryPath();
        return fs.existsSync(whisperPath);
    }

    getInstalledModels(): { name: WhisperModel; installed: boolean; path: string }[] {
        const modelsPath = getModelsPath();
        const models: WhisperModel[] = ['tiny', 'base', 'small', 'medium', 'large'];

        return models.map(name => {
            const modelFilePath = this.getModelFilePath(name);
            return {
                name,
                installed: fs.existsSync(modelFilePath),
                path: modelFilePath,
            };
        });
    }

    private getModelFilePath(model: WhisperModel): string {
        const modelsPath = getModelsPath();

        // Try exact match first
        const exactPath = path.join(modelsPath, `ggml-${model}.bin`);
        if (fs.existsSync(exactPath)) {
            return exactPath;
        }

        // Try common variants (v2, v3, quantized versions)
        const variants = [
            `ggml-${model}.bin`,
            `ggml-${model}-v3.bin`,
            `ggml-${model}-v2.bin`,
            `ggml-${model}-q8_0.bin`,
            `ggml-${model}-q5_0.bin`,
            `ggml-${model}-q4_0.bin`,
        ];

        for (const variant of variants) {
            const variantPath = path.join(modelsPath, variant);
            if (fs.existsSync(variantPath)) {
                return variantPath;
            }
        }

        // Search for any file matching the model name pattern
        try {
            const files = fs.readdirSync(modelsPath);
            const matchingFile = files.find(f =>
                f.startsWith(`ggml-${model}`) && f.endsWith('.bin')
            );
            if (matchingFile) {
                return path.join(modelsPath, matchingFile);
            }
        } catch (e) {
            // Directory might not exist yet
        }

        // Return default path (will fail with helpful error message)
        return exactPath;
    }

    private cleanOutput(text: string): string {
        return text
            .replace(/\[.*?\]/g, '')  // Remove timestamps like [00:00:00.000 --> 00:00:02.000]
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim();
    }
}

export const whisperManager = new WhisperManager();

// Utility: Ensure models directory exists
export function ensureModelsDirectory(): void {
    const modelsPath = getModelsPath();
    if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath, { recursive: true });
    }
}
