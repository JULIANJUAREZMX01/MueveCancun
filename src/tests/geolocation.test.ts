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
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
      success(mockPosition);
    });

    const position = await getCurrentPosition();
    expect(position).toEqual(mockPosition);
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.unknown(Function),
      expect.unknown(Function),
      expect.objectContaining({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      })
    );
  });

  it('should reject when geolocation fails', async () => {
    const mockError = {
      code: 1,
      message: 'User denied Geolocation',
    };

    mockGeolocation.getCurrentPosition.mockImplementationOnce((success, error) => {
      error(mockError);
    });

    await expect(getCurrentPosition()).rejects.toEqual(mockError);
  });

  it('should use correct geolocation options', async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
      success({});
    });

    await getCurrentPosition();

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
      expect.unknown(Function),
      expect.unknown(Function),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
});
