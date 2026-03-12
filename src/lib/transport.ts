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

/**
 * Returns a human-readable label for a given transport type key.
 *
 * Logic:
 * 1. Checks for an exact match in TRANSPORT_LABELS.
 * 2. If not found, checks for known keywords (ADO, Combi, Van).
 * 3. Defaults to 'Autobús'.
 */
export function getTransportLabel(type?: string): string {
  if (!type) return "Autobús";

  // 1. Exact Dictionary Match
  if (TRANSPORT_LABELS[type]) {
    return TRANSPORT_LABELS[type];
  }

  // 2. Fuzzy / Keyword Fallback
  if (type.includes('ADO')) return 'ADO';
  if (type.includes('Combi') || type.includes('Van')) return 'Combi';

  // 3. Default Fallback
  return "Autobús";
}
