# MueveCancun: La Verdad de la Calle 🌴🚍

> "MueveCancun no nació en una oficina, nació en la parada del camión."

## 📍 El Problema: Google Maps no entiende a Cancún

En nuestra ciudad, el transporte público es un organismo vivo que cambia más rápido que los algoritmos de las grandes plataformas. Un aviso en Facebook, un bloqueo repentino o una nueva ruta informal son la **"verdad de la calle"** que Google Maps ignora. Por eso, lo que necesitas no es un mapa global; necesitas una herramienta local que entienda el caos y lo ordene para ti.

MueveCancun es simple: **Funciona sin internet**, es ultrarrápida y está diseñada para que cualquier persona, bajo el sol del Caribe, sepa exactamente qué ruta la lleva a su destino.

## ⚙️ La Estructura: El Protocolo Nexus

Detrás de esa simplicidad hay una arquitectura de alto rendimiento dividida en 4 capas esenciales:

### 1. Capa de Infraestructura (Render)
Gestionada por `render.yaml` y `scripts/build_render.sh`. Despliega el sitio estático en la red global de Render.

### 2. Capa de Motor (Rust/WASM)
El corazón del sistema. Ubicado en `rust-wasm/route-calculator`.
- **Lógica**: Algoritmo Dijkstra optimizado para transferencias.
- **Rendimiento**: Calcula miles de rutas en <100ms.
- **Compilación**: Genera binarios WASM que se ejecutan localmente en tu navegador.

### 3. Capa de Inteligencia (Listener)
El cerebro de datos.
- **Actual**: `scripts/sync-routes.mjs` sincroniza `src/data/routes.json` con `public/data/master_routes.json`.
- **Futuro**: `scripts/listener/` (Pendiente) integrará scrapers de redes sociales y tráfico en tiempo real.

### 4. Capa Frontend (Astro)
La interfaz de usuario ultraligera.
- **Framework**: Astro 5 + Vanilla JS.
- **Estilos**: CSS Puro (Sin Frameworks pesados).
- **Mapas**: Leaflet.js + OpenStreetMap.

## 🛠️ Stack Tecnológico

- **Frontend**: Astro + Vanilla JS/TS.
- **Estilos**: Vanilla CSS + Variables CSS5.
- **Motor**: Rust (WASM) + wasm-pack.
- **Persistencia**: IndexedDB + LocalStorage.
- **Gestor de Paquetes**: pnpm (Requerido).

## 👤 Detrás del Proyecto

**Julián Alexander Juárez Alvarado**  
_Full Stack Data Engineer y Analista de Seguridad._

Mi carrera se define por una obsesión: la eficiencia. MueveCancun es mi laboratorio de pruebas donde aplico la experiencia adquirida en entornos de alta demanda para resolver problemas sociales reales.

---

## 📦 Estructura del Proyecto

- `rust-wasm/`: Código fuente del motor en Rust.
- `src/`: Componentes Astro y lógica Frontend.
- `public/data/`: JSONs de rutas (Generados por el Listener).
- `scripts/`: Utilidades de construcción y sincronización.

## 🛠️ Desarrollo

1. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

2. **Compilar Motor WASM**:
   ```bash
   pnpm run build:wasm
   ```

3. **Iniciar Servidor de Desarrollo**:
   ```bash
   pnpm run dev
   ```

---

_Desarrollado con ❤️ para los viajeros de Cancún._
