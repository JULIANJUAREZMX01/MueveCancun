# CancúnMueve PWA 🌴🚍

Tu guía definitiva de transporte público en Cancún. Una Progressive Web App (PWA) diseñada para funcionar **offline-first**, impulsada por un motor de cálculo de rutas en **WebAssembly**.

## 🚀 Características

- **Cálculo de Rutas Offline**: Procesamiento local mediante Rust + WASM.
- **Modo Soleado (Sunny Mode)**: Interfaz de alto contraste optimizada para el sol del Caribe.
- **PWA Real**: Instalable en Android/iOS con soporte offline completo.
- **Datos de la Comunidad**: Información actualizada de rutas R1, R2, R10 y más.

## 🛠️ Stack Tecnológico

- **Frontend**: Astro + Vanilla JS/TS.
- **Estilos**: Vanilla CSS + Tailwind CSS (Utility).
- **Mapas**: Leaflet.js.
- **Motor**: Rust (WASM).
- **Persistencia**: IndexedDB.

## 📦 Estructura del Proyecto

- `/rust-wasm`: Lógica central en Rust.
- `/src`: ASTRO / Ccomponentes.
- `/public/data`: Base de datos de rutas (JSON).

## 🛠️ Desarrollo

1. `npm install`
2. `npm run build:wasm` (requiere wasm-pack)
3. `npm run dev`

---

_Desarrollado con ❤️ para los viajeros de Cancún por el equipo de CancúnMueve._
