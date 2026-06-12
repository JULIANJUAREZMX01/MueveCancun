import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../pages/api/map-tile/[z]/[x]/[y].png';

afterEach(() => vi.unstubAllGlobals());

describe('/api/map-tile', () => {
  it('rejects invalid coordinates without contacting upstream', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = await GET({ params: { z: '20', x: '0', y: '0' } } as never);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proxies and caches a valid tile', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), {
      status: 200, headers: { 'Content-Type': 'image/png' },
    })));
    const response = await GET({ params: { z: '13', x: '2118', y: '3649' } } as never);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Map-Source')).toBe('carto-voyager-proxy');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=604800');
  });
});
