import type { APIRoute } from 'astro';

export const prerender = false;

const SEED_REPORTS = [
  {
    id: "seed_001",
    type: "Precio",
    route: "Zona Hotelera",
    message: "Los camiones de Zona Hotelera cobran $12 tanto el convencional como el de aire acondicionado.",
    author: "Comunidad",
    votes: 14,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: "seed_002",
    type: "Precio",
    route: "Combi / Urbano",
    message: "Las combis cobran $10, los camiones de zona urbana también $10. Corrección de tarifas.",
    author: "Esteban H.",
    votes: 22,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: "seed_003",
    type: "Ruta",
    route: "R-10",
    message: "La R-10 Las Américas — Aeropuerto en realidad no llega al aeropuerto. Llega a Las Américas (Trabajadores).",
    author: "MÍSTICO_",
    votes: 31,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString()
  },
  {
    id: "seed_004",
    type: "Noticia",
    route: "General",
    message: "¿Hay transporte de Las Américas al aeropuerto? Confirmado: la Combi Roja IRM-6 cobra $10, va de Ultramar a Crucero pasando por ZH.",
    author: "Darwin G.",
    votes: 8,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString()
  },
  {
    id: "seed_005",
    type: "Demora",
    route: "R-6",
    message: "La R-6 solo pasa hasta las 10pm. Tengan cuidado si necesitan regresar de noche.",
    author: "Grecia P.",
    votes: 19,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  }
];

/**
 * GET: Obtener lista de reportes recientes
 * Devuelve seed data real de la comunidad mientras no hay backend persistente.
 */
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(SEED_REPORTS), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60"
    }
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
