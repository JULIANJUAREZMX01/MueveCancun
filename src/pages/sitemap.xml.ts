import type { APIRoute } from 'astro';
import { getAllRoutes } from '../utils/routes';

export const prerender = true;

const siteUrl = (import.meta.env.SITE ?? 'https://querutamellevacancun.onrender.com').replace(/\/$/, '');

export const GET: APIRoute = async () => {
  const staticPages = [
    { url: '/es/home', priority: 1.0, changefreq: 'daily' },
    { url: '/es/rutas', priority: 0.9, changefreq: 'daily' },
    { url: '/es/community', priority: 0.7, changefreq: 'weekly' },
    { url: '/es/wallet', priority: 0.6, changefreq: 'monthly' },
    { url: '/es/about', priority: 0.5, changefreq: 'monthly' },
    { url: '/en/home', priority: 0.8, changefreq: 'daily' },
    { url: '/en/rutas', priority: 0.7, changefreq: 'daily' },
  ];

  const routes = await getAllRoutes();
  const esRoutePages = routes.map(route => ({
    url: `/es/ruta/${route.id}`,
    priority: 0.6,
    changefreq: 'weekly'
  }));
  const enRoutePages = routes.map(route => ({
    url: `/en/ruta/${route.id}`,
    priority: 0.5,
    changefreq: 'weekly'
  }));

  const allPages = [...staticPages, ...esRoutePages, ...enRoutePages];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${allPages.map(page => `
      <url>
        <loc>${siteUrl}${page.url}</loc>
        <changefreq>${page.changefreq}</changefreq>
        <priority>${page.priority}</priority>
      </url>
    `).join('')}
  </urlset>`.trim();

  return new Response(sitemap, {
    status: 200,
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
