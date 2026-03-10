// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../utils/toast';

describe('showToast Utility', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    // Stub global showToast and spy on console.warn before each test
    vi.stubGlobal('showToast', undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original functions and globals
    consoleWarnSpy?.mockRestore();
    vi.unstubAllGlobals();
  });

  it('should call window.showToast when it is defined', () => {
    const mockShowToast = vi.fn();
    window.showToast = mockShowToast;

    const message = 'Success message';
    const type = 'success';
    const duration = 5000;

    showToast(message, type, duration);

    expect(mockShowToast).toHaveBeenCalledWith(message, type, duration);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should call console.warn when window.showToast is not defined', () => {
    const message = 'Fallback message';
    const type = 'error';

    showToast(message, type);

    expect(consoleWarnSpy).toHaveBeenCalledWith(`[Toast ${type}]: ${message}`);
  });

  it('should use default values for type and duration', () => {
    const mockShowToast = vi.fn();
    window.showToast = mockShowToast;

    const message = 'Default parameters message';

    showToast(message);

    // Default type is 'info', default duration is 3000
    expect(mockShowToast).toHaveBeenCalledWith(message, 'info', 3000);
  });

  it('should handle all toast types correctly', () => {
    const mockShowToast = vi.fn();
    window.showToast = mockShowToast;

    const types: Array<'success' | 'error' | 'warning' | 'info'> = ['success', 'error', 'warning', 'info'];

    types.forEach((type) => {
      showToast('test', type);
      expect(mockShowToast).toHaveBeenCalledWith('test', type, 3000);
      mockShowToast.mockClear();
    });
  });
});
