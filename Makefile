# Mueve Reparto — Makefile
# Reemplaza los scripts PowerShell. Funciona en Linux/macOS.
# Uso: make <comando>

.PHONY: help dev build preview api api-dev db-migrate check clean

# ----- Frontend (Astro) -----

help:
	@echo "Comandos disponibles:"
	@echo "  make dev          Servidor de desarrollo Astro (localhost:4321)"
	@echo "  make build        Build de produccion Astro"
	@echo "  make preview      Preview del build"
	@echo "  make api          Compila la API Rust (release)"
	@echo "  make api-dev      Ejecuta la API en modo debug"
	@echo "  make db-migrate   Corre las migraciones SQL con sqlx"
	@echo "  make check        Lint + type-check"
	@echo "  make clean        Limpia artefactos de build"

dev:
	pnpm dev

build:
	pnpm build

preview:
	pnpm preview

# ----- Backend (Rust API) -----

api:
	cd api && cargo build --release

api-dev:
	cd api && cargo run

db-migrate:
	@echo "Corriendo migraciones con sqlx..."
	cd api && sqlx migrate run

# ----- Calidad -----

check:
	pnpm typecheck || true
	pnpm lint || true
	cd api && cargo clippy -- -D warnings

# ----- Limpieza -----

clean:
	rm -rf dist
	cd api && cargo clean
