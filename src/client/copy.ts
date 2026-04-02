const codeBlocks = document.querySelectorAll('pre:has(code)');

// Add copy btn to every code block on the dom
codeBlocks.forEach((code) => {
  // Button icon
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '/copy.svg#empty');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('copy-svg');
  svg.appendChild(use);

  // Create button
  const btn = document.createElement('button');
  btn.appendChild(svg);
  btn.classList.add('copy-btn');
  btn.addEventListener('click', (e: MouseEvent) => copyCode(e));

  // Container to fix copy button
  const container = document.createElement('div');
  container.classList.add('copy-cnt');
  container.appendChild(btn);

  // Add to code block
  (code as HTMLElement).classList.add('relative');
  code.appendChild(container);
});

function copyCode(event: MouseEvent): void {
  const target = event.currentTarget as HTMLButtonElement;
  const codeBlock = getChildByTagName(target.parentElement!.parentElement!, 'CODE') as HTMLElement | undefined;
  if (!codeBlock) return;
  navigator.clipboard.writeText(codeBlock.innerText);
  const useEl = getChildByTagName(getChildByTagName(target, 'svg') as Element, 'use') as SVGUseElement | undefined;
  if (useEl) {
    useEl.setAttribute('href', '/copy.svg#filled');
    setTimeout(() => {
      useEl.setAttribute('href', '/copy.svg#empty');
    }, 100);
  }
}

function getChildByTagName(element: Element, tagName: string): Element | undefined {
  return Array.from(element.children).find((child) => child.tagName === tagName);
}
