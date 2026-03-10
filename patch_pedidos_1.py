import re

with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

# Modify getAddressValue
old_get_address = """  function getAddressValue(): string {
    switch (currentMode) {
      case 'text': return (document.getElementById('input-address') as HTMLTextAreaElement).value.trim();
      case 'coords': {
        const lat = (document.getElementById('input-lat') as HTMLInputElement).value.trim();
        const lng = (document.getElementById('input-lng') as HTMLInputElement).value.trim();
        return lat && lng ? `${lat}, ${lng}` : '';
      }
      case 'link': return (document.getElementById('input-link') as HTMLInputElement).value.trim();
      default: return '';
    }
  }"""

new_get_address = """  function getAddressValue(): string {
    switch (currentMode) {
      case 'text': return (document.getElementById('input-address') as HTMLTextAreaElement).value.trim();
      case 'coords': {
        const lat = (document.getElementById('input-lat') as HTMLInputElement).value.trim();
        const lng = (document.getElementById('input-lng') as HTMLInputElement).value.trim();
        return lat && lng ? `${lat}, ${lng}` : '';
      }
      case 'link': {
        const link = (document.getElementById('input-link') as HTMLInputElement).value.trim();
        if (!link) return '';

        // Intenta extraer coordenadas
        let lat: number | null = null;
        let lng: number | null = null;

        // google.com/maps/@LAT,LNG
        const googleRegex1 = /@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/;
        // maps.google.com/?q=LAT,LNG
        const googleRegex2 = /[?&]q=(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/;
        // maps.apple.com/?ll=LAT,LNG o waze.com/ul?ll=LAT,LNG
        const llRegex = /[?&]ll=(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/;

        let match = link.match(googleRegex1);
        if (match) {
          lat = parseFloat(match[1]);
          lng = parseFloat(match[2]);
        } else {
          match = link.match(googleRegex2);
          if (match) {
            lat = parseFloat(match[1]);
            lng = parseFloat(match[2]);
          } else {
            match = link.match(llRegex);
            if (match) {
              lat = parseFloat(match[1]);
              lng = parseFloat(match[2]);
            }
          }
        }

        if (lat !== null && lng !== null) {
          currentCoords = { lat, lng };
          return link; // Retornamos el link como address, saveStop usará currentCoords
        }

        return link;
      }
      default: return '';
    }
  }"""

content = content.replace(old_get_address, new_get_address)

# Modify saveStop
old_save_stop = """    if (currentMode === 'text' && currentCoords) {
      finalLat = currentCoords.lat;
      finalLng = currentCoords.lng;
    } else if (currentMode === 'coords') {
      const latStr = (document.getElementById('input-lat') as HTMLInputElement).value;
      const lngStr = (document.getElementById('input-lng') as HTMLInputElement).value;
      if (latStr) finalLat = parseFloat(latStr);
      if (lngStr) finalLng = parseFloat(lngStr);
    }"""

new_save_stop = """    if ((currentMode === 'text' || currentMode === 'link') && currentCoords) {
      finalLat = currentCoords.lat;
      finalLng = currentCoords.lng;
    } else if (currentMode === 'coords') {
      const latStr = (document.getElementById('input-lat') as HTMLInputElement).value;
      const lngStr = (document.getElementById('input-lng') as HTMLInputElement).value;
      if (latStr) finalLat = parseFloat(latStr);
      if (lngStr) finalLng = parseFloat(lngStr);
    }"""

content = content.replace(old_save_stop, new_save_stop)

with open('src/pages/pedidos.astro', 'w') as f:
    f.write(content)
