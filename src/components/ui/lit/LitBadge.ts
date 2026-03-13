import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('lit-badge')
export class LitBadge extends LitElement {
  @property({ type: String }) variant = 'default';

  static styles = css`
    :host {
      display: inline-block;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.625rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .default {
      background-color: var(--surface-hover, #f1f5f9);
      color: var(--text-secondary, #64748b);
    }

    .primary {
      background-color: var(--color-sunset, #f97316);
      color: white;
    }

    .success {
      background-color: var(--color-mint, #10b981);
      color: white;
    }

    .danger {
      background-color: var(--color-coral, #f43f5e);
      color: white;
    }
  `;

  render() {
    return html`
      <span class="badge ${this.variant}">
        <slot></slot>
      </span>
    `;
  }
}
