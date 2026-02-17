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
  "Combi_Municipal": "Combi Municipal",
  "Bus_Urbano_Isla": "Autobús Urbano", // Discovered from routes.json
  "Bus_Isla": "Autobús Isla" // Just in case
};

export function getTransportLabel(type?: string | null): string {
  if (!type) return 'Autobús';

  // 1. Try exact match
  if (TRANSPORT_LABELS[type]) {
    return TRANSPORT_LABELS[type];
  }

  // 2. Try fuzzy matching (logic from RouteCalculator)
  if (type.includes('ADO')) return 'ADO';
  if (type.includes('Combi') || type.includes('Van')) return 'Combi';

  // 3. Fallback
  return 'Autobús';
}
