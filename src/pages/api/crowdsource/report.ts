/**
 * Crowdsource API - User Location Reports
 * Recopila ubicaciones de usuarios en buses/paradas en tiempo real
 */

import type { APIRoute } from 'astro';

export const prerender = false;

interface LocationReport {
  userId: string;
  routeId?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  type: 'bus' | 'stop' | 'unknown';
  speed?: number;
  heading?: number;
  routeName?: string;
  stopName?: string;
}

const reports: LocationReport[] = [];
const MAX_REPORTS = 10000;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json() as LocationReport;

    if (!data.latitude || !data.longitude) {
      return new Response(JSON.stringify({ error: 'Missing coordinates' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!data.userId) {
      data.userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    if (!data.type) {
      data.type = data.speed && data.speed > 5 ? 'bus' : 'stop';
    }

    data.timestamp = Date.now();
    reports.push(data);

    if (reports.length > MAX_REPORTS) {
      reports.splice(0, reports.length - MAX_REPORTS);
    }

    return new Response(JSON.stringify({
      success: true,
      reportId: data.userId,
      timestamp: data.timestamp,
      totalReports: reports.length
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Crowdsource report error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  const routeId = url.searchParams.get('routeId');
  const type = url.searchParams.get('type') as 'bus' | 'stop' | null;
  const minutes = parseInt(url.searchParams.get('minutes') || '30');

  const cutoff = Date.now() - (minutes * 60 * 1000);
  let filtered = reports.filter(r => r.timestamp > cutoff);

  if (routeId) filtered = filtered.filter(r => r.routeId === routeId);
  if (type) filtered = filtered.filter(r => r.type === type);

  return new Response(JSON.stringify({
    reports: filtered,
    count: filtered.length,
    timeWindow: `${minutes} minutes`
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
