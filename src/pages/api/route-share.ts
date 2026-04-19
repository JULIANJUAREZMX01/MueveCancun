/**
 * POST /api/route-share
 * Contribucion ciudadana de rutas
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as {
      journey?: import("../../lib/initWasm").Journey;
      origin?: string;
      dest?: string;
      userNote?: string;
      userLocation?: { lat: number; lng: number };
      timestamp?: string;
    };

    const { journey, origin = "?", dest = "?", userNote, userLocation, timestamp } = body;

    if (!origin || !dest) {
      return new Response(JSON.stringify({ error: "origin y dest son requeridos" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = import.meta.env.GITHUB_ISSUES_TOKEN;
    const owner = "JULIANJUAREZMX01";
    const repoName = "MueveCancun";

    // Serializar tramos
    let legsMarkdown = "_No disponible_";
    if (Array.isArray(journey?.legs) && journey.legs.length > 0) {
      const parts: string[] = journey.legs.map((leg: import("../../lib/initWasm").JourneyLeg, i: number) => {
        const stops: import("../../lib/initWasm").RouteEntry["paradas"] = leg.paradas || leg.stops_info || leg.stops || [];
        const stopsStr = stops.length > 0
          ? stops.map((s: unknown) => String(s.nombre || s.name || s)).join(" > ")
          : String(leg.origin_hub || "?") + " > " + String(leg.dest_hub || "?");
        return "**Tramo " + (i + 1) + ":** " + String(leg.name || "Ruta") + " (" + String(leg.transport_type || "?") + ")" + "\n" + stopsStr;

      });
      legsMarkdown = parts.join("\n\n");
    }

    const locationStr = userLocation
      ? "[" + userLocation.lat.toFixed(5) + ", " + userLocation.lng.toFixed(5) + "](https://maps.google.com?q=" + userLocation.lat + "," + userLocation.lng + ")"
      : "No disponible";

    const issueLines = [
      "## Ruta compartida por usuario",
      "",
      "**Origen:** " + origin,
      "**Destino:** " + dest,
      "**Tarifa:** $" + ((journey?.total_price || 0) as number).toFixed(2) + " MXN",
      "**Duracion estimada:** " + String(journey?.duration_minutes || "?") + " min",
      "**Fecha/Hora:** " + (timestamp || new Date().toISOString()),
      "**Ubicacion del usuario:** " + locationStr,
      "",
      "---",
      "",
      "### Tramos de la ruta",
      legsMarkdown,
      "",
      "---",
      "",
      "### Nota del usuario",
      userNote ? "> " + userNote : "_Sin nota_",
    ];
    const issueBody = issueLines.join("\n");
    const issueTitle = "[Ruta Ciudadana] " + origin + " -> " + dest + " - " + new Date().toLocaleDateString("es-MX");

    if (token) {
      const ghRes = await fetch(
        "https://api.github.com/repos/" + owner + "/" + repoName + "/issues",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: issueTitle,
            body: issueBody,
            labels: ["ciudadano", "ruta-compartida"],
          }),
        }
      );

      if (ghRes.ok) {
        const issue = await ghRes.json();
        return new Response(
          JSON.stringify({
            ok: true,
            message: "Tu ruta fue registrada.",
            issueNumber: issue.number,
            issueUrl: issue.html_url,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      console.error("[route-share] GitHub error:", await ghRes.text());
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Aportacion registrada." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("[route-share]", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

export const GET: APIRoute = async () =>
  new Response(
    JSON.stringify({ message: "Usa POST para compartir una ruta ciudadana." }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
