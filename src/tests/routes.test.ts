/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getAllRoutes, Route } from '../utils/routes';

vi.mock('node:fs/promises');

describe('getAllRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  it('should return empty array if no files and no master routes', async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error('ENOENT'));
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

    const routes = await getAllRoutes();
    expect(routes).toEqual([]);
  });

  it('should read routes from individual files with .rutas property', async () => {
    vi.mocked(fs.readdir).mockResolvedValue(['route1.json'] as any);
    const mockRoute: Route = {
      id: 'test1',
      nombre: 'Test Route 1',
      tarifa: 10,
      paradas: []
    };

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath === 'string' && filePath.endsWith('route1.json')) {
        return JSON.stringify({ rutas: [mockRoute] });
      }
      throw new Error('File not found');
    });

    const routes = await getAllRoutes();
    expect(routes).toEqual([mockRoute]);
    expect(fs.readdir).toHaveBeenCalledTimes(1);
    expect(fs.readFile).toHaveBeenCalledTimes(2); // One for dir, one for master (which fails)
  });

  it('should read routes from individual files with top-level array', async () => {
    vi.mocked(fs.readdir).mockResolvedValue(['route2.json'] as any);
    const mockRoute1: Route = { id: 'test1', nombre: 'Test 1', tarifa: 10, paradas: [] };
    const mockRoute2: Route = { id: 'test2', nombre: 'Test 2', tarifa: 15, paradas: [] };

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath === 'string' && filePath.endsWith('route2.json')) {
        return JSON.stringify([mockRoute1, mockRoute2]);
      }
      throw new Error('File not found');
    });

    const routes = await getAllRoutes();
    expect(routes).toEqual([mockRoute1, mockRoute2]);
  });

  it('should read routes from individual files with single object', async () => {
    vi.mocked(fs.readdir).mockResolvedValue(['route3.json'] as any);
    const mockRoute: Route = { id: 'test1', nombre: 'Test 1', tarifa: 10, paradas: [] };

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath === 'string' && filePath.endsWith('route3.json')) {
        return JSON.stringify(mockRoute);
      }
      throw new Error('File not found');
    });

    const routes = await getAllRoutes();
    expect(routes).toEqual([mockRoute]);
  });

  it('should handle invalid JSON parsing gracefully', async () => {
    vi.mocked(fs.readdir).mockResolvedValue(['valid.json', 'invalid.json'] as any);
    const mockRoute: Route = { id: 'uniqueId123', nombre: 'Test 1', tarifa: 10, paradas: [] };

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath === 'string') {
        if (filePath.endsWith('valid.json')) return JSON.stringify([mockRoute]);
        if (filePath.endsWith('invalid.json')) return '{"invalid": true, missing quote';
        if (filePath.endsWith('master_routes.json')) throw new Error('ENOENT');
      }
      throw new Error('File not found');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const routes = await getAllRoutes();

    const uniqueIds = Array.from(new Set(routes.map(r => r.id)));
    expect(uniqueIds).toHaveLength(1);

    consoleSpy.mockRestore();
  });

  it('should fallback and read master_routes.json if directory read fails', async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error('ENOENT'));

    const mockRoute: Route = { id: 'master1', nombre: 'Master 1', tarifa: 12, paradas: [] };

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath === 'string' && filePath.endsWith('master_routes.json')) {
        return JSON.stringify({ rutas: [mockRoute] });
      }
      throw new Error('File not found');
    });

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const routes = await getAllRoutes();

    expect(routes).toEqual([mockRoute]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Routes directory not accessible or empty, falling back to master_routes.json"
    );
    consoleSpy.mockRestore();
  });

  it('should merge master_routes.json and individual files without duplicating IDs', async () => {
    vi.mocked(fs.readdir).mockResolvedValue(['route1.json'] as any);

    // Both have id 'test1', individual file should win
    const mockIndividualRoute: Route = { id: 'test1', nombre: 'Individual 1', tarifa: 10, paradas: [] };
    const mockMasterRoute1: Route = { id: 'test1', nombre: 'Master 1', tarifa: 10, paradas: [] };
    const mockMasterRoute2: Route = { id: 'test2', nombre: 'Master 2', tarifa: 12, paradas: [] };

    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath === 'string') {
        if (filePath.endsWith('route1.json')) return JSON.stringify([mockIndividualRoute]);
        if (filePath.endsWith('master_routes.json')) return JSON.stringify({ rutas: [mockMasterRoute1, mockMasterRoute2] });
      }
      throw new Error('File not found');
    });

    const routes = await getAllRoutes();

    // Should have individual route for test1, and master route for test2
    expect(routes).toHaveLength(2);
    expect(routes).toContainEqual(mockIndividualRoute);
    expect(routes).toContainEqual(mockMasterRoute2);
    expect(routes).not.toContainEqual(mockMasterRoute1); // The duplicate in master should be skipped
  });
});
