# Max-Text

**Offline Speech-to-Text Desktop App** para Windows e Linux.

Transcreve sua voz para texto usando **Whisper.cpp** ou **NVIDIA Parakeet TDT** (via sherpa-onnx), 100% offline. Suporta Português, Inglês, Francês, Alemão, Italiano e Espanhol.

![Max-Text Screenshot](./docs/screenshot.png)

## ✨ Funcionalidades

- 🎤 **Push-to-Talk** - Segure a hotkey para gravar, solte para transcrever
- 🔒 **100% Offline** - Nenhum dado enviado para a nuvem
- ⚡ **Rápido** - Transcrição em tempo real com Whisper.cpp ou Parakeet TDT
- 🔀 **Dual Engine** - Escolha entre Whisper.cpp e NVIDIA Parakeet TDT 0.6B
- 🚀 **Aceleração GPU** - Suporte a NVIDIA CUDA (6-9x mais rápido)
- 🎛️ **Configurável** - Hotkey, modelo Whisper, microfone
- 🌐 **Multi-idioma** - Português, Inglês, Francês, Alemão, Italiano, Espanhol
- 📋 **Clipboard** - Texto copiado automaticamente

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Whisper.cpp binário **e/ou** sherpa-onnx binário (veja setup abaixo)
- Modelo Whisper (ggml-base.bin recomendado) **e/ou** Parakeet TDT

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/max-text.git
cd max-text

# Instale as dependências
npm install

# Compile o TypeScript e copie os arquivos do renderer
npm run build

# Execute
npm start
```

> **Nota:** `npm run build` compila o TypeScript para `dist/` e copia automaticamente os arquivos do renderer. Em desenvolvimento, use `npm run dev` para hot reload.

### Setup do Whisper

#### Opção 1: Script automático (Windows)

```powershell
# Execute no PowerShell dentro da pasta do projeto
.\resources\bin\whisper\download-whisper.ps1
```

> **Atenção:** O script baixa a versão v1.5.4 do whisper.cpp. Para versões mais recentes (que usam `whisper-cli.exe` em vez de `main.exe`), use a Opção 2.

#### Opção 2: Download manual

1. Baixe o release de https://github.com/ggerganov/whisper.cpp/releases

2. **Copie os arquivos** para `resources/bin/whisper/`:
   ```bash
   # Windows - copie whisper.exe (ou renomeie whisper-cli.exe) e todos os .dll
   copy whisper-cli.exe resources\bin\whisper\whisper.exe
   copy *.dll resources\bin\whisper\

   # Linux
   cp whisper resources/bin/whisper/
   chmod +x resources/bin/whisper/whisper
   ```

3. **Baixe um modelo**:
   ```bash
   # Modelo base (recomendado)
   curl -L -o ~/.config/max-text/models/ggml-base.bin \
     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
   ```

### Setup do Parakeet TDT (Alternativa ao Whisper)

O **NVIDIA Parakeet TDT 0.6B V3** é um motor de transcrição alternativo com excelente qualidade para Português. Usa o [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) como runtime.

1. **Baixe o sherpa-onnx**:
   - Vá para [sherpa-onnx releases](https://github.com/k2-fsa/sherpa-onnx/releases)
   - Windows: `sherpa-onnx-vX.X.X-win-x64-shared-MD-Release.tar.bz2`
   - Linux: `sherpa-onnx-vX.X.X-linux-x64-shared.tar.bz2`

2. **Copie os binários**:
   ```bash
   # Windows - copie sherpa-onnx-offline.exe e todos os .dll
   copy sherpa-onnx-offline.exe resources/bin/sherpa/
   copy *.dll resources/bin/sherpa/

   # Linux - copie o binário e as libs
   cp sherpa-onnx-offline resources/bin/sherpa/
   cp lib/*.so* resources/bin/sherpa/
   chmod +x resources/bin/sherpa/sherpa-onnx-offline
   ```

3. **Baixe o modelo Parakeet TDT** (~640 MB total):
   - Baixe os 4 arquivos de [HuggingFace](https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8):
     - `encoder.int8.onnx` (622 MB)
     - `decoder.int8.onnx` (11 MB)
     - `joiner.int8.onnx` (6 MB)
     - `tokens.txt` (92 KB)
   - Coloque na pasta de modelos:
     - Windows: `%APPDATA%/max-text/models/parakeet-0.6b/`
     - Linux: `~/.config/max-text/models/parakeet-0.6b/`

4. **Selecione o motor** nas Configurações → Transcrição → Parakeet

### GPU Acceleration para Whisper (Opcional)

Se você tem uma **GPU NVIDIA**, pode habilitar aceleração por GPU para Whisper.cpp (6-9x mais rápido).
Nas Configurações → Aceleração, ative **"Usar GPU (CUDA)"**.

> **Nota:** Parakeet TDT 0.6B é leve o suficiente para rodar rápido em CPU. GPU não traz benefício significativo para esse modelo.

#### Requisitos
- GPU NVIDIA com Compute Capability 5.0+ (GTX 900 series ou mais recente)
- [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads) instalado

#### Instalação

1. **Baixe os binários CUDA** do [whisper.cpp releases](https://github.com/ggml-org/whisper.cpp/releases):
   - `whisper-cublas-12.4.0-bin-x64.zip` (recomendado para CUDA 12+)
   - `whisper-cublas-11.8.0-bin-x64.zip` (para CUDA 11.x)

2. **Extraia e copie** para `resources/bin/whisper/`:
   ```powershell
   # Arquivos necessários:
   # whisper-cli.exe → renomear para whisper.exe
   # whisper.dll
   # ggml-cuda.dll
   # ggml-base.dll, ggml-cpu.dll, ggml.dll
   # cublas64_12.dll, cublasLt64_12.dll, cudart64_12.dll
   ```

3. **Verifique** que GPU está funcionando:
   ```powershell
   .\resources\bin\whisper\whisper.exe 2>&1 | Select-String "CUDA"
   # Deve mostrar: "ggml_cuda_init: found 1 CUDA devices"
   ```

#### Compatibilidade de GPU

| GPU Series | Compute Capability | Suporte |
|------------|-------------------|----------|
| RTX 40xx | 8.9 | ✅ Excelente |
| RTX 30xx | 8.6 | ✅ Excelente |
| RTX 20xx | 7.5 | ✅ Muito Bom |
| GTX 16xx | 7.5 | ✅ Muito Bom |
| GTX 10xx | 6.1 | ✅ Bom |
| GTX 9xx | 5.2 | ⚠️ Funciona |

> **Nota:** GPU é opcional. Sem GPU, o app usa CPU automaticamente.

## 📖 Uso

1. **Inicie o app** - Ele aparece na system tray
2. **Configure** - Clique com botão direito no ícone → Configurações
3. **Selecione motor** - Na aba Transcrição, escolha Whisper ou Parakeet
4. **Selecione modelo** - Se usar Whisper, escolha o modelo instalado
5. **Use** - Pressione e segure F1 (padrão) para gravar

### Hotkeys

| Tecla | Ação |
|-------|------|
| F1 (padrão) | Push-to-talk |
| Configurável | Via Settings |

## ⚙️ Configurações

- **Hotkey**: Tecla de atalho (F1-F12, Insert, etc.)
- **Modo**: Push-to-Talk ou Toggle
- **Microfone**: Seleção de dispositivo de entrada
- **Motor de Transcrição**: Whisper ou Parakeet TDT
- **Modelo Whisper**: tiny, base, small, medium, large
- **Idioma**: Português, Inglês, Francês, Alemão, Italiano, Espanhol
- **GPU**: Ativar/desativar aceleração CUDA
- **Saída**: Copiar para clipboard, salvar histórico

## 🏗️ Arquitetura

```
max-text/
├── app/
│   ├── main/        # Electron main process (config, IPC, Whisper, Sherpa)
│   ├── preload/     # IPC bridge
│   └── renderer/    # UI (overlay + settings)
├── core/            # Audio pipeline
├── shared/          # Types and contracts
└── resources/
    ├── bin/
    │   ├── whisper/     # Whisper.cpp binaries + DLLs
    │   ├── sherpa/      # sherpa-onnx binaries + DLLs
    │   └── backup-cpu/  # CPU-only Whisper fallback binaries
    └── models/          # Whisper .bin models (not tracked by git)
```

## 🛠️ Desenvolvimento

```bash
# Modo desenvolvimento (com hot reload)
npm run dev

# Build para produção
npm run dist

# Apenas compilar TypeScript
npm run build

# Lint
npm run lint
```

## 📦 Build

```bash
# Windows
npm run dist -- --win

# Linux
npm run dist -- --linux

# Ambos
npm run dist
```

## 🔧 Troubleshooting

### "Whisper.cpp não encontrado"
- Verifique se o binário está em `resources/bin/whisper/whisper.exe` (Windows) ou `resources/bin/whisper/whisper` (Linux)
- No Windows, certifique-se de que os arquivos `.dll` estão na mesma pasta (`whisper.dll`, `ggml.dll`, etc.)

### "Modelo não encontrado"
- Baixe o modelo de https://huggingface.co/ggerganov/whisper.cpp
- Coloque em `~/.config/max-text/models/` (Linux) ou `%APPDATA%/max-text/models/` (Windows)

### "Hotkey não funciona"
- Verifique se outra aplicação não está usando a mesma hotkey
- Tente uma tecla diferente nas configurações

### "Permissão de microfone negada"
- Verifique as configurações de privacidade do sistema
- Permita acesso ao microfone para o Max-Text

### "sherpa-onnx não encontrado"
- Verifique se o binário está em `resources/bin/sherpa/sherpa-onnx-offline.exe` (Windows) ou `resources/bin/sherpa/sherpa-onnx-offline` (Linux)
- Certifique-se de copiar todos os arquivos `.dll` (Windows) ou `.so` (Linux) junto

### "Modelo Parakeet não encontrado"
- Baixe de https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8
- Coloque em `~/.config/max-text/models/parakeet-0.6b/` (Linux) ou `%APPDATA%/max-text/models/parakeet-0.6b/` (Windows)
- São necessários 4 arquivos: `encoder.int8.onnx`, `decoder.int8.onnx`, `joiner.int8.onnx`, `tokens.txt`

## 📜 Licença

MIT License - veja [LICENSE](LICENSE)

## 🙏 Créditos

- [Whisper](https://github.com/openai/whisper) - OpenAI
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Georgi Gerganov
- [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) - k2-fsa
- [NVIDIA NeMo Parakeet](https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8) - NVIDIA / csukuangfj
- [Electron](https://electronjs.org/)
- [uiohook-napi](https://github.com/phuze/uiohook-napi)
