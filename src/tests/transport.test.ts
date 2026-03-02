import { expect, test } from 'vitest';
import { getTransportLabel } from '../utils/transport';

test('getTransportLabel handles exact matches', () => {
  expect(getTransportLabel('Bus')).toBe('Autobús');
  expect(getTransportLabel('Combi')).toBe('Combi');
  expect(getTransportLabel('Van')).toBe('Van / Colectivo');
});

test('getTransportLabel handles fuzzy matches', () => {
  expect(getTransportLabel('ADO_Platinum')).toBe('ADO');
  expect(getTransportLabel('Combi_XYZ')).toBe('Combi');
  expect(getTransportLabel('Van_Express')).toBe('Van / Colectivo');
});

test('getTransportLabel handles fallback', () => {
  expect(getTransportLabel('UnknownType')).toBe('UnknownType');
});

test('getTransportLabel handles null/undefined', () => {
  expect(getTransportLabel(null)).toBe('Autobús'); // Default
  expect(getTransportLabel(undefined)).toBe('Autobús'); // Default
});
