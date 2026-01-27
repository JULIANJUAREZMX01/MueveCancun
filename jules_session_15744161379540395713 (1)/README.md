# 🌴 CancúnMueve
### La Guía Definitiva de Transporte Público para Cancún (Offline-First)

![CancúnMueve Logo](public/logo.png)

**CancúnMueve** es una Progressive Web App (PWA) de alto rendimiento diseñada para resolver el caos del transporte público en Cancún. Utilizando **Rust + WebAssembly**, la aplicación calcula rutas de forma instantánea y totalmente offline, garantizando que tanto turistas como locales puedan navegar la ciudad sin depender de una conexión a internet costosa o inestable.

---

## 🚀 Características Principales

- **📦 Procesamiento Local (WASM)**: Motor de búsqueda de rutas escrito en Rust para una velocidad incomparable.
- **📡 Offline-First**: Mapas y rutas accesibles sin conexión gracias a Service Workers e IndexedDB.
- **☀️ Interfaz Sunny-Mode**: Diseño de alto contraste optimizado para la legibilidad bajo el sol intenso del Caribe.
- **📍 Datos Curados**: Información real de rutas críticas (R1, R2, R10) con paradas exactas y tarifas actualizadas (2025-2026).
- **💡 Crowdsourced**: Sistema integrado para que la comunidad reporte cambios en las rutas en tiempo real.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 / TypeScript / Tailwind CSS v4
- **Core Engine**: Rust (WASM) con `wasm-pack`
- **Mapas**: Mapbox GL JS
- **Almacenamiento**: IndexedDB (vía `idb`)
- **PWA**: Workbox / Manifest.json

---

## 🏗️ Arquitectura Técnica

La aplicación utiliza una arquitectura híbrida:
1. **Capa de Datos**: `src/data/master_routes.json` actúa como la base de conocimiento estática.
2. **Motor WASM**: El código en `rust-wasm/` procesa los grafos de las rutas para encontrar el camino más corto entre paradas.
3. **Capa de UI**: Componentes React altamente reactivos que consumen el binario WASM para visualización inmediata en el mapa.

---

## 🛠️ Instalación y Desarrollo

1. **Clonar el repositorio**:
   ```bash
   git clone [repo-url]
   cd cancunmueve
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` basado en `.env.example` y añade tu `VITE_MAPBOX_TOKEN`.

4. **Compilar WASM**:
   ```bash
   cd rust-wasm
   wasm-pack build --target web
   ```

5. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

---

## ⚖️ Tarifas 2026
- **Zona Urbana**: $13.00 MXN
- **Zona Hotelera**: $15.00 MXN

---

## 📄 Licencia
Este proyecto es una iniciativa de **CancúnMueve Team**.

---
*Desarrollado con ❤️ para los viajeros de Cancún.*
