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

## GPU Acceleration (NVIDIA CUDA)

GPU acceleration provides **6-9x faster transcription** compared to CPU-only mode.

### Requirements

- **NVIDIA GPU** with Compute Capability 5.0 or higher
- **CUDA Toolkit** installed ([download here](https://developer.nvidia.com/cuda-downloads))

### GPU Compatibility Table

| GPU Series | Compute Capability | Performance |
|------------|-------------------|-------------|
| RTX 50xx | 10.0 | ✅ Excellent |
| RTX 40xx | 8.9 | ✅ Excellent |
| RTX 30xx | 8.6 | ✅ Excellent |
| RTX 20xx | 7.5 | ✅ Very Good |
| GTX 16xx | 7.5 | ✅ Very Good |
| GTX 10xx | 6.1 | ✅ Good |
| GTX 9xx | 5.2 | ⚠️ Basic |
| Older | < 5.0 | ❌ Not supported |

### Installing GPU Binaries

1. **Download** the appropriate CUDA binary from [whisper.cpp releases](https://github.com/ggml-org/whisper.cpp/releases):
   - **CUDA 12+**: `whisper-cublas-12.4.0-bin-x64.zip` (recommended)
   - **CUDA 11.x**: `whisper-cublas-11.8.0-bin-x64.zip`

2. **Extract** the zip file

3. **Copy** these files to `resources/bin/`:
   ```
   whisper-cli.exe  → rename to whisper.exe
   whisper.dll
   ggml-cuda.dll
   ggml-base.dll
   ggml-cpu.dll
   ggml.dll
   cublas64_12.dll
   cublasLt64_12.dll
   cudart64_12.dll
   ```

4. **Verify** GPU is detected:
   ```powershell
   .\resources\bin\whisper.exe 2>&1 | Select-String "CUDA"
   # Expected output: "ggml_cuda_init: found 1 CUDA devices"
   ```

### Expected Performance

| Model | CPU Time | GPU Time | Speedup |
|-------|----------|----------|---------|
| tiny | ~3s | ~0.5s | 6x |
| base | ~6s | ~1s | 6x |
| small | ~15s | ~2s | 7x |
| medium | ~40s | ~5s | 8x |
| large | ~90s | ~10s | 9x |

*Times are approximate for 10 seconds of audio*

### Troubleshooting

**"ggml_cuda_init: no CUDA devices found"**
- Ensure NVIDIA drivers are installed
- Verify CUDA Toolkit is installed: `nvcc --version`
- Check GPU is detected: `nvidia-smi`

**"cublas64_12.dll not found"**
- Make sure all required DLLs are copied to `resources/bin/`
- Use the CUDA version matching your installed CUDA Toolkit

**GPU not being used (slow transcription)**
- Check whisper.exe output for CUDA initialization messages
- Ensure you're using the CUDA binary, not the CPU-only one
