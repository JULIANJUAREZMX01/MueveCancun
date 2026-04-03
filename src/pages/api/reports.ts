import type { APIRoute } from 'astro';

export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const { route_id, issue_type, description } = body;

    // Validations
    if (!route_id || !issue_type || !description) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          code: 'INVALID_INPUT',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // MOCK: Save report
    // In a future PR, this will create a GitHub Issue
    console.log('✅ Report saved:', {
        route_id,
        issue_type,
        description,
        timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Report submitted successfully (Mock)',
        report_id: `rep_${Date.now()}`
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Reports error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to submit report',
        code: 'REPORT_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const GET: APIRoute = async () => {
    return new Response(
        JSON.stringify({ status: 'API is running' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
};
