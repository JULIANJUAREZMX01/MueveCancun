import fs from 'fs';

const filePath = 'src/components/InteractiveMap.astro';
let content = fs.readFileSync(filePath, 'utf8');

// The error _leaflet_pos typically happens when map container is resized/display changed, or Leaflet tries to calculate bounds before DOM layout is finished.
// We can wrap map.fitBounds in requestAnimationFrame or setTimeout
content = content.replace(
  'map.fitBounds(allCoords, { padding: [50, 50], maxZoom: 14 });',
  'setTimeout(() => map.fitBounds(allCoords, { padding: [50, 50], maxZoom: 14 }), 100);'
);

content = content.replace(
  'map.fitBounds(allCoords, { padding: [50, 50], maxZoom: 13 });',
  'setTimeout(() => map.fitBounds(allCoords, { padding: [50, 50], maxZoom: 13 }), 100);'
);

fs.writeFileSync(filePath, content);
console.log('Patched InteractiveMap.astro');
