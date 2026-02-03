// shared/ipc-channels.ts
// IPC channel name constants for type-safe communication

export const IPC_CHANNELS = {
    // Recording controls
    RECORDING_START: 'recording:start',
    RECORDING_STOP: 'recording:stop',
    RECORDING_STATUS: 'recording:status',

    // Transcription
    TRANSCRIPTION_PARTIAL: 'transcription:partial',
    TRANSCRIPTION_FINAL: 'transcription:final',
    TRANSCRIPTION_ERROR: 'transcription:error',

    // Audio
    AUDIO_DEVICES_GET: 'audio:devices:get',
    AUDIO_DEVICES_LIST: 'audio:devices:list',
    AUDIO_LEVEL: 'audio:level',
    AUDIO_PERMISSION_STATUS: 'audio:permission:status',
    AUDIO_CHUNK: 'audio:chunk',
    AUDIO_SEND: 'audio:send',

    // Hotkey
    HOTKEY_PRESSED: 'hotkey:pressed',
    HOTKEY_RELEASED: 'hotkey:released',
    HOTKEY_SET: 'hotkey:set',
    HOTKEY_GET: 'hotkey:get',
    HOTKEY_REGISTER_START: 'hotkey:register:start',
    HOTKEY_REGISTER_STOP: 'hotkey:register:stop',
    HOTKEY_REGISTERED: 'hotkey:registered',

    // Config
    CONFIG_GET: 'config:get',
    CONFIG_SET: 'config:set',
    CONFIG_UPDATED: 'config:updated',

    // Whisper
    WHISPER_MODELS_LIST: 'whisper:models:list',
    WHISPER_MODEL_DOWNLOAD: 'whisper:model:download',
    WHISPER_MODEL_DOWNLOAD_PROGRESS: 'whisper:model:download:progress',
    WHISPER_STATUS: 'whisper:status',

    // Windows
    WINDOW_OVERLAY_SHOW: 'window:overlay:show',
    WINDOW_OVERLAY_HIDE: 'window:overlay:hide',
    WINDOW_SETTINGS_SHOW: 'window:settings:show',
    WINDOW_SETTINGS_HIDE: 'window:settings:hide',

    // App
    APP_STATUS: 'app:status',
    APP_QUIT: 'app:quit',

    // History
    HISTORY_GET: 'history:get',
    HISTORY_CLEAR: 'history:clear',
    HISTORY_ENTRY_DELETE: 'history:entry:delete',

    // Clipboard
    CLIPBOARD_COPY: 'clipboard:copy',
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
