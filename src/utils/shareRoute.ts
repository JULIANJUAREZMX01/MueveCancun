/**
 * shareRoute.ts — Funciones de compartir y contribuir rutas
 */

/**
 * Comparte una ruta usando Web Share API o clipboard
 */
export async function shareJourney(journey: any, toast: (msg: string, type: string) => void) {
  const leg    = journey?.legs?.[0];
  const origin = leg?.origin_hub || leg?.paradas?.[0]?.nombre || "Origen";
  const dest   = leg?.dest_hub   || leg?.paradas?.[leg?.paradas?.length - 1]?.nombre || "Destino";
  const price  = journey?.total_price ? `$${Number(journey.total_price).toFixed(2)} MXN` : "";
  const dur    = journey?.duration_minutes ? `⏱️ ${journey.duration_minutes} min` : "";

  const text = [
    "🚌 MueveCancún — Ruta encontrada",
    `📍 ${origin} → ${dest}`,
    price || "",
    dur   || "",
    "",
    `🔗 ${window.location.href}`,
    "#MueveCancún #TransporteCancún #Cancún",
  ].filter(Boolean).join("\n");

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: "MueveCancún", text, url: window.location.href });
      return;
    } catch (e) { console.error(e);/* cancelado */}
  }
  try {
    await navigator.clipboard.writeText(text);
    toast("Ruta copiada al portapapeles 📋", "success");
  } catch (e) { console.error(e);
    toast("No se pudo copiar la ruta", "error");
  }
}

/**
 * Envía la ruta al sistema como contribución ciudadana
 */
export async function contributeRoute(
  journey: any,
  origin: string,
  dest: string,
  userNote: string = "",
  toast: (msg: string, type: string) => void
) {
  try {
    let userLocation: { lat: number; lng: number } | undefined;
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation?.getCurrentPosition(
          (pos) => { userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }; resolve(); },
          () => resolve(),
          { timeout: 3000 }
        );
      });
    } catch (e) { console.error(e);}

    const res = await fetch("/api/route-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        journey,
        origin,
        dest,
        userNote,
        userLocation,
        timestamp: new Date().toISOString(),
      }),
    });

    const data = await res.json();
    if (data.ok) {
      toast("¡Gracias por contribuir! 🙌 Tu ruta fue enviada al equipo.", "success");
    } else {
      toast("Error al enviar: " + (data.error || "intenta de nuevo"), "error");
    }
  } catch (err) {
    console.error("[contributeRoute]", err);
    toast("No se pudo enviar la contribución", "error");
  }
}
