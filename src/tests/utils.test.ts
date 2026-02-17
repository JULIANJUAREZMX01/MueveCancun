import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../lib/utils';

describe('escapeHtml Utility', () => {
  it('should return empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should return original string if no special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('should escape &', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape <', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('should escape >', () => {
    expect(escapeHtml('1 > 2')).toBe('1 &gt; 2');
  });

  it('should escape "', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('should escape \'', () => {
    expect(escapeHtml("'single'")).toBe('&#039;single&#039;');
  });

  it('should handle multiple special characters', () => {
    expect(escapeHtml('<div class="test">Bob\'s & Alice\'s</div>'))
      .toBe('&lt;div class=&quot;test&quot;&gt;Bob&#039;s &amp; Alice&#039;s&lt;/div&gt;');
  });

  it('should handle numbers by converting to string', () => {
    // Ideally types prevent this, but at runtime it might happen
    // The implementation uses String(unsafe), so it should work
    expect(escapeHtml(123 as unknown as string)).toBe('123');
  });
});
