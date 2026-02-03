// core/audio-capture.ts
// Audio capture utilities for the renderer process

export interface AudioCaptureConfig {
    deviceId?: string;
    sampleRate: number;
    channelCount: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioCaptureConfig = {
    sampleRate: 16000,
    channelCount: 1,
};

export async function getAudioStream(config: AudioCaptureConfig = DEFAULT_AUDIO_CONFIG): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
        audio: {
            channelCount: config.channelCount,
            sampleRate: config.sampleRate,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(config.deviceId ? { deviceId: { exact: config.deviceId } } : {}),
        },
    };

    return navigator.mediaDevices.getUserMedia(constraints);
}

export async function getAudioDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
}

export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state;
    } catch {
        // Fallback: try to get stream
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return 'granted';
        } catch (error) {
            const err = error as Error;
            if (err.name === 'NotAllowedError') {
                return 'denied';
            }
            return 'prompt';
        }
    }
}

export function createAudioAnalyser(stream: MediaStream): {
    audioContext: AudioContext;
    analyser: AnalyserNode;
    source: MediaStreamAudioSourceNode;
} {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);

    return { audioContext, analyser, source };
}

export function getAudioLevel(analyser: AnalyserNode): number {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average / 255; // Normalize to 0-1
}
