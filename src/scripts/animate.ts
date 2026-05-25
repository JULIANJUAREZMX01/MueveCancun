/**
 * MueveCancún Animation Engine v2
 * IntersectionObserver-based scroll animations + micro-interactions
 * Respeta prefers-reduced-motion
 */

export type AnimationType = 'fadeUp' | 'scaleIn' | 'slideRight' | 'slideLeft' | 'none';

interface AnimateOptions {
  type?: AnimationType;
  delay?: number;
  duration?: number;
}

const KEYFRAMES: Record<AnimationType, Keyframe[]> = {
  fadeUp: [
    { opacity: 0, transform: 'translateY(16px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ],
  scaleIn: [
    { opacity: 0, transform: 'scale(0.92)' },
    { opacity: 1, transform: 'scale(1)' }
  ],
  slideRight: [
    { opacity: 0, transform: 'translateX(20px)' },
    { opacity: 1, transform: 'translateX(0)' }
  ],
  slideLeft: [
    { opacity: 0, transform: 'translateX(-20px)' },
    { opacity: 1, transform: 'translateX(0)' }
  ],
  none: []
};

let observer: IntersectionObserver | null = null;
const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initAnimations(root?: Element) {
  if (prefersReducedMotion()) {
    (root || document)
      .querySelectorAll<HTMLElement>('[data-animate]')
      .forEach(el => {
        el.style.opacity = '1';
        el.removeAttribute('data-animate');
      });
    return;
  }

  const elements = (root || document).querySelectorAll<HTMLElement>(
    '[data-animate]:not([data-animated])'
  );

  observer?.disconnect();
  observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const type = (el.dataset.animate || 'fadeUp') as AnimationType;
          const delay = parseInt(el.dataset.delay || '0', 10);
          animateIn(el, { type, delay });
          observer!.unobserve(el);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -16px 0px' }
  );

  elements.forEach(el => {
    el.style.opacity = '0';
    observer!.observe(el);
  });
}

export function animateIn(el: HTMLElement, opts: AnimateOptions = {}) {
  const { type = 'fadeUp', delay = 0, duration = 380 } = opts;
  const frames = KEYFRAMES[type];
  if (!frames.length) return;

  el.dataset.animated = '1';
  setTimeout(() => {
    const anim = el.animate(frames, {
      duration,
      easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
      fill: 'forwards'
    });
    anim.onfinish = () => { el.style.opacity = '1'; };
  }, delay);
}

export function ripple(el: HTMLElement, event: MouseEvent) {
  if (prefersReducedMotion()) return;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);transform:scale(0);animation:rippleAnim 0.55s linear;pointer-events:none;`;

  const prevOverflow = el.style.overflow;
  el.style.overflow = 'hidden';
  el.appendChild(wave);
  wave.addEventListener('animationend', () => {
    wave.remove();
    if (!el.classList.contains('ripple-container')) el.style.overflow = prevOverflow;
  }, { once: true });
}

function addRipples() {
  document
    .querySelectorAll<HTMLElement>(
      '.mc-btn:not([data-ripple]), .nav-item:not([data-ripple]), .map-ctrl-btn:not([data-ripple]), .quick-btn:not([data-ripple])'
    )
    .forEach(el => {
      el.setAttribute('data-ripple', '1');
      el.addEventListener('click', e => ripple(el, e as MouseEvent));
    });
}

function autoInit() {
  initAnimations();
  addRipples();
}

// Legacy .animate selector fallback
function legacyAnimate() {
  if (prefersReducedMotion()) return;
  document.querySelectorAll<HTMLElement>('.animate:not(.show)').forEach((el, i) => {
    setTimeout(() => el.classList.add('show'), i * 120);
  });
}

document.addEventListener('DOMContentLoaded', () => { autoInit(); legacyAnimate(); });
document.addEventListener('astro:page-load', () => { autoInit(); legacyAnimate(); });
document.addEventListener('astro:after-swap', () => { autoInit(); legacyAnimate(); });
