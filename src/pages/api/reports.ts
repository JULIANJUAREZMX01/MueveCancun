import type { APIRoute } from 'astro';

/**
 * API Endpoint for Citizen Reports (Nexus v1.2)
 * Handles submission of reports to a persistent store or external service.
 * In this implementation, it acts as a lightweight proxy/receiver.
 */

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Log the report (In production, this could send to GitHub, Supabase, or Email)
    console.log('[API/Reports] New Citizen Report received:', {
      type: data.issue_type,
      route: data.route_id,
      timestamp: new Date().toISOString()
    });

    // Mock response for success
    // In a real scenario, we'd integrate with GitHub Issues or a DB here
    return new Response(JSON.stringify({
      success: true,
      report_id: Math.floor(Math.random() * 1000000).toString(),
      message: "Report received successfully"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API/Reports] Error processing report:', error);
    return new Response(JSON.stringify({
      success: false,
      message: "Failed to process report"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
