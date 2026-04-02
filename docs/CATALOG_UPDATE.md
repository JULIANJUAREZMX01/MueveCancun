# Catalog Maintenance Guide (v3.4+)

This document explains how the route catalog is maintained, enriched, and validated for the MueveCancun project.

## Data Structure

- **Individual Route Files**: Located in `public/data/routes/*.json`. Each file represents one or more routes.
- **Master Catalog**: `public/data/master_routes.json`. This is a generated file that consolidates all individual routes.
- **Optimized Catalog**: `public/data/master_routes.optimized.json`. The production-ready file used by the WASM engine.

## Updating the Catalog

### 1. Modifying Existing Routes
Edit the corresponding JSON file in `public/data/routes/`. Ensure stop names and coordinates are accurate.

### 2. Adding New Routes from External Data (Saturmex)
We use a script to import routes from `public/data/saturmex_routes.json`.
To run the import:
```bash
node --experimental-strip-types scripts/import-saturmex.ts
```
This will create new individual JSON files in `public/data/routes/`.

### 3. Fixing Hub Coordinates
Use `scripts/fix-hubs.ts` to ensure key hubs (Crucero, ADO, etc.) have consistent coordinates across all routes.
```bash
node --experimental-strip-types scripts/fix-hubs.ts
```

### 4. Regenerating the Master Catalog
After any change to `public/data/routes/`, run the following commands:
```bash
pnpm run merge-routes     # Merges individual files into master_routes.json
pnpm run validate-routes  # Validates schema and data integrity
pnpm run optimize-json    # Generates master_routes.optimized.json
pnpm run validate-catalog # Final check on the production file
```

## Key Hubs
The following hubs are critical for the routing engine and are monitored via integration tests:
- El Crucero
- Terminal ADO Cancún Centro
- Plaza Las Américas
- Mercado 28
- Muelle Ultramar (Puerto Juárez)

## Validation Rules
- Max 5,000 routes in the catalog.
- Max 500 stops per route.
- All stops must have valid `lat` and `lng` (non-zero, within Cancun area).
- Route IDs must be unique.

## Testing
Always run the integration tests after updating the catalog:
```bash
pnpm exec vitest run tests/integration/hubs_routing.test.ts
node tests/integration/test-wasm.mjs
```
