// app/main/sherpa.ts
// Sherpa-onnx (Parakeet TDT) execution and management

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import { getConfig, getSherpaModelsPath, getSherpaOnnxBinaryPath } from './config';
import { TranscriptionResult } from '../../shared/types';

class SherpaManager extends EventEmitter {
    private process: ChildProcess | null = null;
    private isProcessing: boolean = false;
    private chunkIndex: number = 0;

    constructor() {
        super();
    }

    async transcribe(audioPath: string): Promise<TranscriptionResult> {
        const config = getConfig();
        const sherpaPath = getSherpaOnnxBinaryPath();
        const modelsDir = getSherpaModelsPath();

        // Model files
        const encoderPath = path.join(modelsDir, 'encoder.int8.onnx');
        const decoderPath = path.join(modelsDir, 'decoder.int8.onnx');
        const joinerPath = path.join(modelsDir, 'joiner.int8.onnx');
        const tokensPath = path.join(modelsDir, 'tokens.txt');

        // Check if sherpa binary exists
        if (!fs.existsSync(sherpaPath)) {
            throw new Error(`Sherpa-onnx binary not found: ${sherpaPath}`);
        }

        // Check model files
        for (const [name, filePath] of Object.entries({
            'encoder': encoderPath,
            'decoder': decoderPath,
            'joiner': joinerPath,
            'tokens': tokensPath,
        })) {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Parakeet model file not found: ${name} (${filePath}). Please download the Parakeet TDT model.`);
            }
        }

        this.isProcessing = true;
        const startTime = Date.now();

        console.log('Sherpa-onnx transcribing:', audioPath);
        console.log('Using model dir:', modelsDir);

        // Add sherpa dir and parent bin dir (for CUDA DLLs) to PATH
        const sherpaDir = path.dirname(sherpaPath);
        const parentBinDir = path.dirname(sherpaDir);
        const env = {
            ...process.env,
            PATH: `${sherpaDir};${parentBinDir};${process.env.PATH || ''}`,
        };

        const baseArgs = [
            `--encoder=${encoderPath}`,
            `--decoder=${decoderPath}`,
            `--joiner=${joinerPath}`,
            `--tokens=${tokensPath}`,
            '--model-type=nemo_transducer',
            '--debug=true',
        ];

        // Use GPU if enabled, always keep CPU as fallback
        const providers = config.useGpu ? ['cuda', 'cpu'] : ['cpu'];
        let lastError: Error | null = null;

        for (const provider of providers) {
            const args = [...baseArgs, `--provider=${provider}`, audioPath];
            console.log(`Sherpa args (provider=${provider}):`, args.join(' '));

            try {
                const text = await this.runSherpa(sherpaPath, args, env, startTime);
                return {
                    text,
                    isPartial: false,
                    timestamp: startTime,
                    chunkIndex: this.chunkIndex++,
                };
            } catch (err: any) {
                console.warn(`Sherpa failed with provider=${provider}:`, err.message);
                lastError = err;
                // Only retry with cpu if cuda crashed (non-zero exit)
                if (provider === 'cpu') break;
                console.log('Falling back to CPU provider...');
            }
        }

        this.isProcessing = false;
        throw lastError ?? new Error('Sherpa-onnx transcription failed');
    }

    private runSherpa(
        sherpaPath: string,
        args: string[],
        env: NodeJS.ProcessEnv,
        startTime: number,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            let output = '';
            let errorOutput = '';

            this.process = spawn(sherpaPath, args, { env });

            this.process.stdout?.on('data', (data) => {
                const text = data.toString();
                console.log('Sherpa stdout:', text);
                output += text;
            });

            this.process.stderr?.on('data', (data) => {
                const text = data.toString();
                if (!text.includes('progress') && !text.includes('%')) {
                    console.log('Sherpa stderr:', text);
                }
                errorOutput += text;
            });

            this.process.on('close', (code) => {
                this.process = null;
                if (code === 0) {
                    // nemo_transducer outputs JSON to stderr; fall back to it if stdout is empty
                    resolve(this.cleanOutput(output, errorOutput));
                } else {
                    reject(new Error(`Sherpa-onnx exited with code ${code}: ${errorOutput}`));
                }
            });

            this.process.on('error', (error) => {
                this.process = null;
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
        const sherpaPath = getSherpaOnnxBinaryPath();
        return fs.existsSync(sherpaPath);
    }

    isModelInstalled(): boolean {
        const modelsDir = getSherpaModelsPath();
        const requiredFiles = ['encoder.int8.onnx', 'decoder.int8.onnx', 'joiner.int8.onnx', 'tokens.txt'];
        return requiredFiles.every(f => fs.existsSync(path.join(modelsDir, f)));
    }

    private cleanOutput(stdout: string, stderr: string = ''): string {
        // nemo_transducer writes the JSON result to stderr, not stdout
        // Scan both buffers for a JSON line containing a "text" field
        for (const raw of [stdout, stderr]) {
            for (const line of raw.split('\n')) {
                const trimmed = line.trim();
                if (trimmed.startsWith('{')) {
                    try {
                        const json = JSON.parse(trimmed);
                        if (typeof json.text === 'string' && json.text.trim()) {
                            return json.text.trim();
                        }
                    } catch {
                        // not valid JSON, continue
                    }
                }
            }
        }

        // Fallback: plain-text output (old transducer models) from stdout
        const lines = stdout.split('\n');
        const transcriptionLines = lines.filter(line => {
            const trimmed = line.trim();
            if (!trimmed) return false;
            if (trimmed.startsWith('/')) return false;
            if (trimmed.startsWith('Duration')) return false;
            if (trimmed.startsWith('Wave')) return false;
            if (trimmed.startsWith('num_') || trimmed.startsWith('decoding')) return false;
            if (trimmed.startsWith('Elapsed')) return false;
            if (trimmed.startsWith('Real time')) return false;
            return true;
        });

        return transcriptionLines.join(' ').replace(/\s+/g, ' ').trim();
    }
}

export const sherpaManager = new SherpaManager();

// Utility: Ensure Parakeet models directory exists
export function ensureSherpaModelsDirectory(): void {
    const modelsPath = getSherpaModelsPath();
    if (!fs.existsSync(modelsPath)) {
        fs.mkdirSync(modelsPath, { recursive: true });
    }
}
