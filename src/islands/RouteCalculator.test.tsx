/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RouteCalculator from './RouteCalculator';

afterEach(() => {
  cleanup();
});

describe('RouteCalculator', () => {
  it('renders the main heading', async () => {
    render(<RouteCalculator />);
    // Wait for the loading or main content
    const element = await screen.findByRole('heading', { name: /Encuentra tu Ruta/i });
    expect(element).toBeInTheDocument();
  });
});
