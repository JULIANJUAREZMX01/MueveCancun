/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RouteSearch from './RouteSearch';

afterEach(() => {
  cleanup();
});

describe('RouteSearch', () => {
  it('renders the search inputs', () => {
    render(
      <RouteSearch
        from=""
        to=""
        onFromChange={() => {}}
        onToChange={() => {}}
        onSearch={() => {}}
        onSwap={() => {}}
        loading={false}
      />
    );
    expect(screen.getByPlaceholderText('Ej: Av. Tulum y Cobá')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: Coco Bongo')).toBeInTheDocument();
  });

  it('calls onSearch when button is clicked', () => {
    const onSearch = vi.fn();
    render(
      <RouteSearch
        from="A"
        to="B"
        onFromChange={() => {}}
        onToChange={() => {}}
        onSearch={onSearch}
        onSwap={() => {}}
        loading={false}
      />
    );
    const button = screen.getByRole('button', { name: /Buscar Ruta/i });
    fireEvent.click(button);
    expect(onSearch).toHaveBeenCalled();
  });

  it('calls onSwap when swap button is clicked', () => {
    const onSwap = vi.fn();
    render(
      <RouteSearch
        from="A"
        to="B"
        onFromChange={() => {}}
        onToChange={() => {}}
        onSearch={() => {}}
        onSwap={onSwap}
        loading={false}
      />
    );
    const swapButton = screen.getByLabelText('Intercambiar origen y destino');
    fireEvent.click(swapButton);
    expect(onSwap).toHaveBeenCalled();
  });
});
