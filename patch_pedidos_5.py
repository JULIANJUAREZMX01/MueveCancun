with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

# Add CSS for .drag-over
old_style = """  .stop-card:active { transform: scale(0.99); }"""

new_style = """  .stop-card:active { transform: scale(0.99); }

  .stop-card.dragging {
    opacity: 0.5;
    background: var(--surface-elevated);
  }

  .stop-card.drag-over {
    border-top: 2px solid var(--color-primary);
    transform: translateY(2px);
  }"""

content = content.replace(old_style, new_style)

with open('src/pages/pedidos.astro', 'w') as f:
    f.write(content)
