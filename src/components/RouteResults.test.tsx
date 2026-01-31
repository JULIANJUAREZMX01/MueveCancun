/** @vitest-environment jsdom */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import RouteResults from './RouteResults';

afterEach(() => {
  cleanup();
});

describe('RouteResults', () => {
  const mockResults = [
    {
      route_id: 'R1',
      total_time: 25,
      total_cost: 12,
      steps: [
        { instruction: 'Camina a la parada', route: 'Walking', duration: 5 },
        { instruction: 'Toma el bus R1', route: 'R1', duration: 20 },
      ],
    },
  ];

  it('renders bilingual headings and labels', () => {
    render(<RouteResults results={mockResults} />);
    expect(screen.getByText(/Resultados/i)).toBeInTheDocument();
    expect(screen.getByText(/\/ Results/i)).toBeInTheDocument();
    expect(screen.getByText(/Ruta Recomendada/i)).toBeInTheDocument();
    expect(screen.getByText(/\/ Recommended Route/i)).toBeInTheDocument();
  });

  it('renders cost and duration with bilingual suffixes', () => {
    render(<RouteResults results={mockResults} />);
    expect(screen.getByText(/\$12/)).toBeInTheDocument();
    expect(screen.getByText(/MXN/)).toBeInTheDocument();
    expect(screen.getByText(/25 min/)).toBeInTheDocument();
    expect(screen.getByText(/aprox\. \/ approx\./i)).toBeInTheDocument();
  });

  it('uses semantic list elements for route steps', () => {
    render(<RouteResults results={mockResults} />);

    // Check for the ordered list
    const list = screen.getByRole('list', { name: /Pasos de la ruta \/ Route steps/i });
    expect(list).toBeInTheDocument();
    expect(list.tagName).toBe('OL');

    // Check for list items
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByText(/Camina a la parada/i)).toBeInTheDocument();

    // Use getAllByText for multiple steps
    expect(screen.getAllByText(/Duración/i)).toHaveLength(2);
    expect(screen.getAllByText(/\/ Duration/i)).toHaveLength(2);
  });
});
