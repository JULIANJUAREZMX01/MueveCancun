import { describe, it, expect } from 'vitest';
import { getTransportLabel } from '../utils/transport';

describe('getTransportLabel', () => {
  it('should return exact matches correctly', () => {
    expect(getTransportLabel('Bus')).toBe('Autobús');
    expect(getTransportLabel('Combi')).toBe('Combi');
    expect(getTransportLabel('Van')).toBe('Van / Colectivo');
    expect(getTransportLabel('ADO')).toBe('ADO');
    expect(getTransportLabel('PlayaExpress')).toBe('Playa Express');
    expect(getTransportLabel('Bus_Urban')).toBe('Autobús Urbano');
    expect(getTransportLabel('Bus_HotelZone')).toBe('Autobús Zona Hotelera');
    expect(getTransportLabel('ADO_Airport')).toBe('ADO Aeropuerto');
    expect(getTransportLabel('Van_Foranea')).toBe('Van Foránea');
    expect(getTransportLabel('Combi_Municipal')).toBe('Combi Municipal');
    expect(getTransportLabel('Bus_Urbano_Isla')).toBe('Autobús Urbano');
  });

  it('should handle fuzzy matching correctly', () => {
    expect(getTransportLabel('ADO_Something')).toBe('ADO');
    expect(getTransportLabel('Combi_Other')).toBe('Combi');
    expect(getTransportLabel('Van_Something')).toBe('Combi'); // Matches "Van" -> Combi (RouteCalculator logic)
  });

  it('should prioritize exact match over fuzzy match', () => {
    // "Van" is in TRANSPORT_LABELS -> "Van / Colectivo"
    // "Van_Something" matches fuzzy -> "Combi"
    expect(getTransportLabel('Van')).toBe('Van / Colectivo');
  });

  it('should handle null/undefined/empty', () => {
    expect(getTransportLabel(null)).toBe('Autobús');
    expect(getTransportLabel(undefined)).toBe('Autobús');
    expect(getTransportLabel('')).toBe('Autobús');
  });

  it('should return default "Autobús" for unknown types', () => {
    expect(getTransportLabel('UnknownType')).toBe('Autobús');
    expect(getTransportLabel('UnknownTransport')).toBe('Autobús');
  });
});
