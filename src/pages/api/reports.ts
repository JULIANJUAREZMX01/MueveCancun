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
    const { issue_type, description, route_id, location, wasm_version = "v1.0.0-stable" } = body;

    // Título estandarizado para facilitar el filtrado visual
    const title = `[REPORTE] ${issue_type.toUpperCase()}${route_id ? ` — ${route_id}` : ""}`;

    /**
     * ESTRATEGIA DE ETIQUETADO SEMÁNTICO
     * Estas etiquetas permiten que el workflow de branching organice los directorios y ramas:
     * - type: Define el prefijo de la rama (fix/, optimize/, feat/)
     * - area: Define el directorio afectado para Jules
     */
    const labels = [
      "reporte",
      `type:${issue_type === 'error' ? 'fix' : issue_type === 'mejora' ? 'optimize' : 'feat'}`,
      `area:${route_id ? 'data' : 'ui'}`,
      "status:pending-analysis"
    ];

    /**
     * CONSTRUCCIÓN DEL CUERPO (PROMPT PARA JULES)
     * Incluimos metadatos técnicos y el comentario de invocación forzada.
     */
    const issueBody = `
### 📝 Descripción del Usuario
${description}

---
### 🛠 Metadatos de Ingeniería (Nexus Engine)
- **ID de Ruta:** \`${route_id || "Global"}\`
- **Ubicación:** \`${location || "No proporcionada"}\`
- **WASM Version:** \`${wasm_version}\`
- **Reported via:** \`PWA-Client-Reports\`
- **Timestamp:** \`${new Date().toISOString()}\`

---
**Instrucción de Sistema:**
hey, engineer, please analize, verify, fix & optimize resolving this issue, comment & all about it, right now @jules
`.trim();

    // Creación del Issue
    const res = await fetch(`https://github.com{owner}/${repo}/issues`, {
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
        body: issueBody,
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

    /**
     * BENEFICIO DEL WORKFLOW:
     * Al incluir "@jules" en el cuerpo inicial, el evento de creación del issue
     * disparará automáticamente el handler sin necesidad de comentarios extras.
     */
    console.log(`[API/Reports] Issue #${issue.number} delegated to @jules via body-injection.`);

    return new Response(JSON.stringify({ 
      success: true, 
      report_id: issue.number,
      target_branch: `fix/issue-${issue.number}` 
    }), {
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
