import { escapeHtml, safeJsonStringify } from './utils';
import { getTransportLabel } from './transport';

export function renderBestResultHtml(journey: any, isBest: boolean = false, ui: any): string {
    const route = journey.legs[0];
    const badgesHtml = route.badges ? route.badges.map((b: string) => `<span class="badge-primary" style="font-size: 0.5625rem;">${escapeHtml(b)}</span>`).join('') : '';

    let stopsPreview = `${escapeHtml(route.origin_hub)} → ${escapeHtml(route.dest_hub)}`;
    if (route.stops && route.stops.length > 0) {
         stopsPreview = `${escapeHtml(route.stops[0].name)} → ${escapeHtml(route.stops[route.stops.length - 1].name)}`;
    }

    return `
      <div class="glass-card active:scale-[0.98] transition-all duration-300 mb-4 animate-slide-up relative overflow-hidden group hover:-translate-y-0.5 ${isBest ? 'ring-2 ring-primary-500/30' : ''}">
        ${isBest ? `<div class="absolute top-0 right-0 bg-primary-500 text-white text-xxs font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10">${ui['calc.best'] || 'BEST'}</div>` : ''}
        <div class="flex justify-between items-start">
          <div class="flex-1 min-w-0 pr-2">
            <span class="badge-primary mb-2">
              ${escapeHtml(getTransportLabel(route.transport_type))}
            </span>
            <h3 class="font-display font-black text-base leading-tight tracking-tight group-hover:text-primary-500 transition-colors truncate" style="color: var(--text-primary);">${escapeHtml(route.name)}</h3>

            <div class="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5 text-xxs font-bold uppercase tracking-widest" style="color: var(--text-tertiary);">
                ${route.operator ? `<div class="flex items-center gap-1"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4S4 2.5 4 6v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg> <span>${escapeHtml(route.operator)}</span></div>` : ''}
                ${route.frequency ? `<div class="flex items-center gap-1"><svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg> <span>${escapeHtml(route.frequency)}</span></div>` : ''}
            </div>

            <div class="flex gap-1.5 mt-3 flex-wrap">
               ${badgesHtml}
            </div>
          </div>
          <div class="text-right shrink-0 flex flex-col items-end pl-3" style="border-left: 1px solid var(--border-light);">
            <span class="price-tag">
                $${(journey.total_price || 0).toFixed(2)}
            </span>
            <p class="text-xxs font-black mt-2 uppercase tracking-tight" style="color: var(--text-tertiary);">${escapeHtml(route.duration || '')}</p>

            <button class="btn-primary btn-sm mt-3 whitespace-nowrap view-map-btn" data-journey='${safeJsonStringify(journey)}'>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg> <span data-i18n="calc.results.map">${ui['calc.results.map'] || 'Ver Mapa'}</span>
            </button>
          </div>
        </div>
        <div class="mt-3 pt-3 text-xxs font-bold flex items-center gap-2 uppercase tracking-widest" style="border-top: 1px solid var(--border-light); color: var(--text-tertiary);">
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/></svg> <span class="truncate flex-1">${stopsPreview}</span>
        </div>
      </div>
    `;
}

export function renderTransferCardHtml(journey: any, isBest: boolean = false, ui: any): string {
    const leg1 = journey.legs[0];
    const leg2 = journey.legs[1];
    const transferPoint = journey.transfer_point;

    return `
      <div class="glass-card active:scale-[0.98] transition-all mb-3 animate-slide-up relative overflow-hidden group ${isBest ? 'ring-2 ring-primary-500/30' : ''}">
        <div class="absolute top-0 right-0 bg-accent-500 text-white px-3 py-1 rounded-bl-xl text-xxs font-black uppercase tracking-widest ${isBest ? 'mr-24' : ''}">
           ${ui['calc.transfer'] || 'TRANSFER'}
        </div>
        ${isBest ? `<div class="absolute top-0 right-0 bg-primary-500 text-white text-xxs font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest z-10">${ui['calc.best'] || 'BEST'}</div>` : ''}

        <div class="flex flex-col gap-3 mt-5">
            <!-- Leg 1 -->
            <div class="flex items-center gap-3">
                <div class="flex-shrink-0 w-8 text-center">
                    <span class="w-3 h-3 rounded-full bg-success-500 border-2 border-white dark:border-slate-900 shadow-md mx-auto block"></span>
                    <div class="h-6 w-0.5 mx-auto my-0.5 rounded-full" style="background: var(--border-light);"></div>
                </div>
                <div>
                     <span class="badge-primary" style="font-size: 0.5rem;">
                        ${escapeHtml(getTransportLabel(leg1.transport_type))}
                     </span>
                     <h4 class="font-display font-black text-sm leading-tight tracking-tight" style="color: var(--text-primary);">${escapeHtml(leg1.name)}</h4>
                </div>
            </div>

            <!-- Transfer point -->
            <div class="flex items-center gap-3 -mt-2">
                <div class="flex-shrink-0 w-8 text-center flex justify-center">
                    <div class="w-2.5 h-2.5 rounded-full bg-accent-500 border-2 border-white dark:border-slate-900 shadow-md ring-2 ring-accent-500/20 animate-pulse"></div>
                </div>
                <div class="chip text-xxs">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                    <span data-i18n="calc.results.transfer_at">${ui['calc.results.transfer_at'] || 'Transfer at'}</span> <span class="text-primary-500 font-black ml-1">${escapeHtml(transferPoint)}</span>
                </div>
            </div>

            <!-- Leg 2 -->
            <div class="flex items-center gap-3 -mt-2">
                <div class="flex-shrink-0 w-8 text-center">
                    <div class="h-6 w-0.5 mx-auto my-0.5 rounded-full" style="background: var(--border-light);"></div>
                    <span class="w-3 h-3 rounded-full bg-danger-500 border-2 border-white dark:border-slate-900 shadow-md mx-auto block"></span>
                </div>
                <div>
                     <span class="badge-accent" style="font-size: 0.5rem;">
                        ${escapeHtml(getTransportLabel(leg2.transport_type))}
                     </span>
                     <h4 class="font-display font-black text-sm leading-tight tracking-tight" style="color: var(--text-primary);">${escapeHtml(leg2.name)}</h4>
                </div>
            </div>
        </div>

        <div class="mt-4 pt-3 flex justify-between items-center" style="border-top: 1px solid var(--border-light);">
            <span class="price-tag">
                $${(journey.total_price || 0).toFixed(2)}
            </span>

            <button class="btn-primary btn-sm view-map-btn"
                data-journey='${safeJsonStringify(journey)}'>
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg> <span data-i18n="calc.view_route">${ui['calc.view_route'] || 'View Route'}</span>
            </button>
        </div>
      </div>
  `;
}
