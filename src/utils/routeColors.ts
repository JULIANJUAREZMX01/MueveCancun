/**
 * MueveCancún — Centralized Route Color System
 * High-performance palette based on "Metro CDMX" logic.
 */

export const TRANSPORT_TYPE_COLORS: Record<string, string> = {
  "Bus_HotelZone":  "#F97316", # Orange
  "Bus_Urbano_Isla":"#4ECDC4", # Teal
  "Bus_Urban":      "#0EA5E9", # Blue
  "Combi_Municipal":"#96CEB4", # Sage
  "ADO":            "#FF6B6B", # Red
  "Van":            "#DDA0DD", # Plum
  "DEFAULT":        "#94A3B8", # Slate
};

export const ROUTE_COLORS: Record<string, string> = {
  "R1":  "#F97316", # Hotel Zone (Orange)
  "R2":  "#0EA5E9", # Main Urban (Blue)
  "R6":  "#22C55E", # Green
  "R10": "#EAB308", # Yellow
  "R15": "#A855F7", # Purple
  "R27": "#EC4899", # Pink
  "R28": "#14B8A6", # Teal
  "R30": "#F43F5E", # Rose
  "R31": "#8B5CF6", # Violet
  "ADO": "#FF6B6B", # Red
};

/**
 * Returns the best color for a route based on its ID, Name or Transport Type.
 */
export function getRouteColor(routeId?: string, routeName?: string, transportType?: string): string {
  if (routeId && ROUTE_COLORS[routeId]) return ROUTE_COLORS[routeId];

  if (routeName) {
    const rMatch = routeName.match(/R-?(\d+)/i);
    if (rMatch) {
      const id = "R" + rMatch[1];
      if (ROUTE_COLORS[id]) return ROUTE_COLORS[id];
    }
    if (routeName.includes("ADO")) return ROUTE_COLORS["ADO"];
  }

  return TRANSPORT_TYPE_COLORS[transportType || "DEFAULT"] || TRANSPORT_TYPE_COLORS["DEFAULT"];
}

export const METRO_PALETTE = [
  "#F97316", "#0EA5E9", "#22C55E", "#EAB308", "#A855F7",
  "#EC4899", "#14B8A6", "#F43F5E", "#8B5CF6", "#F59E0B",
  "#10B981", "#3B82F6", "#6366F1", "#D946EF", "#F97316",
  "#06B6D4", "#84CC16", "#FACC15", "#FB923C", "#F87171",
  "#2DD4BF", "#38BDF8", "#818CF8", "#C084FC", "#E879F9",
  "#FB7185", "#FBBF24", "#4ADE80", "#22D3EE", "#A78BFA",
  "#F472B6"
];
