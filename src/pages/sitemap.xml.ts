import type { APIRoute } from 'astro';

export const prerender = true;

const siteUrl = (import.meta.env.SITE ?? 'https://querutamellevacancun.onrender.com').replace(/\/$/, '');

const pages = [
  { url: '/', priority: 1.0, changefreq: 'daily' },
  { url: '/home', priority: 0.9, changefreq: 'daily' },
  { url: '/rutas', priority: 0.9, changefreq: 'hourly' },
  { url: '/community', priority: 0.7, changefreq: 'weekly' },
  { url: '/wallet', priority: 0.6, changefreq: 'monthly' },
  { url: '/about', priority: 0.5, changefreq: 'monthly' },
];

export const GET: APIRoute = async () => {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${pages.map(page => `
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
