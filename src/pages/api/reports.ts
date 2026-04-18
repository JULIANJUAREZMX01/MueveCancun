import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * GET: Obtener lista de reportes recientes
 * Actualmente devuelve un array vacío para evitar errores 404 en el cliente.
 */
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify([]), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

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

    // Armonización de campos
    const issue_type = body.issue_type || body.type || "error";
    const description = body.description || body.message || "Sin descripción";
    const route_id = body.route_id || body.route || "Global";
    const location = body.location || "No proporcionada";
    const wasm_version = body.wasm_version || "v1.0.0-stable";

    const title = `[REPORTE] ${issue_type.toUpperCase()}${route_id !== 'Global' ? " — " + route_id : ""}`;

    const labels = [
      "reporte",
      "type:" + (issue_type === 'error' || issue_type === 'Tráfico' ? 'fix' : issue_type === 'mejora' || issue_type === 'Demora' ? 'optimize' : 'feat'),
      "area:" + (route_id !== 'Global' ? 'data' : 'ui'),
      "status:pending-analysis"
    ];

    const issueBody = "### 📝 Descripción\n" + description + "\n\n---\n### 🛠 Metadatos Técnicos\n- **ID de Ruta:** " + route_id + "\n- **Ubicación:** " + location + "\n- **WASM Version:** " + wasm_version + "\n- **Reported via:** Nexus-Client\n- **Timestamp:** " + new Date().toISOString() + "\n\n---\n**Instrucción de Sistema:**\nhey, engineer, please analize, verify, fix & optimize resolving this issue, comment & all about it, right now @jules";

    const res = await fetch("https://api.github.com/repos/" + owner + "/" + repo + "/issues", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "MueveCancun-Nexus-Engine"
      },
      body: JSON.stringify({
        title,
        body: issueBody,
        labels
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error("[API/Reports] GitHub Error:", res.status, errorData);
      return new Response(JSON.stringify({ error: "Failed to create GitHub issue" }), {
        status: res.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const issue = await res.json();
    return new Response(JSON.stringify({ 
      success: true, 
      report_id: issue.number,
      target_branch: "fix/issue-" + issue.number
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: unknown) {
    console.error("[API/Reports] Request Error:", err);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};
