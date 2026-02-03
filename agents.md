# agents.md
# Offline Speech-to-Text Desktop App (Electron + Whisper)

## Papel do agente
Você é responsável por implementar um aplicativo desktop **offline**, para **Windows e Linux**, usando **Electron + TypeScript**, com foco em:
- transcrição local em português
- UX simples e rápida (push-to-talk)
- arquitetura extensível para LLM local no futuro

Não use serviços de nuvem.

---

## Objetivo do aplicativo
Criar um app que:
- roda em background (tray)
- usa uma **hotkey global configurável** (default: F1)
- funciona em modo **push-to-talk**:
  - pressionou a hotkey → começa a gravar/transcrever
  - soltou a hotkey → para e finaliza
- mostra um **overlay sempre-on-top** enquanto grava, com:
  - barra de frequência (visualizer de áudio)
  - status da gravação
  - texto sendo transcrito em blocos
- usa **Whisper local (whisper.cpp)** para STT
- funciona **100% offline**
- tem um **frontend de configurações** separado

---

## Stack (fixa)
- Desktop: **Electron**
- Linguagem: **TypeScript**
- STT: **whisper.cpp** (executado como binário local)
- UI: Web (React ou similar no renderer)
- Persistência de config: arquivo local (JSON ou lib equivalente)
- Sem Rust
- Sem Python no app final

---

## Estrutura de pastas (obrigatória)
Use apenas essas pastas principais (detalhes internos ficam a critério do agente):
app/
main/
preload/
renderer/
resources/
core/
shared/


### Responsabilidades
- `app/main`: hotkeys globais, janelas, tray, execução do whisper.cpp, filesystem
- `app/preload`: bridge IPC segura (`window.api`)
- `app/renderer`: UI (overlay + settings)
- `app/resources`: binários (whisper.cpp), ícones, assets
- `core`: pipeline de sessão (áudio → STT → pós-processamento futuro)
- `shared`: tipos, contratos IPC, enums

---

## Hotkey (REQUISITO CRÍTICO)
### Comportamento
- Hotkey **global**
- Default: **F1**
- **Configurável pelo usuário**
- Modo principal: **push-to-talk real**
  - detectar **keydown** (início)
  - detectar **keyup** (fim)

### Implementação
- NÃO usar apenas `globalShortcut` para toggle
- Usar **hook global de teclado** que detecte keydown/keyup
- Se não for possível em algum ambiente:
  - implementar fallback para modo toggle
  - avisar o usuário no UI

---

## Overlay (durante gravação)
### Características
- Janela pequena
- Frameless
- Always-on-top
- Aparece apenas enquanto a hotkey está pressionada

### Conteúdo
- **Barra de frequência (visualizer)**
  - Implementar com Web Audio API
  - `getUserMedia` + `AudioContext` + `AnalyserNode`
  - Desenhar em `<canvas>`
- Indicador de status (gravando / processando)
- Área de texto com transcrição parcial

---

## Transcrição (STT)
### Engine
- **Whisper via whisper.cpp**
- Executar como processo externo
- Forçar idioma: português (`--language pt`)

### Estratégia
- Capturar áudio em **chunks curtos** (1–3s)
- Transcrever por blocos
- Atualizar UI conforme resultados chegam
- Ao soltar a hotkey:
  - finalizar sessão
  - emitir transcrição final

---

## Frontend de Configurações (Settings)
Implementar uma janela separada com as seções:

### 1. Hotkey
- Alterar hotkey global
- Mostrar erro se não puder registrar
- Selecionar modo:
  - Push-to-talk (default)
  - Toggle (fallback)

### 2. Áudio
- Selecionar microfone
- Testar microfone com visualizer
- Mostrar status de permissão

### 3. Whisper
- Selecionar modelo:
  - tiny / base / small / medium / large
- Definir pasta dos modelos
- Mostrar modelos instalados
- (Opcional) botão para baixar modelos

### 4. Saída
- Copiar texto para clipboard ao finalizar
- Salvar histórico (opcional)

### 5. Futuro (placeholder)
- LLM local (desativado)
- Apenas estruturar, não implementar

---

## Permissão de microfone
- Solicitar permissão na primeira gravação
- Se negada:
  - não travar o app
  - mostrar mensagem clara no overlay ou settings
- Permissão deve ser detectável e refletida no UI

---

## Pipeline interno (conceito)

Hotkey ↓
Audio Capture ↓
Chunking ↓
Whisper.cpp ↓
Transcrição parcial ↓
(UI) ↓
Finalização ao soltar tecla


LLM local será **pós-processamento futuro**, não entra no MVP.

---

## Regras importantes
- Renderer NÃO executa whisper.cpp
- Toda chamada ao OS fica no `main`
- Comunicação via IPC tipado
- Priorizar simplicidade e legibilidade
- Código deve ser extensível, não overengineered

---

## Critério de pronto (MVP)
- App abre e roda em tray
- Usuário configura hotkey e modelo
- Pressiona e segura hotkey → overlay aparece + visualizer funciona
- Fala → texto aparece
- Solta hotkey → gravação para e texto final é produzido
- Tudo offline
