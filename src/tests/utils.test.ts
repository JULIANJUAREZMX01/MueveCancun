import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../utils/utils';

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
