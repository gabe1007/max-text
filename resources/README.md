# Max-Text Resources

This directory contains resources for the Max-Text application.

## Structure

```
resources/
├── icons/           # Application icons
│   ├── icon.svg     # Main icon (source)
│   ├── icon.png     # Linux icon (256x256)
│   ├── icon.ico     # Windows icon
│   ├── recording.svg # Recording state (source)
│   └── recording.png # Recording state icon
├── bin/             # Whisper.cpp binaries
│   ├── whisper.exe  # Windows binary
│   └── whisper      # Linux binary
└── models/          # Whisper models (user-managed)
```

## Icons

The SVG icons are the source files. You need to convert them to PNG/ICO for the build:

```bash
# Using ImageMagick
convert icon.svg -resize 256x256 icon.png
convert icon.svg -resize 256x256 icon.ico

convert recording.svg -resize 256x256 recording.png
```

## Whisper.cpp Setup

1. Download whisper.cpp from: https://github.com/ggerganov/whisper.cpp
2. Build for your platform
3. Copy the binary to `resources/bin/`

### Windows
```bash
# Clone and build
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
cmake -B build
cmake --build build --config Release

# Copy binary
copy build\bin\Release\main.exe ..\max-text\resources\bin\whisper.exe
```

### Linux
```bash
# Clone and build
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# Copy binary
cp main ../max-text/resources/bin/whisper
chmod +x ../max-text/resources/bin/whisper
```

## Whisper Models

Models should be downloaded to the app's user data directory (automatically created):
- Windows: `%APPDATA%/max-text/models/`
- Linux: `~/.config/max-text/models/`

Download models from:
https://huggingface.co/ggerganov/whisper.cpp/tree/main

Recommended models:
- `ggml-base.bin` (142 MB) - Good balance of speed and accuracy
- `ggml-small.bin` (466 MB) - Better accuracy
- `ggml-tiny.bin` (75 MB) - Fastest, lower accuracy
