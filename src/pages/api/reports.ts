import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = import.meta.env.GITHUB_ISSUES_TOKEN;
  const owner = import.meta.env.GITHUB_REPO_OWNER || "JULIANJUAREZMX01";
  const repo = import.meta.env.GITHUB_REPO_NAME || "MueveCancun";

  if (!token) {
    console.error("[API/Reports] GITHUB_ISSUES_TOKEN is not defined");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { issue_type, description, route_id, location } = body;

    const title = `[REPORTE] ${issue_type.toUpperCase()}${route_id ? ` — ${route_id}` : ""}`;

    // Labels for categorization
    const labels = ["reporte", `reporte:${issue_type}`, "estado:pendiente"];

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "MueveCancun-Nexus-Engine"
      },
      body: JSON.stringify({
        title,
        body: description + (location ? `\n\n**Ubicación:** ${location}` : ""),
        labels
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("[API/Reports] GitHub Error:", errorData);
      return new Response(JSON.stringify({ error: "Failed to create GitHub issue" }), {
        status: res.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const issue = await res.json();
    return new Response(JSON.stringify({ success: true, report_id: issue.number }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    console.error("[API/Reports] Request Error:", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};
