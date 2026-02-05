# Max-Text

**Offline Speech-to-Text Desktop App** para Windows e Linux.

Transcreve sua voz para texto em português usando Whisper.cpp, 100% offline.

![Max-Text Screenshot](./docs/screenshot.png)

## ✨ Funcionalidades

- 🎤 **Push-to-Talk** - Segure a hotkey para gravar, solte para transcrever
- 🔒 **100% Offline** - Nenhum dado enviado para a nuvem
- ⚡ **Rápido** - Transcrição em tempo real com Whisper.cpp
- 🚀 **Aceleração GPU** - Suporte a NVIDIA CUDA (6-9x mais rápido)
- 🎛️ **Configurável** - Hotkey, modelo Whisper, microfone
- 🌐 **Português** - Otimizado para transcrição em português
- 📋 **Clipboard** - Texto copiado automaticamente

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Whisper.cpp binário
- Modelo Whisper (ggml-base.bin recomendado)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/max-text.git
cd max-text

# Instale as dependências
npm install

# Compile o TypeScript
npm run build

# Execute
npm start
```

### Setup do Whisper

1. **Baixe o whisper.cpp**:
   - Windows: Baixe o release de https://github.com/ggerganov/whisper.cpp/releases
   - Ou compile você mesmo (veja `resources/README.md`)

2. **Copie o binário**:
   ```bash
   # Windows
   copy whisper.exe resources/bin/

   # Linux
   cp whisper resources/bin/
   chmod +x resources/bin/whisper
   ```

3. **Baixe um modelo**:
   ```bash
   # Modelo base (recomendado)
   curl -L -o ~/.config/max-text/models/ggml-base.bin \
     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
   ```

### GPU Acceleration (Opcional)

Se você tem uma **GPU NVIDIA**, pode habilitar aceleração por GPU para transcrições 6-9x mais rápidas.

#### Requisitos
- GPU NVIDIA com Compute Capability 5.0+ (GTX 900 series ou mais recente)
- [CUDA Toolkit](https://developer.nvidia.com/cuda-downloads) instalado

#### Instalação

1. **Baixe os binários CUDA** do [whisper.cpp releases](https://github.com/ggml-org/whisper.cpp/releases):
   - `whisper-cublas-12.4.0-bin-x64.zip` (recomendado para CUDA 12+)
   - `whisper-cublas-11.8.0-bin-x64.zip` (para CUDA 11.x)

2. **Extraia e copie** para `resources/bin/`:
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
   .\resources\bin\whisper.exe 2>&1 | Select-String "CUDA"
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
3. **Selecione modelo** - Na aba Whisper, escolha o modelo instalado
4. **Use** - Pressione e segure F1 (padrão) para gravar

### Hotkeys

| Tecla | Ação |
|-------|------|
| F1 (padrão) | Push-to-talk |
| Configurável | Via Settings |

## ⚙️ Configurações

- **Hotkey**: Tecla de atalho (F1-F12, Insert, etc.)
- **Modo**: Push-to-Talk ou Toggle
- **Microfone**: Seleção de dispositivo de entrada
- **Modelo Whisper**: tiny, base, small, medium, large
- **Saída**: Copiar para clipboard, salvar histórico

## 🏗️ Arquitetura

```
max-text/
├── app/
│   ├── main/        # Electron main process
│   ├── preload/     # IPC bridge
│   └── renderer/    # UI (overlay + settings)
├── core/            # Audio pipeline
├── shared/          # Types and contracts
└── resources/       # Binaries and assets
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
- Verifique se o binário está em `resources/bin/whisper.exe` (Windows) ou `resources/bin/whisper` (Linux)

### "Modelo não encontrado"
- Baixe o modelo de https://huggingface.co/ggerganov/whisper.cpp
- Coloque em `~/.config/max-text/models/` (Linux) ou `%APPDATA%/max-text/models/` (Windows)

### "Hotkey não funciona"
- Verifique se outra aplicação não está usando a mesma hotkey
- Tente uma tecla diferente nas configurações

### "Permissão de microfone negada"
- Verifique as configurações de privacidade do sistema
- Permita acesso ao microfone para o Max-Text

## 📜 Licença

MIT License - veja [LICENSE](LICENSE)

## 🙏 Créditos

- [Whisper](https://github.com/openai/whisper) - OpenAI
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Georgi Gerganov
- [Electron](https://electronjs.org/)
- [uiohook-napi](https://github.com/phuze/uiohook-napi)
