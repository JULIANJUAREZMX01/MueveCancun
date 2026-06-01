/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentPosition } from '../utils/geolocation';

describe('getCurrentPosition', () => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      geolocation: mockGeolocation,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should resolve with position when successful', async () => {
    const mockPosition = {
      coords: {
        latitude: 21.1619,
        longitude: -86.8249,
        accuracy: 10
      }
    };

    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
      success(mockPosition);
    });

    const position = await getCurrentPosition();
    expect(position).toEqual({
      lat: 21.1619,
      lng: -86.8249,
      accuracy: 10
    });
  });

  it('should resolve with null when geolocation fails', async () => {
    const mockError = {
      code: 1,
      message: 'User denied Geolocation',
      PERMISSION_DENIED: 1
    };

    mockGeolocation.getCurrentPosition.mockImplementationOnce((success, error) => {
      error(mockError);
    });

    const position = await getCurrentPosition();
    expect(position).toBeNull();
  });

  it('should use correct geolocation options', async () => {
    const mockPosition = {
      coords: { latitude: 0, longitude: 0, accuracy: 0 }
    };
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
      success(mockPosition);
    });

    await getCurrentPosition();

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      })
    );
  });
});
