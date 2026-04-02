import { LitElement, html, css } from 'lit';

/**
 * LitBadge — A reusable badge Web Component for displaying route IDs and labels.
 *
 * Usage:
 *   <lit-badge variant="primary">R1</lit-badge>
 *   <lit-badge variant="secondary">Bus Urbano</lit-badge>
 *
 * Color tokens from the Tailwind theme are surfaced via CSS custom properties
 * so host pages can override them (e.g. for dark-mode).
 * Defaults match: primary-100 / primary-700 (#FFEDD5 / #C2410C) and
 * slate-100 / slate-600 (#F1F5F9 / #475569).
 */

const ALLOWED_VARIANTS = new Set(['primary', 'secondary']);

export class LitBadge extends LitElement {
  static properties = {
    variant: { type: String },
  };

  variant: string = 'primary';

  static styles = css`
    :host {
      display: inline-block;
    }
    .badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.625rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .badge--primary {
      background-color: var(--lit-badge-primary-bg, #FFEDD5);
      color: var(--lit-badge-primary-fg, #C2410C);
    }
    .badge--secondary {
      background-color: var(--lit-badge-secondary-bg, #F1F5F9);
      color: var(--lit-badge-secondary-fg, #475569);
    }
  `;

  render() {
    const safeVariant = ALLOWED_VARIANTS.has(this.variant) ? this.variant : 'primary';
    return html`<span class="badge badge--${safeVariant}"><slot></slot></span>`;
  }
}

customElements.define('lit-badge', LitBadge);

declare global {
  interface HTMLElementTagNameMap {
    'lit-badge': LitBadge;
  }
}
