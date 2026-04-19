export const prerender = true;

export async function GET() {
  return new Response(
    'google-site-verification: google97193634d314b29e.html',
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    }
  );
}
