/**
 * virtualList — DOM recycling for large lists.
 *
 * Renders only the items visible in the viewport + overscan buffer,
 * dramatically reducing layout work on long route lists (200+ cards).
 *
 * Usage:
 *   const vl = new VirtualList(container, items, renderItem, { itemHeight: 88 });
 *   vl.mount();
 *   // on filter: vl.setItems(filteredItems);
 *   // cleanup:  vl.destroy();
 *
 * Requirements:
 *   - container must have a fixed height + overflow-y: auto (or scroll).
 *   - renderItem(item, index) must return an HTMLElement.
 *   - itemHeight: estimated row height in px (affects spacer; can be dynamic).
 */

export interface VirtualListOptions {
  /** Estimated height of each item in px (default: 88). */
  itemHeight?: number;
  /** Extra rows to render above/below viewport (default: 3). */
  overscan?: number;
  /** Called when visible slice changes (optional, for analytics). */
  onRangeChange?: (start: number, end: number) => void;
}

export class VirtualList<T> {
  private items: T[] = [];
  private readonly renderItem: (item: T, index: number) => HTMLElement;
  private readonly container: HTMLElement;
  private readonly opts: Required<VirtualListOptions>;

  private spacerTop!: HTMLDivElement;
  private spacerBottom!: HTMLDivElement;
  private rendered: Map<number, HTMLElement> = new Map();
  private _rafId = 0;
  private _lastStart = -1;
  private _lastEnd = -1;
  private _destroyed = false;

  constructor(
    container: HTMLElement,
    items: T[],
    renderItem: (item: T, index: number) => HTMLElement,
    options: VirtualListOptions = {},
  ) {
    this.container  = container;
    this.items      = items;
    this.renderItem = renderItem;
    this.opts = {
      itemHeight:    options.itemHeight    ?? 88,
      overscan:      options.overscan      ?? 3,
      onRangeChange: options.onRangeChange ?? (() => {}),
    };
  }

  mount(): void {
    this.container.style.position = 'relative';

    this.spacerTop = document.createElement('div');
    this.spacerTop.style.cssText = 'width:100%;pointer-events:none';
    this.spacerBottom = document.createElement('div');
    this.spacerBottom.style.cssText = 'width:100%;pointer-events:none';

    this.container.innerHTML = '';
    this.container.appendChild(this.spacerTop);
    this.container.appendChild(this.spacerBottom);

    this.container.addEventListener('scroll', this._onScroll, { passive: true });
    this._render();
  }

  setItems(items: T[]): void {
    this.items = items;
    this._lastStart = -1; // force full re-render
    this._render();
  }

  destroy(): void {
    this._destroyed = true;
    cancelAnimationFrame(this._rafId);
    this.container.removeEventListener('scroll', this._onScroll);
    this.rendered.clear();
  }

  private readonly _onScroll = (): void => {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(() => this._render());
  };

  private _render(): void {
    if (this._destroyed) return;
    const { itemHeight, overscan, onRangeChange } = this.opts;
    const total  = this.items.length;
    const scrollTop   = this.container.scrollTop;
    const viewHeight  = this.container.clientHeight;

    const rawStart = Math.floor(scrollTop / itemHeight) - overscan;
    const rawEnd   = Math.ceil((scrollTop + viewHeight) / itemHeight) + overscan;
    const start    = Math.max(0, rawStart);
    const end      = Math.min(total - 1, rawEnd);

    if (start === this._lastStart && end === this._lastEnd) return;
    this._lastStart = start;
    this._lastEnd   = end;

    // Update spacers
    this.spacerTop.style.height    = `${start * itemHeight}px`;
    this.spacerBottom.style.height = `${(total - end - 1) * itemHeight}px`;

    // Remove out-of-range nodes
    for (const [i, el] of this.rendered.entries()) {
      if (i < start || i > end) {
        el.remove();
        this.rendered.delete(i);
      }
    }

    // Add new in-range nodes
    for (let i = start; i <= end; i++) {
      if (!this.rendered.has(i)) {
        const el = this.renderItem(this.items[i]!, i);
        this.rendered.set(i, el);
        // Insert before spacerBottom to keep order
        this.container.insertBefore(el, this.spacerBottom);
      }
    }

    onRangeChange(start, end);
  }
}
