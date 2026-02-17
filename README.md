# 🏛️ MueveCancun: La Verdad de la Calle (Nexus Prime v3.2)

> "MueveCancun no nació en una oficina, nació en la parada del camión."

## 📍 El Problema: Google Maps no entiende a Cancún

En nuestra ciudad, el transporte público es un organismo vivo que cambia más rápido que los algoritmos de las grandes plataformas. Un aviso en Facebook, un bloqueo repentino o una nueva ruta informal son la **"verdad de la calle"** que Google Maps ignora.

MueveCancun es simple: **Funciona sin internet**, es ultrarrápida y está diseñada para que cualquier persona sepa exactamente qué ruta la lleva a su destino.

---

## ⚙️ La Estructura: El Protocolo Nexus (4 Capas)

Esta arquitectura de alto rendimiento está dividida en 4 sistemas secuenciales:

### 1. 🏗️ Sistema 1: Infraestructura (Render / Astro SSG)
- **Deployment**: `render.yaml` gestiona el despliegue como **Sitio Estático**.
- **Build**: `scripts/build_render.sh` instala Rust, compila WASM y genera el sitio en `dist/`.
- **Config**: `astro.config.mjs` asegura salida estática (`output: 'static'`).

### 2. 🧠 Sistema 2: Inteligencia Social (Python Listener)
- **Ubicación**: `scripts/listener/listener.py`
- **Función**: Inyecta "Señales Sociales" (alertas de tráfico, bloqueos) en el catálogo base.
- **Output**: Genera `public/data/master_routes.json` con estructura validada para el motor.
- **Dependencias**: `scripts/listener/requirements.txt` (Python 3.12+).

### 3. ⚙️ Sistema 3: Motor Resiliente (Rust / WASM)
- **Core**: `rust-wasm/route-calculator/src/lib.rs`
- **Compilación**: `scripts/build-wasm.mjs` (Idempotente: limpia y recompila).
- **Ruta Crítica**: El binario WASM se sirve desde `/wasm/route-calculator/route_calculator.js`.
- **Seguridad**: Hardening contra DoS (Circuit Breaker de 2M ops).

### 4. 📱 Sistema 4: Frontend Graffiti (Astro / Vanilla CSS)
- **UI**: Componentes `.astro` sin framework JS pesado.
- **Estilos**: `src/styles/global.css` y `src/index.css` (CSS Variables + Grid).
- **Móvil**: Optimizado para visibilidad en Dark/Light mode y navegación inferior fija.

---

## 🛠️ Troubleshooting & Interconexión

Si el sistema falla, sigue esta guía de diagnóstico por capas:

### 🔴 Error: "No Routes Found" o Motor Congelado
1. **Verificar WASM**: Revisa que `public/wasm/route-calculator/route_calculator_bg.wasm` exista y tenga tamaño >0.
2. **Path Audit**: Confirma que `RouteCalculator.astro` importa desde `/wasm/...`.
3. **Recompilar**: Ejecuta `node scripts/build-wasm.mjs`.

### 🟡 Error: "About" invisible en Móvil
1. **CSS Audit**: Revisa `src/pages/about.astro`. El texto debe tener clases compatibles con Dark Mode (ej. `dark:text-slate-100`).
2. **Z-Index**: La barra de navegación (`z-50`) no debe cubrir el contenido (`pb-24` en `MainLayout`).

### 🔵 Error: Datos Desactualizados
1. **Listener**: Ejecuta `python3 scripts/listener/listener.py`.
2. **Schema Check**: Verifica que `public/data/master_routes.json` tenga las claves `routes` y `social_alerts`.

---

## 📦 Comandos de Desarrollo

1. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

2. **Generar Datos Maestros (Listener)**:
   ```bash
   python3 scripts/listener/listener.py
   ```

3. **Compilar Motor WASM**:
   ```bash
   node scripts/build-wasm.mjs
   ```

4. **Iniciar Servidor Local**:
   ```bash
   pnpm run dev
   ```

---

## 👤 Créditos

**Julián Alexander Juárez Alvarado**
_Lead Architect & Full Stack Data Engineer_

> "La eficiencia no es un lujo técnico, es un imperativo moral."
