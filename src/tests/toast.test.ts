/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../utils/toast';

describe('showToast Utility', () => {
  const originalWindowShowToast = window.showToast;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    // Reset window.showToast and console.warn mock before each test
    delete window.showToast;
    console.warn = vi.fn();
  });

  afterEach(() => {
    // Restore original functions
    window.showToast = originalWindowShowToast;
    console.warn = originalConsoleWarn;
  });

  it('should call window.showToast when it is defined', () => {
    const mockShowToast = vi.fn();
    window.showToast = mockShowToast;

    const message = 'Success message';
    const type = 'success';
    const duration = 5000;

    showToast(message, type, duration);

    expect(mockShowToast).toHaveBeenCalledWith(message, type, duration);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should call console.warn when window.showToast is not defined', () => {
    const message = 'Fallback message';
    const type = 'error';

    showToast(message, type);

    expect(console.warn).toHaveBeenCalledWith(`[Toast ${type}]: ${message}`);
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
