# 🏗️ Architecture Manifest — Nexus Transfer Engine v4.0+

<!--
  OBJETO DE ESTUDIO — DECISIONES DE ARQUITECTURA
  ================================================
  Este documento refleja el estado arquitectónico vigente del proyecto MueveCancun tras
  la integración del Nexus Agentic Core (Jules — 2026-04-15).

  REGISTRO DE CAMBIOS ARQUITECTÓNICOS:
  - v4.0.0 (Jules, 2026-04-15): Nexus Agentic Core Integration
      · Inferencia local via Gemini Nano (Prompt API) y WebLLM fallback.
      · Orquestación de herramientas (Tool Calling) hacia el motor Rust/WASM.
      · Aislamiento de ejecución en Web Workers para mantener 60 FPS.
      · Persistencia de memoria conversacional en IndexedDB (agent-memory).

  DECISIONES VIGENTES:
  · "Local-First Intelligence": Prohibido el uso de LLM Cloud APIs (Gemini/OpenAI) en el cliente.
  · "WASM Toolset": El binario Rust actúa como la verdad única para validación de datos.
  · "Privacy by Design": Los datos conversacionales nunca salen del dispositivo del usuario.
-->

## 🤖 Nexus Agentic Core (Sovereign Intelligence)

The project implements a local-first agentic architecture where reasoning and tool execution happen entirely within the client's hardware.

### 1. Hybrid Inference Engine
The agent utilizes a tiered inference strategy to ensure zero-latency and offline availability.
- **Primary (Gemini Nano)**: Utilizes the browser's built-in AI (Prompt API) for maximum efficiency.
- **Fallback (WebLLM)**: High-performance WASM + WebGPU inference using models like Phi-3 or Gemma-2b for browsers without native AI.

### 2. Web Worker Orchestration
All reasoning logic and model communication are isolated in a dedicated Web Worker (`src/lib/agent/agent.worker.ts`). This prevents inference cycles from blocking the Main UI Thread (Map rendering, animations).

### 3. Tool Calling Interface (FFI Bridge)
The agent treats the Rust/WASM routing engine as a set of tools. It parses natural language intent into structured parameters for the WASM Foreign Function Interface (FFI).
- **NexusAgent.ts**: Orchestrates the flow between natural language, tool selection, and WASM execution.
- **tools.ts**: Maps agent intents to `route_calculator.wasm` exports.

### 4. Conversational Persistence
Memory is stored locally using IndexedDB (`agent-memory` store). This ensures that conversation context and user preferences survive page reloads without requiring a cloud-based session manager.

## 🛡️ Type-Safety & Strict Boundaries

The project enforces a strict "Zero Any" policy across the codebase to ensure industrial-grade reliability and maintainability.

### 1. TypeScript ↔ WASM FFI
The boundary between TypeScript and the Rust/WASM calculation engine is strictly typed. No `any` types are permitted in the loader or the communication layer.

### 2. Consolidated Data Types
The system uses consolidated interfaces for complex data structures to prevent knowledge degradation.
- **Journey**: The single source of truth for the Nexus Transfer Engine's output.

### 3. Native Web APIs & Zero-External-Deps
Minimal local interfaces are used for 3rd-party libraries (like Leaflet) to maintain a small bundle size and avoid dependency hell.

## 📁 Core Directory Structure

- `src/lib/agent/`: Reasoning engine, tool definitions, and web worker.
- `src/components/agent/`: Floating UI and conversational interface.
- `src/utils/`: Performance-critical utilities and state managers.
- `rust-wasm/`: High-performance calculation modules written in Rust.
- `public/data/`: Optimized JSON datasets for offline routing.

### 5. Survival Audit & Network Isolation
The Nexus Protocol mandates 100% local sovereignty. No external CDNs or APIs are allowed in the runtime.
