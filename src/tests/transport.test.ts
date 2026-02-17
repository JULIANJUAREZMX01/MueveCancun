import { describe, it, expect } from 'vitest';
import { getTransportLabel } from '../lib/transport';

describe('getTransportLabel', () => {
  it('should return exact match for known types', () => {
    expect(getTransportLabel('Bus')).toBe('Autobús');
    expect(getTransportLabel('Combi')).toBe('Combi');
    expect(getTransportLabel('Van_Foranea')).toBe('Van Foránea');
    expect(getTransportLabel('Bus_Urbano_Isla')).toBe('Autobús Urbano');
  });

  it('should return fuzzy match for unknown types', () => {
    expect(getTransportLabel('UnknownADO')).toBe('ADO');
    expect(getTransportLabel('SomeCombi')).toBe('Combi');
    expect(getTransportLabel('OtherVan')).toBe('Combi');
  });

  it('should prioritize exact match over fuzzy match', () => {
    // "Van" is in TRANSPORT_LABELS -> "Van / Colectivo"
    // "Van" also matches includes("Van") -> "Combi"
    // Exact match should win
    expect(getTransportLabel('Van')).toBe('Van / Colectivo');
  });

  it('should handle null/undefined/empty', () => {
    expect(getTransportLabel(null)).toBe('Autobús');
    expect(getTransportLabel(undefined)).toBe('Autobús');
    expect(getTransportLabel('')).toBe('Autobús');
  });

  it('should return default for unknown types', () => {
    expect(getTransportLabel('UnknownTransport')).toBe('Autobús');
  });
});
