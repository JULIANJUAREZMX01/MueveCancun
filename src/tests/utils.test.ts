import { describe, it, expect } from 'vitest';
import { escapeHtml, safeJsonStringify, getDistance, truncateText } from '../utils/utils';

describe('escapeHtml Utility', () => {
  it('should escape HTML characters in strings', () => {
    const unsafe = '<script>alert("xss")</script>';
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    expect(escapeHtml(unsafe)).toBe(expected);
  });

  it('should handle null and undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should handle numbers by converting to string', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(0)).toBe('0');
  });

  it('should handle booleans', () => {
    expect(escapeHtml(true)).toBe('true');
    expect(escapeHtml(false)).toBe('false');
  });

  it('should handle objects by using toString', () => {
    const obj = { toString: () => 'custom' };
    expect(escapeHtml(obj)).toBe('custom');
  });

  it('should escape specific characters correctly', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#039;');
  });

  it('should handle multiple special characters', () => {
    expect(escapeHtml('<div class="test">Bob\'s & Alice\'s</div>'))
      .toBe('&lt;div class=&quot;test&quot;&gt;Bob&#039;s &amp; Alice&#039;s&lt;/div&gt;');
  });
});

describe('safeJsonStringify Utility', () => {
  it('should escape < and \' in JSON strings', () => {
    const unsafe = { key: "<script>alert('xss')</script>" };
    const expected = '{"key":"\\u003cscript>alert(\\u0027xss\\u0027)\\u003c/script>"}';
    expect(safeJsonStringify(unsafe)).toBe(expected);
  });

  it('should handle complex objects', () => {
    const obj = {
        html: '<div class="foo">\'Bar\'</div>',
        arr: ["<One>", "'Two'"]
    };
    const expected = '{"html":"\\u003cdiv class=\\"foo\\">\\u0027Bar\\u0027\\u003c/div>","arr":["\\u003cOne>","\\u0027Two\\u0027"]}';
    expect(safeJsonStringify(obj)).toBe(expected);
  });
});

describe('getDistance Utility', () => {
  it('should calculate distance between two identical points as 0', () => {
    const lat = 48.8566;
    const lon = 2.3522;
    expect(getDistance(lat, lon, lat, lon)).toBe(0);
  });

  it('should calculate correct distance between known points', () => {
    // Paris
    const lat1 = 48.8566;
    const lon1 = 2.3522;
    // London
    const lat2 = 51.5074;
    const lon2 = -0.1278;

    // The expected distance is around ~343-344 km
    const distance = getDistance(lat1, lon1, lat2, lon2);
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(345);
  });

  it('should calculate correct distance across the equator', () => {
    // New York
    const lat1 = 40.7128;
    const lon1 = -74.0060;
    // Buenos Aires
    const lat2 = -34.6037;
    const lon2 = -58.3816;

    // Distance should be ~8500 km
    const distance = getDistance(lat1, lon1, lat2, lon2);
    expect(distance).toBeGreaterThan(8400);
    expect(distance).toBeLessThan(8600);
  });

  it('should calculate correct distance across the prime meridian', () => {
     // Madrid
     const lat1 = 40.4168;
     const lon1 = -3.7038;
     // Barcelona
     const lat2 = 41.3851;
     const lon2 = 2.1734;

     // Distance is roughly ~500 km
     const distance = getDistance(lat1, lon1, lat2, lon2);
     expect(distance).toBeGreaterThan(490);
     expect(distance).toBeLessThan(515);
  });
});

describe('truncateText Utility', () => {
  it('should return original string if length is less than or equal to maxLength', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
    expect(truncateText('Hello World', 11)).toBe('Hello World');
  });

  it('should return trimmed string if trimmed length is less than or equal to maxLength', () => {
    expect(truncateText('Hello World   ', 11)).toBe('Hello World');
  });

  it('should truncate and add ellipsis when string exceeds maxLength', () => {
    expect(truncateText('Hello World', 5)).toBe('Hell…');
    expect(truncateText('A very long string that needs truncating', 15)).toBe('A very long st…');
  });

  it('should trim trailing spaces before adding ellipsis', () => {
    // Cutoff at 6: "Hello " -> trims to "Hello" -> adds "…"
    expect(truncateText('Hello World', 6)).toBe('Hello…');
  });

  it('should handle empty strings', () => {
    expect(truncateText('', 5)).toBe('');
  });

  it('should handle maxLength less than or equal to ellipsis length (1)', () => {
    // Cutoff = 1 - 1 = 0
    expect(truncateText('A', 1)).toBe('A');
    expect(truncateText('AB', 1)).toBe('…'); // slice(0, 0) + '…'
  });
});
