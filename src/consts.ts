import type { Site, Links } from "@types"

// Global
export const SITE: Site = {
  TITLE: "Mueve Reparto",
  DESCRIPTION: "Gestiona tus entregas del día: paradas, ruta óptima y notificaciones al cliente.",
  AUTHOR: "Mueve Reparto Team",
}

// Navigation Links (delivery app — 4 tabs)
export const LINKS: Links = [
  { TEXT: "Inicio",   HREF: "/home" },
  { TEXT: "Paradas",  HREF: "/pedidos" },
  { TEXT: "Ruta",     HREF: "/reparto" },
  { TEXT: "Metricas", HREF: "/metricas" },
]
