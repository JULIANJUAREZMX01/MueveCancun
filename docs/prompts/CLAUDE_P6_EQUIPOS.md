# Prompt P6 — Modo Empresa / Múltiples Repartidores

## Contexto

**Repo:** `sistemascancunjefe-ai/MueveRepartoEnCancun-`
**Stack:** Astro 5 + Vanilla JS / Rust Axum + PostgreSQL
**Prerequisito:** P5 (Auth OTP + JWT) completado

## Objetivo de negocio

Permitir que pequeños negocios de Cancún (ferreterías, farmacias, tiendas) gestionen
2–5 repartidores propios desde una sola cuenta "jefe de reparto".

## Schema DB — Migración 003

Crear `backend/migrations/003_teams.sql`:

```sql
-- Equipos de reparto
CREATE TABLE IF NOT EXISTS teams (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  invite_code    TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  plan           TEXT NOT NULL DEFAULT 'pro_team'
                   CHECK (plan IN ('pro_team_3', 'pro_team_10')),
  max_members    INTEGER NOT NULL DEFAULT 3,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Miembros del equipo
CREATE TABLE IF NOT EXISTS team_members (
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'repartidor'
               CHECK (role IN ('owner', 'repartidor')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

-- Vincular paradas a repartidor asignado
ALTER TABLE stops ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
```

## Backend — Nuevos endpoints

### `backend/src/routes/teams.rs`

```
POST /teams
  - AuthUser requerido
  - Crea team con owner = claims.sub
  - Devuelve team con invite_code

GET /teams/me
  - Devuelve el team del usuario (como owner o miembro)
  - Incluye lista de miembros

POST /teams/join
  - Body: { invite_code: String }
  - Añade al usuario al team como 'repartidor'
  - Valida que team.max_members no se supere

GET /teams/:team_id/stops
  - Solo owner puede ver paradas de todos los miembros
  - Devuelve stops con assigned_to info

PATCH /stops/:id/assign
  - Body: { assigned_to: UUID }
  - Solo owner puede asignar
```

## Frontend — Nuevas páginas

### `src/pages/equipo.astro`
Panel del jefe de reparto:
- Lista de repartidores activos (nombre, paradas completadas hoy, última ubicación GPS)
- Mapa Leaflet con marcadores de cada repartidor (posición GPS en tiempo real via trackingLog IDB sync)
- Botón "Asignar parada" → seleccionar repartidor + parada
- Código de invitación para compartir por WhatsApp

### Actualizar `src/pages/pedidos.astro`
- Si usuario es owner: mostrar selector "Asignar a:" en el formulario de nueva parada

### Actualizar `src/components/BottomNav.astro`
- Añadir tab "Equipo" si el usuario tiene un team (check localStorage.getItem('mr-team-id'))

## Nuevos planes de precios

Actualizar `src/pages/suscripcion.astro`:
```
Plan Pro Individual — $99/mes: 1 repartidor, paradas ilimitadas
Plan Pro Equipo 3 — $199/mes: hasta 3 repartidores
Plan Pro Equipo 10 — $399/mes: hasta 10 repartidores
```

## Criterios de aceptación P6

- [ ] Owner puede crear equipo y obtener código de invitación
- [ ] Repartidor puede unirse con código por WhatsApp
- [ ] Owner ve mapa con GPS de todos los miembros activos
- [ ] Owner puede crear y asignar paradas a repartidores específicos
- [ ] Repartidor solo ve sus paradas asignadas
- [ ] Límite de miembros se valida al intentar unirse
- [ ] Panel `/equipo` solo accesible para owners (redirecta si es repartidor)
