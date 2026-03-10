import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showToast } from '../utils/toast';

describe('showToast Utility', () => {
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    console.warn = originalConsoleWarn;
    vi.clearAllMocks();
  });

  it('should call window.showToast with correct arguments if available', () => {
    const mockShowToast = vi.fn();
    vi.stubGlobal('window', { showToast: mockShowToast });

    showToast('Test message', 'success', 5000);

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('Test message', 'success', 5000);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should call window.showToast with default arguments if omitted', () => {
    const mockShowToast = vi.fn();
    vi.stubGlobal('window', { showToast: mockShowToast });

    showToast('Test message');

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('Test message', 'info', 3000);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should fallback to console.warn if window is defined but window.showToast is not', () => {
    vi.stubGlobal('window', {});

    showToast('Fallback message', 'error', 4000);

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('[Toast error]: Fallback message');
  });

  it('should fallback to console.warn with default type if window.showToast is not defined', () => {
    vi.stubGlobal('window', {});

    showToast('Fallback message');

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('[Toast info]: Fallback message');
  });

  it('should fallback to console.warn if typeof window is undefined (e.g., SSR)', () => {
    // Stub window to undefined
    vi.stubGlobal('window', undefined);

    showToast('SSR message', 'warning');

    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith('[Toast warning]: SSR message');
  });
});
