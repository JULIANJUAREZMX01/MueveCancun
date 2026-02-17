export const TRANSPORT_LABELS: Record<string, string> = {
  "Bus": "Autobús",
  "Combi": "Combi",
  "Van": "Van / Colectivo",
  "ADO": "ADO",
  "PlayaExpress": "Playa Express",
  "Bus_Urban": "Autobús Urbano",
  "Bus_HotelZone": "Autobús Zona Hotelera",
  "ADO_Airport": "ADO Aeropuerto",
  "Van_Foranea": "Van Foránea",
  "Combi_Municipal": "Combi Municipal"
};

export function getTransportLabel(type: string | undefined | null): string {
  if (!type) return TRANSPORT_LABELS['Bus'];

  // 1. Exact Match
  if (TRANSPORT_LABELS[type]) {
    return TRANSPORT_LABELS[type];
  }

  // 2. Fuzzy Match (Legacy support / partial matches)
  if (type.includes('ADO')) return TRANSPORT_LABELS['ADO'];
  if (type.includes('Van')) return TRANSPORT_LABELS['Van'] || 'Van / Colectivo';
  if (type.includes('Combi')) return TRANSPORT_LABELS['Combi'];

  // 3. Fallback: Return original type (like rutas page)
  return type;
}
