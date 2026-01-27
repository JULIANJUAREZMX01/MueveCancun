/** @vitest-environment jsdom */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RouteSearch from './RouteSearch';

afterEach(() => {
  cleanup();
});

describe('RouteSearch', () => {
  it('renders the search input', () => {
    render(<RouteSearch onSearch={() => {}} />);
    expect(screen.getByPlaceholderText('¿A dónde vas?')).toBeInTheDocument();
  });

  it('calls onSearch when input changes', () => {
    const onSearch = vi.fn();
    render(<RouteSearch onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('¿A dónde vas?');
    fireEvent.change(input, { target: { value: 'R1' } });
    expect(onSearch).toHaveBeenCalledWith('R1');
  });
});
