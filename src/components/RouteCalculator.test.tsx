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
    render(
      <RouteCalculator
        from=""
        to=""
        onFromChange={() => {}}
        onToChange={() => {}}
        onSearch={() => {}}
        onSwap={() => {}}
        loading={false}
        balance={200}
      />
    );
    expect(screen.getByPlaceholderText('Ej: Av. Tulum y Cobá')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: Coco Bongo')).toBeInTheDocument();
  });

  it('calls onSearch when button is clicked', () => {
    const onSearch = vi.fn();
    render(
      <RouteCalculator
        from="A"
        to="B"
        onFromChange={() => {}}
        onToChange={() => {}}
        onSearch={onSearch}
        onSwap={() => {}}
        loading={false}
        balance={200}
      />
    );
    const button = screen.getByRole('button', { name: /Trazar Ruta/i });
    fireEvent.click(button);
    expect(onSearch).toHaveBeenCalled();
  });

  it('calls onSwap when swap button is clicked', () => {
    const onSwap = vi.fn();
    render(
      <RouteCalculator
        from="A"
        to="B"
        onFromChange={() => {}}
        onToChange={() => {}}
        onSearch={() => {}}
        onSwap={onSwap}
        loading={false}
        balance={200}
      />
    );
    const swapButton = screen.getByLabelText('Intercambiar origen y destino');
    fireEvent.click(swapButton);
    expect(onSwap).toHaveBeenCalled();
  });

  it('disables search button if balance is below 180', () => {
    const onSearch = vi.fn();
    render(
      <RouteCalculator
        from="A"
        to="B"
        onFromChange={() => {}}
        onToChange={() => {}}
        onSearch={onSearch}
        onSwap={() => {}}
        loading={false}
        balance={150}
      />
    );
    const button = screen.getByRole('button', { name: /Trazar Ruta \(Bloqueado\)/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSearch).not.toHaveBeenCalled();
  });
});
