# Research Notes: Astro 5 Content Collections

## Overview
Astro 5 introduces the **Content Layer API**, which is the new standard for managing structured data. Instead of just Markdown files, we can now load data from JSON files, remote APIs, or custom loaders with full type safety via Zod.

## Key Findings

### 1. The `file()` Loader
For our `master_routes.json`, the most efficient way to load data is using the `file()` loader. This allows us to point to a single JSON file and treat its entries as collection items.

### 2. Schema Validation (Zod)
We can define a strict schema to prevent data corruption.
```typescript
import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const routes = defineCollection({
  loader: file("src/content/routes/master_routes.json"),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    operator: z.string(),
    fare_mxn: z.number(),
    description: z.string().optional(),
    schedule: z.object({
      start: z.string(),
      end: z.string(),
      frequency_minutes: z.number(),
    }),
    stops: z.array(z.object({
      id: z.string(),
      name: z.string(),
      location: z.object({
        type: z.literal("Point"),
        coordinates: z.array(z.number()),
      }),
      order: z.number(),
      is_terminal: z.boolean().optional(),
      amenities: z.array(z.string()).optional(),
      landmarks: z.string().optional(),
    })),
    geometry: z.object({
      type: z.literal("LineString"),
      coordinates: z.array(z.array(z.number())),
    }),
    statistics: z.object({
      avg_duration_minutes: z.number(),
      distance_km: z.number(),
      reliability_score: z.number(),
    }),
  })
});
```

### 3. Progressive Hydration
Astro 5 continues to support the `client:*` directives.
- Use `client:load` for the **Route Search** (interactive discovery).
- Use `client:visible` or `client:idle` for the **Interactive Map** (large assets, not needed immediately).

## Implementation Strategy
1. Move `public/data/master_routes.json` to `src/content/routes/`.
2. Configure `src/content/config.ts` with the schema above.
3. Run `pnpm astro sync` to generate the TypeScript types.
4. Access data via `getCollection('routes')`.
