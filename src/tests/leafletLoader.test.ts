import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('loadLeaflet', () => {
  let appendChildMock: any;
  let elements: Record<string, any>;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    appendChildMock = vi.fn((el: any) => {
      // Store reference to trigger onload/onerror later
      if (el.href) elements['link'] = el;
      if (el.src) elements['script'] = el;
    });
    elements = {};

    const createElementMock = vi.fn((tag: string) => {
      const el: any = { remove: vi.fn() };
      return el;
    });

    vi.stubGlobal('document', {
      createElement: createElementMock,
      head: { appendChild: appendChildMock },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should resolve immediately if window is undefined (SSR)', async () => {
    vi.stubGlobal('window', undefined);
    const { loadLeaflet } = await import('../utils/leafletLoader');
    await expect(loadLeaflet()).resolves.toBeUndefined();
    expect(appendChildMock).not.toHaveBeenCalled();
  });

  it('should resolve immediately if window.L exists', async () => {
    vi.stubGlobal('window', { L: {} });
    const { loadLeaflet } = await import('../utils/leafletLoader');
    await expect(loadLeaflet()).resolves.toBeUndefined();
    expect(appendChildMock).not.toHaveBeenCalled();
  });

  it('should load CSS and JS and resolve', async () => {
    vi.stubGlobal('window', {});
    const { loadLeaflet } = await import('../utils/leafletLoader');

    const promise = loadLeaflet();

    expect(appendChildMock).toHaveBeenCalledTimes(2);
    expect(elements['link'].href).toBe('/vendor/leaflet/leaflet.css');
    expect(elements['link'].rel).toBe('stylesheet');
    expect(elements['script'].src).toBe('/vendor/leaflet/leaflet.js');
    expect(elements['script'].defer).toBe(true);

    // Simulate successful load
    elements['link'].onload();
    vi.stubGlobal('window', { L: {} }); // Mock window.L which should be present after JS loads
    elements['script'].onload();

    await expect(promise).resolves.toBeUndefined();
  });

  it('should return the same promise if called multiple times while loading', async () => {
    vi.stubGlobal('window', {});
    const { loadLeaflet } = await import('../utils/leafletLoader');

    const promise1 = loadLeaflet();
    const promise2 = loadLeaflet();

    expect(promise1).toBe(promise2);
    expect(appendChildMock).toHaveBeenCalledTimes(2); // Only one set of elements created

    elements['link'].onload();
    vi.stubGlobal('window', { L: {} });
    elements['script'].onload();

    await Promise.all([promise1, promise2]);
  });

  it('should reject if CSS fails to load and cleanup elements', async () => {
    vi.stubGlobal('window', {});
    const { loadLeaflet } = await import('../utils/leafletLoader');

    const promise = loadLeaflet();

    // Simulate CSS failure
    elements['link'].onerror();
    elements['script'].onload(); // JS might still succeed

    await expect(promise).rejects.toThrow('Failed to load Leaflet CSS');
    expect(elements['link'].remove).toHaveBeenCalled();
    expect(elements['script'].remove).toHaveBeenCalled();
  });

  it('should reject if JS fails to load and cleanup elements', async () => {
    vi.stubGlobal('window', {});
    const { loadLeaflet } = await import('../utils/leafletLoader');

    const promise = loadLeaflet();

    elements['link'].onload();
    // Simulate JS failure
    elements['script'].onerror();

    await expect(promise).rejects.toThrow('Failed to load Leaflet JS');
    expect(elements['link'].remove).toHaveBeenCalled();
    expect(elements['script'].remove).toHaveBeenCalled();
  });

  it('should reject if JS loads but window.L is missing', async () => {
    vi.stubGlobal('window', {});
    const { loadLeaflet } = await import('../utils/leafletLoader');

    const promise = loadLeaflet();

    elements['link'].onload();
    // Simulate JS success but no window.L
    elements['script'].onload();

    await expect(promise).rejects.toThrow('Leaflet script loaded but window.L is missing');
    expect(elements['link'].remove).toHaveBeenCalled();
    expect(elements['script'].remove).toHaveBeenCalled();
  });

  it('should allow retrying after a failure', async () => {
    vi.stubGlobal('window', {});
    const { loadLeaflet } = await import('../utils/leafletLoader');

    const promise1 = loadLeaflet();
    elements['link'].onerror();
    await expect(promise1).rejects.toThrow('Failed to load Leaflet CSS');

    appendChildMock.mockClear();

    const promise2 = loadLeaflet();
    expect(appendChildMock).toHaveBeenCalledTimes(2); // Should create new elements

    elements['link'].onload();
    vi.stubGlobal('window', { L: {} });
    elements['script'].onload();

    await expect(promise2).resolves.toBeUndefined();
  });
});
