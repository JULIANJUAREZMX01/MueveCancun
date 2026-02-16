## 2026-02-11 - CSS Scroll-Driven Animations
**Learning:** `animation-timeline: scroll()` completely replaces the need for `window.addEventListener('scroll')` to style sticky headers. By defining a keyframe animation that runs based on scroll progress, we can transition background colors and shadows performantly on the compositor thread.
**Action:** Use `animation-timeline: scroll()` for any scroll-linked visual effects (headers, parallax, progress bars) instead of JS observers.

## 2026-02-11 - Popover API & CSS Anchor
**Learning:** The native Popover API (`popover`, `popovertarget`) combined with CSS5 `:has()` selectors allows for complex interactive UI states (like opening a drawer and changing a menu icon) without a single line of client-side JavaScript state management.
**Action:** Always reach for `popover` attributes before `useState` or `document.getElementById` for overlays and menus.
