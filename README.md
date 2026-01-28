# CancúnMueve PWA 🌴🚍

Tu guía definitiva de transporte público en Cancún. Una Progressive Web App (PWA) diseñada para funcionar **offline-first**, impulsada por un motor de cálculo de rutas en **WebAssembly**.

## 🚀 Características
- **Cálculo de Rutas Offline**: Procesamiento local mediante Rust + WASM.
- **Modo Soleado (Sunny Mode)**: Interfaz de alto contraste optimizada para el sol del Caribe.
- **PWA Real**: Instalable en Android/iOS con soporte offline completo.
- **Datos de la Comunidad**: Información actualizada de rutas R1, R2, R10 y más.

## 🛠️ Stack Tecnológico
- **Frontend**: React 19 + TypeScript + Vite.
- **Estilos**: Tailwind CSS v4.
- **Mapas**: Mapbox GL JS.
- **Motor**: Rust (WASM).
- **Persistencia**: IndexedDB.

## 📦 Estructura del Proyecto
- `/rust-wasm`: Lógica central en Rust.
- `/src`: Aplicación React y componentes.
- `/public/data`: Base de datos de rutas (JSON).

## 📋 Prerrequisitos
- **Node.js**: v18.0.0+ 
- **wasm-pack**: Para compilar los módulos de Rust.
- **Mapbox API Key**: Necesaria para el Mapa Interactivo.

## 🛠️ Desarrollo
1. `npm install`
2. `npm run build:wasm` (requiere wasm-pack)
3. `npm run dev`

---
*Desarrollado con ❤️ para los viajeros de Cancún por el equipo de CancúnMueve.*
