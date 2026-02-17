# MueveCancun: La Verdad de la Calle 🌴🚍

> "MueveCancun no nació en una oficina, nació en la parada del camión."

## 📍 El Problema: Google Maps no entiende a Cancún

En nuestra ciudad, el transporte público es un organismo vivo que cambia más rápido que los algoritmos de las grandes plataformas. Un aviso en Facebook, un bloqueo repentino o una nueva ruta informal son la **"verdad de la calle"** que Google Maps ignora. Por eso, lo que necesitas no es un mapa global; necesitas una herramienta local que entienda el caos y lo ordene para ti.

MueveCancun es simple: **Funciona sin internet**, es ultrarrápida y está diseñada para que cualquier persona, bajo el sol del Caribe, sepa exactamente qué ruta la lleva a su destino.

## ⚙️ La Estructura: El Protocolo Nexus

Detrás de esa simplicidad hay una arquitectura de alto rendimiento que construimos rompiendo las reglas convencionales del desarrollo web. A este sistema lo llamamos **Nexus**.

### 1. Rendimiento Nativo en la Web (WASM + Rust)

Mientras otras aplicaciones dependen de pesados marcos de JavaScript que agotan tu batería, MueveCancun utiliza un motor de cálculo escrito en **Rust** y compilado en **WebAssembly**. Esto permite que tu propio teléfono calcule miles de trayectos en milisegundos a velocidad de software de escritorio, directamente en el navegador.

### 2. Supervivencia Extrema (Offline-First)

La aplicación es una **PWA (Progressive Web App)** diseñada para ser resiliente. Una vez instalada, no necesitas señal para buscar tu ruta. El mapa y el motor de búsqueda viven en tu dispositivo.

### 3. Desacoplamiento de Datos (Hot-Swap)

Hemos separado el "cerebro" de los "datos". Esto nos permite actualizar rutas, precios y paradas en tiempo real mediante JSONs dinámicos, garantizando que la información sea siempre fresca sin que tengas que descargar una actualización de la tienda de aplicaciones.

### 4. El Oyente (Social Intelligence)

Para alimentar este sistema, desarrollamos un "Listener" en Python encargado de procesar datos no estructurados de redes sociales y convertirlos en información lógica para el motor de rutas.

## 🛠️ Stack Tecnológico

- **Frontend**: Astro + Vanilla JS/TS.
- **Estilos**: Vanilla CSS + Tailwind CSS (Utility).
- **Mapas**: Leaflet.js.
- **Motor**: Rust (WASM).
- **Persistencia**: IndexedDB.

## 🏛️ La Filosofía: Tecnología para la Regeneración

MueveCancun no es solo software; es una declaración de principios. Es el primer pilar del **Proyecto RFM**.

Creemos que la eficiencia no es un lujo técnico, es un imperativo moral. En un entorno de alta demanda, la tecnología debe ser humilde, ligera y poderosa. Nos alejamos de la complejidad innecesaria para abrazar la "Supervivencia Extrema".

> Este proyecto es la manifestación del **Manifiesto del Filósofo Roto**: una visión donde el código es la herramienta para regenerar el orden nacional.

No buscamos ser solo una aplicación de transporte, sino el estándar de cómo la ingeniería de datos y la automatización pueden devolverle el tiempo y la dignidad al ciudadano.

## 👤 Detrás del Proyecto

**Julián Alexander Juárez Alvarado**  
_Full Stack Data Engineer y Analista de Seguridad._

Mi carrera se define por una obsesión: la eficiencia. MueveCancun es mi laboratorio de pruebas donde aplico la experiencia adquirida en entornos de alta demanda (como la logística y la hotelería de lujo) para resolver problemas sociales reales. Si el reto es complejo, tengo el stack y la mentalidad para construir la solución.

---

## 📦 Estructura del Proyecto

- `/rust-wasm`: Lógica central en Rust.
- `/src`: ASTRO / Componentes.
- `/public/data`: Base de datos de rutas (JSON).

## 🛠️ Desarrollo

1. `npm install`
2. `npm run build:wasm` (requiere wasm-pack)
3. `npm run dev`

---

_Desarrollado con ❤️ para los viajeros de Cancún._
