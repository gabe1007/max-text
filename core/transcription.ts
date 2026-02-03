// core/transcription.ts
// Transcription utilities and types

import { TranscriptionResult } from '../shared/types';

export interface TranscriptionSession {
    id: string;
    startTime: number;
    results: TranscriptionResult[];
}

export class TranscriptionManager {
    private currentSession: TranscriptionSession | null = null;

    startSession(): string {
        const id = this.generateSessionId();
        this.currentSession = {
            id,
            startTime: Date.now(),
            results: [],
        };
        return id;
    }

    addResult(result: TranscriptionResult): void {
        if (this.currentSession) {
            this.currentSession.results.push(result);
        }
    }

    getFullText(): string {
        if (!this.currentSession) return '';

        return this.currentSession.results
            .map(r => r.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    getLatestText(): string {
        if (!this.currentSession || this.currentSession.results.length === 0) {
            return '';
        }
        return this.currentSession.results[this.currentSession.results.length - 1].text;
    }

    endSession(): TranscriptionSession | null {
        const session = this.currentSession;
        this.currentSession = null;
        return session;
    }

    isActive(): boolean {
        return this.currentSession !== null;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Text post-processing utilities
export function cleanTranscriptionText(text: string): string {
    return text
        // Remove timestamps
        .replace(/\[\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}\]/g, '')
        // Remove multiple spaces
        .replace(/\s+/g, ' ')
        // Trim
        .trim();
}

export function capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function addPunctuation(text: string): string {
    if (!text) return text;

    // Simple punctuation: add period if missing at end
    const trimmed = text.trim();
    if (!/[.!?]$/.test(trimmed)) {
        return trimmed + '.';
    }
    return trimmed;
}

// Merge overlapping transcription results
export function mergeResults(results: TranscriptionResult[]): string {
    if (results.length === 0) return '';
    if (results.length === 1) return results[0].text;

    // Simple concatenation with space
    return results
        .map(r => r.text.trim())
        .filter(t => t.length > 0)
        .join(' ');
}
