function getChildByTagName(element: HTMLElement, tagName: string): HTMLElement | undefined {
  return Array.from(element.children).find((child) => child.tagName === tagName) as HTMLElement | undefined;
}

export function copyCode(event: MouseEvent) {
  const currentTarget = event.currentTarget as HTMLElement;
  const parent = currentTarget.parentElement?.parentElement;
  if (!parent) return;

  const codeBlock = getChildByTagName(parent, 'CODE');
  if (!codeBlock) return;

  navigator.clipboard.writeText(codeBlock.innerText);

  const svg = getChildByTagName(currentTarget, 'svg');
  const use = svg ? getChildByTagName(svg, 'use') : undefined;

  if (use) {
    use.setAttribute('href', '/copy.svg#filled');
    setTimeout(() => {
      use.setAttribute('href', '/copy.svg#empty');
    }, 100);
  }
}

export function setupCopyButtons() {
  const codeBlocks = document.querySelectorAll('pre:has(code)');

  codeBlocks.forEach((code) => {
    if (code.querySelector('.copy-cnt')) return;

    // button icon
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '/copy.svg#empty');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('copy-svg');
    svg.appendChild(use);

    // create button
    const btn = document.createElement('button');
    btn.appendChild(svg);
    btn.classList.add('copy-btn');
    btn.addEventListener('click', (e) => copyCode(e));

    // container to fix copy button
    const container = document.createElement('div');
    container.classList.add('copy-cnt');
    container.appendChild(btn);

    // add to code block
    code.classList.add('relative');
    code.appendChild(container);
  });
}

document.addEventListener("DOMContentLoaded", setupCopyButtons);
document.addEventListener("astro:after-swap", setupCopyButtons);
setupCopyButtons();
