import { escapeHtml, safeJsonStringify } from './utils';
import { getTransportLabel } from './transport';

type UIStrings = Record<string, string>;

interface JourneyLeg {
  name: string;
  transport_type: string;
  badges?: string[];
  origin_hub: string;
  dest_hub: string;
  stops?: { name: string }[];
  operator?: string;
  frequency?: string;
  duration?: string;
}

interface Journey {
  legs: JourneyLeg[];
  total_price: number;
  transfer_point: string;
}

export function renderBestResultHtml(journey: Journey, isBest: boolean = false, ui: UIStrings): string {
    const route = journey.legs[0];
    const badgesHtml = route.badges ? route.badges.map((b: string) => `<span class="c-badge c-badge--caribbean" style="font-size: 8px;">${escapeHtml(b)}</span>`).join('') : '';

    let stopsPreview = `${escapeHtml(route.origin_hub)} → ${escapeHtml(route.dest_hub)}`;
    if (route.stops && route.stops.length > 0) {
         stopsPreview = `${escapeHtml(route.stops[0].name)} → ${escapeHtml(route.stops[route.stops.length - 1].name)}`;
    }

    return `
      <div class="c-route-result ${isBest ? 'c-route-result--on-map' : ''} u-fade-up">
        <div class="c-route-result__header">
          <div class="c-route-result__icon-box">🚌</div>
          <div class="c-route-result__info">
            <span class="c-badge c-badge--caribbean u-margin-b-xs">
              ${escapeHtml(getTransportLabel(route.transport_type))}
            </span>
            <h3 class="c-route-result__title">${escapeHtml(route.name)}</h3>
            <div class="o-flex u-wrap" style="gap: 0.5rem; margin-top: 0.5rem;">
                ${badgesHtml}
            </div>
          </div>
          <div class="c-route-result__price-box">
            <span class="c-route-result__price">$${(journey.total_price || 0).toFixed(2)}</span>
            ${route.duration ? `<span class="c-route-result__duration">${escapeHtml(route.duration)}</span>` : ''}
            <button class="c-btn c-btn--primary view-map-btn" style="padding: 0.4rem 0.8rem; min-height: 32px; font-size: 10px; margin-top: 0.5rem;" data-journey='${safeJsonStringify(journey)}'>
                ${ui['calc.results.map'] || 'Ver Mapa'}
            </button>
          </div>
        </div>
        <div class="c-route-result__stops" style="margin-top: 1rem; font-size: 10px; font-weight: 800; color: var(--text-tertiary); text-transform: uppercase;">
            📍 ${stopsPreview}
        </div>
      </div>
    `;
}

export function renderTransferCardHtml(journey: Journey, isBest: boolean = false, ui: UIStrings): string {
    const leg1 = journey.legs[0];
    const leg2 = journey.legs[1];
    const transferPoint = journey.transfer_point;

    return `
      <div class="c-route-result ${isBest ? 'c-route-result--on-map' : ''} u-fade-up">
        <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: var(--color-accent); margin-bottom: 0.5rem;">🔀 ${ui['calc.transfer'] || 'TRANSBORDO'}</div>

        <div class="o-stack" style="gap: 0.5rem;">
            <div class="o-flex u-align-center">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-success);"></div>
                <div class="u-fs-xs u-fw-black">${escapeHtml(leg1.name)}</div>
            </div>

            <div style="padding-left: 3px; border-left: 2px dashed var(--border-medium); margin-left: 3px; padding-bottom: 0.5rem;">
                <div class="c-badge c-badge--warning" style="font-size: 8px;">Cambio en: ${escapeHtml(transferPoint)}</div>
            </div>

            <div class="o-flex u-align-center">
                <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--color-danger);"></div>
                <div class="u-fs-xs u-fw-black">${escapeHtml(leg2.name)}</div>
            </div>
        </div>

        <div class="o-flex u-justify-between u-align-center" style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--border-light);">
            <span class="c-route-result__price">$${(journey.total_price || 0).toFixed(2)}</span>
            <button class="c-btn c-btn--primary view-map-btn" style="padding: 0.4rem 0.8rem; min-height: 32px; font-size: 10px;" data-journey='${safeJsonStringify(journey)}'>
                ${ui['calc.view_route'] || 'Ver Ruta'}
            </button>
        </div>
      </div>
  `;
}
