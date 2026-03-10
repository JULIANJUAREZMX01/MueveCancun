with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

target = "<style>"

replacement = """<style>
  /* Scan sub-tabs */
  .scan-tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.75rem;
    background: var(--surface-input);
    border-radius: var(--radius-lg);
    padding: 0.25rem;
  }

  .scan-tab {
    flex: 1;
    padding: 0.375rem 0.5rem;
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    font-weight: 700;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .scan-tab.active {
    background: var(--surface-card);
    color: var(--text-primary);
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }"""

if target in content:
    new_content = content.replace(target, replacement)
    with open('src/pages/pedidos.astro', 'w') as f:
        f.write(new_content)
    print("CSS modified successfully.")
else:
    print("Could not find <style>.")
