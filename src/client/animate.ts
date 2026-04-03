function animate(): void {
  const animateElements = document.querySelectorAll<HTMLElement>('.animate');

  animateElements.forEach((element, index) => {
    setTimeout(() => {
      element.classList.add('show');
    }, index * 150);
  });
}

document.addEventListener('DOMContentLoaded', animate);
document.addEventListener('astro:after-swap', animate);
