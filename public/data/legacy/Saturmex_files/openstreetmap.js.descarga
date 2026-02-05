 const ROUTES_URL = 'https://raw.githubusercontent.com/floezahs/satur/refs/heads/main/rautes.json';

  // State
  let routes = [];
  let map, activeLayerGroup = null, animationFrameId = null;
  // base layers for light/dark themes
  let lightBaseLayer = null;
  let darkBaseLayer = null;
  let currentBaseLayer = null;

    // Init map when leaflet is loaded
    function initMap() {
      map = L.map('map').setView([21.150385, -86.8619659], 13);

      // Light base (OpenStreetMap Standard)
      const lightUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      lightBaseLayer = L.tileLayer(lightUrl, { attribution: '© OpenStreetMap contributors' });

      // Dark base (Carto Dark Matter) - good contrast for dark mode
      const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      darkBaseLayer = L.tileLayer(darkUrl, { attribution: '&copy; CartoDB & OpenStreetMap' });

      // Add default later via applyTheme (so we can swap base layers)
    }

    // Apply theme: 'light' or 'dark'. Swaps base layers and toggles body class.
    function applyTheme(theme) {
      if (!map) return;
      const body = document.body;
      if (theme === 'dark') {
        // remove light base if present
        if (currentBaseLayer && map.hasLayer(currentBaseLayer)) map.removeLayer(currentBaseLayer);
        darkBaseLayer.addTo(map);
        currentBaseLayer = darkBaseLayer;
        body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        if (currentBaseLayer && map.hasLayer(currentBaseLayer)) map.removeLayer(currentBaseLayer);
        lightBaseLayer.addTo(map);
        currentBaseLayer = lightBaseLayer;
        body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }

      // update theme icon if present
      setThemeIcon(theme);

      // ensure map renders tiles properly after swap
      setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 120);
    }

    function setThemeIcon(theme) {
      const iconEl = document.getElementById('themeIcon');
      if (!iconEl) return;
      // simple swap: sun for light, moon for dark (use different path shapes)
      if (theme === 'dark') {
        iconEl.innerHTML = '<path fill="currentColor" d="M17.293 13.293a8 8 0 11-10.586-10.586 6 6 0 0010.586 10.586z"/>';
      } else {
        iconEl.innerHTML = '<path d="M10 2a.75.75 0 01.75.75V4a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2zM10 16a.75.75 0 01.75.75V18a.75.75 0 01-1.5 0v-1.25A.75.75 0 0110 16zM4.22 4.22a.75.75 0 011.06 0l.88.88a.75.75 0 11-1.06 1.06l-.88-.88a.75.75 0 010-1.06zM14.94 14.94a.75.75 0 011.06 0l.88.88a.75.75 0 11-1.06 1.06l-.88-.88a.75.75 0 010-1.06zM2 10a.75.75 0 01.75-.75H4a.75.75 0 010 1.5H2.75A.75.75 0 012 10zM16 10a.75.75 0 01.75-.75H18a.75.75 0 010 1.5h-1.25A.75.75 0 0116 10zM4.22 15.78a.75.75 0 010-1.06l.88-.88a.75.75 0 111.06 1.06l-.88.88a.75.75 0 01-1.06 0zM14.94 5.06a.75.75 0 010-1.06l.88-.88a.75.75 0 111.06 1.06l-.88.88a.75.75 0 01-1.06 0zM10 5.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />';
      }
    }

    // Fetch routes and render list
    async function loadRoutes() {
      setStatus('Cargando rutas...');
      try {
        const res = await fetch(ROUTES_URL);
        if (!res.ok) throw new Error('Error al obtener rutas');
        const data = await res.json();

        routes = [];
        data.forEach(collection => {
          if (collection.type === 'FeatureCollection' && Array.isArray(collection.features)) {
            collection.features.forEach(feature => routes.push(feature));
          }
        });

        renderList(routes);
        setStatus(`Cargadas ${routes.length} rutas`);

        // If URL has ?ruta= we show it
        const urlParams = new URLSearchParams(window.location.search);
        const rutaParam = urlParams.get('ruta');
        if (rutaParam !== null) {
          // Support new sharing format: ?ruta=RUTA_31&id=polyline_...
          const idParam = urlParams.get('id');
          let idx = -1;

          if (idParam) {
            // prefer matching by id when provided
            idx = routes.findIndex(r => r.properties && r.properties.id === idParam);
          } else {
            // try to find route by properties.id matching rutaParam (legacy)
            idx = routes.findIndex(r => r.properties && r.properties.id === rutaParam);
            // fallback: try to match by slugified name
            if (idx === -1) {
              const slugMatch = rutaParam.toString();
              idx = routes.findIndex(r => {
                const name = r.properties?.name || '';
                const slug = slugify(name);
                return slug === slugMatch;
              });
            }
            // fallback: numeric index
            if (idx === -1) {
              const parsed = parseInt(rutaParam);
              if (!isNaN(parsed) && parsed >= 0 && parsed < routes.length) idx = parsed;
            }
          }

          if (idx !== -1 && idx >= 0 && idx < routes.length) {
              showRouteOnMap(idx);
              // scroll to active list element (prefer idParam if present)
              const el = idParam ? document.querySelector(`[data-id='${idParam}']`) : (document.querySelector(`[data-id='${rutaParam}']`) || document.querySelector(`[data-index='${idx}']`));
              if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // highlight selected using background color instead of outline
                  document.querySelectorAll('.route-item').forEach(elm => elm.classList.remove('bg-green-100', 'border-green-300'));
                  el.classList.add('bg-green-100', 'border-green-300');
                }
            } else {
              setStatus('Parámetro ruta inválido', true);
            }
        }

      } catch (err) {
        setStatus('Error al cargar rutas', true);
        document.getElementById('routesList').innerHTML = '<div class="text-sm text-red-500">No se pudieron cargar las rutas.</div>';
        console.error(err);
      }
    }

    function renderList(list) {
      const container = document.getElementById('routesList');
      container.innerHTML = '';
      if (!list || list.length === 0) {
        container.innerHTML = '<div class="text-sm text-gray-500">No hay rutas disponibles.</div>';
        return;
      }

      list.forEach((route, idxInList) => {
        // find the global index in the main routes array
        const globalIndex = routes.findIndex(r => r === route || (r.properties && route.properties && r.properties.id === route.properties.id));
        const name = route.properties?.name || `Ruta ${globalIndex + 1}`;
        const routeId = route.properties?.id || String(globalIndex);

  const item = document.createElement('div');
  // Make item a vertical card: single-line title on top, buttons aligned at bottom
  // Use min-height and overflow-hidden so buttons stay inside the card
  item.className = 'route-item p-2 border border-gray-100 rounded-lg bg-white flex flex-col justify-between min-h-[56px] overflow-hidden';
        item.setAttribute('data-index', globalIndex);
        item.setAttribute('data-id', routeId);

        // Elegant card: title, optional subtitle, centered action buttons below
        const lengthLabel = route.properties?.length ? `${escapeHtml(route.properties.length)}` : '';
        item.innerHTML = `
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gray-900 truncate">${escapeHtml(name)}</div>
            <div class="text-xs text-gray-500 mt-1 truncate">${lengthLabel}</div>
          </div>
          <div class="mt-3 flex items-center justify-center gap-3">
            <button class="share-btn inline-flex items-center gap-1 px-3 py-2 bg-white text-indigo-700 border border-indigo-100 rounded-md shadow-sm hover:bg-indigo-50 transition" data-id="${escapeHtml(routeId)}" aria-label="Compartir ruta" title="Compartir">
              <span class="text-sm font-medium">Compartir</span>
              <img src="https://files.svgcdn.io/grommet-icons/share.svg" alt="Compartir" class="w-4 h-4" />
            </button>
            <button class="view-btn inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md shadow-sm hover:bg-indigo-700 transition" data-id="${escapeHtml(routeId)}">Ver</button>
          </div>
        `;

        container.appendChild(item);

        // share button for this item
        const itemShare = item.querySelector('.share-btn');
        if (itemShare) {
          itemShare.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const id = ev.currentTarget.getAttribute('data-id');
            // pass the human-readable name as well
            shareRouteLink(id, name);
          });
        }

        item.querySelector('.view-btn').addEventListener('click', (ev) => {
          // Navigate with GET params: ruta=<SLUG>&id=<routeId>
          const id = ev.currentTarget.getAttribute('data-id');
          const slug = slugify(name);
          const url = new URL(window.location.href);
          url.searchParams.set('ruta', slug);
          url.searchParams.set('id', id);
          window.location.href = url.toString();
        });

        // click entire item -> behave same as 'Ver ruta' button (navigate with ruta=SLUG&id=ID)
        item.addEventListener('click', (e) => {
          // ignore clicks on inner action buttons
          if (e.target && e.target.closest) {
            const btn = e.target.closest('button');
            if (btn && (btn.classList.contains('view-btn') || btn.classList.contains('share-btn'))) return;
          }

          if (globalIndex >= 0) {
            const slug = slugify(name);
            const id = routeId;
            const url = new URL(window.location.href);
            url.searchParams.set('ruta', slug);
            url.searchParams.set('id', id);
            window.location.href = url.toString();
          }
        });
      });
    }

    // Simple HTML escape
    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]);
    }

    // Slugify route name to a compact identifier used in shared URL (e.g. RUTA_31)
    function slugify(name) {
      if (!name) return '';
      return String(name)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    }

    function setStatus(msg, isError = false) {
      const s = document.getElementById('status');
      s.textContent = msg;
      s.className = isError ? 'text-sm text-red-500' : 'text-sm text-gray-500';
      setTimeout(() => { if (s.textContent === msg) s.textContent = ''; }, 4000);
    }

    // Clear previously drawn route
    function clearActiveRoute() {
      if (activeLayerGroup) {
        if (activeLayerGroup instanceof L.LayerGroup) {
          activeLayerGroup.eachLayer(layer => map.removeLayer(layer));
        } else {
          map.removeLayer(activeLayerGroup);
        }
        activeLayerGroup = null;
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      // Hide and clear FAB when route is cleared
      const fab = document.getElementById('fab-map');
      if (fab) {
        fab.innerHTML = '';
        fab.title = 'Acción';
        fab.style.display = 'none';
        fab.setAttribute('aria-hidden', 'true');
        fab.removeAttribute('data-route-id');
      }
    }

    // Show route on map (index in routes array)
    function showRouteOnMap(routeIndex) {
      if (!map) initMap();
      clearActiveRoute();

      const route = routes[routeIndex];
      if (!route || !route.geometry || !route.geometry.coordinates) {
        setStatus('Formato de ruta inválido', true);
        return;
      }

      const coordinates = route.geometry.coordinates;
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        setStatus('La ruta no tiene suficientes coordenadas', true);
        return;
      }

      // Reuse the same styles: static blue, animated green dashed
      const staticPolyline = L.polyline(coordinates, { color: 'blue', weight: 4, opacity: 0.5 });
      let dashOffset = 0;
      const animatedPolyline = L.polyline(coordinates, { color: 'green', weight: 8, opacity: 0.8, dashArray: '20,20', dashOffset });

      // Markers: assume coordinates are [lat, lng] to match openstreetmap.js
      const startCoord = coordinates[0];
      const endCoord = coordinates[coordinates.length - 1];

      const startMarker = L.marker([startCoord[0], startCoord[1]], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25,41], iconAnchor: [12,41]
        })
      });

      const endMarker = L.marker([endCoord[0], endCoord[1]], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25,41], iconAnchor: [12,41]
        })
      });

      const routeName = route.properties?.name || `Ruta ${routeIndex+1}`;
      startMarker.bindPopup(`<b>Inicio:</b> ${escapeHtml(routeName)}<br><button onclick="openStreetView(${startCoord[0]}, ${startCoord[1]})">Ver Street View (Inicio)</button>`);
      endMarker.bindPopup(`<b>Final:</b> ${escapeHtml(routeName)}<br><button onclick="openStreetView(${endCoord[0]}, ${endCoord[1]})">Ver Street View (Final)</button>`);

      activeLayerGroup = L.layerGroup([staticPolyline, animatedPolyline, startMarker, endMarker]);
      activeLayerGroup.addTo(map);

      function animate() {
        dashOffset -= 1;
        animatedPolyline.setStyle({ dashOffset });
        animationFrameId = requestAnimationFrame(animate);
      }
      animate();

      map.fitBounds(staticPolyline.getBounds(), { padding: [40,40] });
      setStatus(`Mostrando: ${routeName}`);

      // Update floating action button with route name and make it visible
      const fabEl = document.getElementById('fab-map');
      if (fabEl) {
        // choose a route id to share (prefer properties.id)
        const routeId = route.properties?.id || String(routeIndex);
        // short label: try to keep it concise
        const short = routeName.length > 24 ? routeName.slice(0, 21) + '…' : routeName;
        // Build inner HTML: label + small share button
        fabEl.innerHTML = `
          <span class="fab-label truncate" style="color:white;">${escapeHtml(short)}</span>

        `;
        fabEl.title = routeName;
        fabEl.style.display = 'flex';
        fabEl.style.alignItems = 'center';
        fabEl.setAttribute('data-route-id', routeId);
        fabEl.removeAttribute('aria-hidden');

        // wire share button
        const shareBtn = document.getElementById('fab-share');
        if (shareBtn) {
          shareBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            shareRouteLink(routeId);
          });
        }
      }
    }

    // Open Google Street View — same behaviour as in openstreetmap.js
    function openStreetView(lat, lng) {
      if (isNaN(lat) || isNaN(lng)) {
        alert('⚠️ Por favor ingresa coordenadas válidas');
        return;
      }
      const url = `https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m6!1e1!3m4!1s!2e0!7i16384!8i8192`;
      window.open(url, '_blank');
    }

    // Share route link. Uses Web Share API when available, falls back to clipboard.
    function shareRouteLink(routeId, routeName) {
      try {
        const url = new URL(window.location.href);
        // Build friendly slug from routeName when provided, else fallback to routeId
        const slug = routeName ? slugify(routeName) : routeId;
        url.searchParams.set('ruta', slug);
        url.searchParams.set('id', routeId);
        const link = url.toString();

        if (navigator.share) {
          navigator.share({ title: 'Ver ruta', text: 'Ver ruta seleccionada', url: link }).catch(err => {
            // If user cancels or an error occurs, fallback to clipboard
            console.warn('share failed, fallback to clipboard', err);
            navigator.clipboard && navigator.clipboard.writeText(link).then(() => alert('Enlace copiado al portapapeles'));
          });
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(link).then(() => {
            alert('Enlace copiado al portapapeles:\n' + link);
          }).catch(err => {
            console.error('No se pudo copiar al portapapeles', err);
            prompt('Copia el enlace:', link);
          });
        } else {
          // very old browsers: show prompt with link
          prompt('Copia el enlace:', link);
        }
      } catch (err) {
        console.error('Error construyendo enlace de compartido', err);
        alert('Error al generar el enlace');
      }
    }

    // Wire search
    document.addEventListener('DOMContentLoaded', () => {
      initMap();
      loadRoutes();

      // Theme initialization: prefer saved preference, otherwise system preference
      const savedTheme = localStorage.getItem('theme');
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');
      // apply once map is created
      applyTheme(initialTheme);

      // Wire the theme toggle button
      const themeBtn = document.getElementById('themeToggleBtn');
      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          const next = document.body.classList.contains('dark') ? 'light' : 'dark';
          applyTheme(next);
        });
      }

      const search = document.getElementById('search');
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        if (!q) return renderList(routes);
        const filtered = routes.filter((r, i) => (r.properties?.name || (`Ruta ${i+1}`)).toLowerCase().includes(q));
        renderList(filtered);
      });

      // Mobile drawer handling: move routesList into mobile container when opening
      const openBtn = document.getElementById('openDrawerBtn');
      const closeBtn = document.getElementById('closeDrawerBtn');
      const mobileDrawer = document.getElementById('mobileDrawer');
      const mobileContainer = document.getElementById('mobileRoutesContainer');
      const routesList = document.getElementById('routesList');

      function openDrawer() {
        if (routesList && mobileContainer) mobileContainer.appendChild(routesList);
        mobileDrawer.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }

      function closeDrawer() {
        if (routesList) {
          // move back into sidebar
          const sidebar = document.getElementById('sidebar');
          if (sidebar) sidebar.appendChild(routesList);
        }
        mobileDrawer.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }

      if (openBtn) openBtn.addEventListener('click', openDrawer);
      if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
      const backdrop = document.getElementById('drawerBackdrop');
      if (backdrop) backdrop.addEventListener('click', closeDrawer);
    });