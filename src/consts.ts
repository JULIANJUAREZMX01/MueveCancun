import type { Site, Page, Links, Socials } from "@types"

// Global
export const SITE: Site = {
  TITLE: "CancúnMueve",
  DESCRIPTION: "La guía definitiva de transporte público en Cancún. Rutas en tiempo real, mapas y tarifas.",
  AUTHOR: "Jules & Gemini",
}

// Work Page
export const WORK: Page = {
  TITLE: "Work",
  DESCRIPTION: "Places I have worked.",
}

// Blog Page
export const BLOG: Page = {
  TITLE: "Blog",
  DESCRIPTION: "Writing on topics I am passionate about.",
}

// Projects Page
export const PROJECTS: Page = {
  TITLE: "Projects",
  DESCRIPTION: "Recent projects I have worked on.",
}

// Search Page
export const SEARCH: Page = {
  TITLE: "Search",
  DESCRIPTION: "Search all posts and projects by keyword.",
}

// Links
// Links
export const LINKS: Links = [
  {
    TEXT: "Inicio",
    HREF: "/",
  },
  {
    TEXT: "Mapa",
    HREF: "/mapa",
  },
  {
    TEXT: "Rutas",
    HREF: "/rutas",
  },
  {
    TEXT: "Nosotros",
    HREF: "/about",
  },
  {
    TEXT: "Comunidad",
    HREF: "/community",
  },
  {
    TEXT: "Wallet",
    HREF: "/wallet",
  },
  {
    TEXT: "Contribuir",
    HREF: "/contribuir",
  },
  {
    TEXT: "Tracking",
    HREF: "/tracking",
  },
]

// Socials
export const SOCIALS: Socials = [
  {
    NAME: "Email",
    ICON: "email",
    TEXT: "markhorn.dev@gmail.com",
    HREF: "mailto:markhorn.dev@gmail.com",
  },
  {
    NAME: "Github",
    ICON: "github",
    TEXT: "markhorn-dev",
    HREF: "https://github.com/markhorn-dev/astro-sphere"
  },
  {
    NAME: "LinkedIn",
    ICON: "linkedin",
    TEXT: "markhorn-dev",
    HREF: "https://www.linkedin.com/in/markhorn-dev/",
  },
  {
    NAME: "Twitter",
    ICON: "twitter-x",
    TEXT: "markhorn_dev",
    HREF: "https://twitter.com/markhorn_dev",
  },
]
