import re

with open('src/layouts/MainLayout.astro', 'r') as f:
    content = f.read()

# Replace CSP meta tag
old_csp = """    <!-- 🛡️ Sentinel: Strict CSP -->
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://*.cartocdn.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: https://*.cartocdn.com https://*.openstreetmap.org;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://*.cartocdn.com;
        worker-src 'self' blob:;
        object-src 'none';
        base-uri 'self';
        upgrade-insecure-requests;
    ">"""

new_csp = """    <!-- 🛡️ Sentinel: Strict CSP -->
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://*.cartocdn.com https://www.googletagmanager.com https://www.google-analytics.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: https://*.cartocdn.com https://*.openstreetmap.org https://www.google-analytics.com;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://*.cartocdn.com https://www.google-analytics.com;
        worker-src 'self' blob:;
        object-src 'none';
        base-uri 'self';
        upgrade-insecure-requests;
    ">"""

content = content.replace(old_csp, new_csp)

# Replace Title, Description, and OG tags
old_meta = """    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title} | CancúnMueve</title>
    <meta name="description" content={description} />
    <meta property="og:image" content={image} />

    <!-- PWA -->
    <meta name="theme-color" content="#0d9488" />
    <link rel="manifest" href="/manifest.json" />"""

new_meta = """    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />

    <!-- Primary Meta Tags -->
    <title>MueveCancún - Rutas de Transporte Público Offline</title>
    <meta name="title" content="MueveCancún - Rutas de Transporte Público Offline" />
    <meta name="description" content="Encuentra las mejores rutas de transporte público en Cancún sin internet. Motor ultrarrápido con tecnología WebAssembly (Rust). Totalmente gratis y offline-first." />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://querutamellevacancun.onrender.com/" />
    <meta property="og:title" content="MueveCancún - Transporte Público Offline en Cancún" />
    <meta property="og:description" content="Navega por Cancún sin consumir tus datos. Rutas de transporte público, mapas y más, siempre disponibles offline." />
    <meta property="og:image" content="https://querutamellevacancun.onrender.com/og-image.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://querutamellevacancun.onrender.com/" />
    <meta name="twitter:title" content="MueveCancún - Transporte Público Offline en Cancún" />
    <meta name="twitter:description" content="Navega por Cancún sin consumir tus datos. Rutas de transporte público, mapas y más, siempre disponibles offline." />
    <meta name="twitter:image" content="https://querutamellevacancun.onrender.com/og-image.png" />

    <!-- Geo-tags: Cancún, Quintana Roo -->
    <meta name="geo.region" content="MX-ROO" />
    <meta name="geo.placename" content="Cancún" />
    <meta name="geo.position" content="21.161908;-86.851528" />
    <meta name="ICBM" content="21.161908, -86.851528" />

    <!-- PWA Manifest & Theme -->
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#00B4D8" />
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "MueveCancún",
      "url": "https://querutamellevacancun.onrender.com",
      "description": "Aplicación web offline-first para transporte público en Cancún con cálculo de rutas por WebAssembly.",
      "applicationCategory": "TravelApplication",
      "operatingSystem": "Any",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "MXN"
      },
      "featureList": "Offline Routing, Cancún Public Transit, Zero Data Cost, PWA",
      "author": {
        "@type": "Organization",
        "name": "MueveCancún Engineering"
      }
    }
    </script>"""

content = content.replace(old_meta, new_meta)

analytics_snippet = """    <!-- Google Analytics 4 -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR_MEASUREMENT_ID"></script>
    <script is:inline>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-YOUR_MEASUREMENT_ID');

      // Global Event Dispatchers
      window.mueveTrackers = {
        routeSearch: (origin, destination, isOffline) => {
          gtag('event', 'route_search', {
            event_category: 'Routing_WASM',
            origin: origin,
            destination: destination,
            network_status: isOffline ? 'offline' : 'online'
          });
          console.log('[Analytics] route_search dispatched');
        },
        offlineUsage: () => {
          gtag('event', 'offline_usage', {
            event_category: 'PWA_ServiceWorker',
            action: 'served_from_cache'
          });
          console.log('[Analytics] offline_usage dispatched');
        },
        pwaInstall: () => {
          gtag('event', 'pwa_install', {
            event_category: 'PWA_Lifecycle',
            action: 'accepted_prompt'
          });
          console.log('[Analytics] pwa_install dispatched');
        }
      };

      window.addEventListener('appinstalled', () => {
        window.mueveTrackers.pwaInstall();
      });
    </script>
    <ClientRouter />
  </head>"""

content = content.replace("    <ClientRouter />\n  </head>", analytics_snippet)

with open('src/layouts/MainLayout.astro', 'w') as f:
    f.write(content)

print("MainLayout patched successfully.")
