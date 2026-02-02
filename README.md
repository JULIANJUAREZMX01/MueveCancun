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

## 🛠️ Desarrollo
1. `npm install`
2. `npm run build:wasm` (requiere wasm-pack)
3. `npm run dev`

---
*Desarrollado con ❤️ para los viajeros de Cancún por el equipo de CancúnMueve.*
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
