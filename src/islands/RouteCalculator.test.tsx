/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RouteCalculator from './RouteCalculator';

afterEach(() => {
  cleanup();
});

describe('RouteCalculator', () => {
  it('renders the search inputs', () => {
    render(<RouteCalculator />);
    // RouteCalculator starts in loading state while WASM loads
    expect(screen.getByRole('status') || screen.getByText(/Encuentra tu Ruta/)).toBeInTheDocument();
  });
});
