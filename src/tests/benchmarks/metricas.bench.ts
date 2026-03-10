import { describe, bench } from 'vitest';

function isSameDay(d: Date, ts: number): boolean {
  const t = new Date(ts);
  return t.getFullYear() === d.getFullYear() &&
         t.getMonth() === d.getMonth() &&
         t.getDate() === d.getDate();
}

function generateStops(n: number) {
  const stops = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    stops.push({
      id: i,
      status: Math.random() > 0.5 ? 'completed' : 'pending',
      completedAt: Math.random() > 0.5 ? now - Math.random() * 10 * 86400000 : undefined,
      income: Math.random() * 100
    });
  }
  return stops;
}

const stops = generateStops(5000);
const weekDays = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - i);
  return d;
});

describe('metricas optimization', () => {
  bench('original', () => {
    const dayCounts = weekDays.map(day => ({
      day,
      count:  stops.filter(s => s.status === 'completed' && s.completedAt && isSameDay(day, s.completedAt)).length,
      income: stops.filter(s => s.status === 'completed' && s.completedAt && isSameDay(day, s.completedAt))
                   .reduce((sum, s) => sum + (s.income ?? 0), 0),
    }));
  });

  bench('optimized - pre-filter and for...of loop', () => {
    const completedStops = stops.filter(s => s.status === 'completed' && s.completedAt);
    const dayCounts = weekDays.map(day => {
      let count = 0;
      let income = 0;
      for (const s of completedStops) {
        if (isSameDay(day, s.completedAt!)) {
          count++;
          income += s.income ?? 0;
        }
      }
      return { day, count, income };
    });
  });
});
