# Guía de Migración: Neon → Supabase

> **Rama**: `claude/supabase-integration`  
> **Estado**: Listo para merge cuando tengas las credenciales de Supabase configuradas.  
> **Neon**: Permanece intacto y activo en producción (sin cambios en `guardians.ts`).

---

## Arquitectura de Bases de Datos

```
DATABASE_PROVIDER=neon      → src/lib/guardians.ts           (activo en producción)
DATABASE_PROVIDER=supabase  → src/lib/guardians-supabase.ts  (nuevo, misma interfaz)
                                    ↕
                            src/lib/db-provider.ts            (despachador transparente)
```

El despachador `db-provider.ts` enruta automáticamente según `DATABASE_PROVIDER`.  
Las API routes pueden importar desde `db-provider.ts` para ser agnósticas al proveedor.

---

## Pasos para Activar Supabase

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project** → elige región `us-east-1` (más cercana a Render)
3. Guarda la contraseña de la DB

### 2. Ejecutar la migración SQL

En **SQL Editor** → **New Query**, pega el contenido de:

```
supabase/migrations/001_init.sql
```

Haz clic en **Run**. Esto crea:
- Tabla `guardians` (con RLS habilitado)
- Tabla `payments` (con RLS habilitado, FK a guardians)
- Índices de rendimiento
- Trigger `updated_at` automático
- Vista `guardian_stats`

### 3. Obtener credenciales

En **Settings → API**:
- `SUPABASE_URL` → "Project URL" (ej: `https://abcxyz.supabase.co`)
- `SUPABASE_SERVICE_KEY` → **service_role** key (⚠️ NO la `anon` key)

> La service_role key bypasea RLS — úsala SOLO server-side, nunca en el cliente.

### 4. Configurar en Render

En [Render Dashboard](https://dashboard.render.com) → tu servicio → **Environment**:

```
DATABASE_PROVIDER     = supabase
SUPABASE_URL          = https://xxxx.supabase.co
SUPABASE_SERVICE_KEY  = eyJhbGciOiJIUzI1...
```

> Mantén `DATABASE_URL` configurada también — Neon sigue disponible como fallback.

### 5. Verificar

```bash
curl https://querutamellevacancun.onrender.com/api/health
# Debe retornar: { "db": "connected", "db_provider": "supabase" }
```

---

## Migrar datos existentes de Neon a Supabase (opcional)

Si tienes guardianes en producción (Neon) que quieres migrar:

```sql
-- En Supabase SQL Editor: importar desde CSV exportado de Neon
-- O usar pg_dump / pg_restore entre las dos DBs

-- Verificar datos migrados:
SELECT COUNT(*) FROM guardians WHERE status = 'active';
SELECT SUM(amount) FROM payments WHERE status = 'success';
```

---

## Rollback a Neon

Si algo falla, volver a Neon en Render:

```
DATABASE_PROVIDER = neon
```

No requiere redeploy completo — solo cambio de env var.

---

## Archivos modificados / creados

| Archivo | Cambio |
|---------|--------|
| `src/lib/supabase.ts` | ✨ Nuevo — cliente Supabase server-side |
| `src/lib/supabase-types.ts` | ✨ Nuevo — tipos TypeScript del esquema |
| `src/lib/guardians-supabase.ts` | ✨ Nuevo — implementación Supabase (misma API que guardians.ts) |
| `src/lib/db-provider.ts` | ✨ Nuevo — despachador Neon/Supabase |
| `src/pages/api/health.ts` | 🔧 Actualizado — soporta health check de Supabase |
| `.env.example` | 🔧 Actualizado — vars de Supabase documentadas |
| `supabase/migrations/001_init.sql` | ✨ Nuevo — esquema SQL listo para Supabase Dashboard |
| `package.json` | 🔧 Actualizado — agrega `@supabase/supabase-js` |

## Sin cambios (Neon intacto)

- `src/lib/guardians.ts` — sin modificaciones
- `src/pages/api/webhooks/stripe.ts` — sin modificaciones
- Toda la lógica de negocio existente

---

## Variables de Entorno Completas

```bash
# .env local para desarrollo con Supabase
DATABASE_PROVIDER=supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...service_role...

# Mantener Neon configurado para poder comparar / rollback
DATABASE_URL=postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require
```
