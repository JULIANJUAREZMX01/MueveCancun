with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

# Add event listeners logic after renderStops HTML generation
old_bind_events = """    // Bind events on stop cards
    listEl.querySelectorAll('.stop-card').forEach(card => {"""

new_bind_events = """    // Bind events on stop cards
    listEl.querySelectorAll('.stop-card').forEach(card => {
      // Drag and Drop
      card.addEventListener('dragstart', (e: any) => {
        const target = e.target as HTMLElement;
        const index = target.getAttribute('data-index');
        e.dataTransfer.setData('text/plain', index);
        e.dataTransfer.effectAllowed = 'move';
        target.classList.add('dragging');
      });

      card.addEventListener('dragend', (e: any) => {
        const target = e.target as HTMLElement;
        target.classList.remove('dragging');
      });

      card.addEventListener('dragover', (e: any) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.currentTarget as HTMLElement;
        target.classList.add('drag-over');
      });

      card.addEventListener('dragleave', (e: any) => {
        const target = e.currentTarget as HTMLElement;
        target.classList.remove('drag-over');
      });

      card.addEventListener('drop', async (e: any) => {
        e.preventDefault();
        const target = e.currentTarget as HTMLElement;
        target.classList.remove('drag-over');

        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const dropIndex = parseInt(target.getAttribute('data-index')!, 10);

        if (dragIndex === dropIndex || isNaN(dragIndex) || isNaN(dropIndex)) return;

        // Reorder logic
        const item = filtered.splice(dragIndex, 1)[0];
        filtered.splice(dropIndex, 0, item);

        // Update orders to match new positions
        // Preserve un-filtered items if necessary, but typical use cases assume filtering doesn't mess with relative ordering
        // Or re-calculate order based on filtered array
        const updates: import('../lib/idb').Stop[] = [];
        filtered.forEach((stop, idx) => {
          stop.order = idx;
          updates.push(stop);
        });

        await dbPutMany(STORES.STOPS, updates);
        await renderStops();
      });"""

content = content.replace(old_bind_events, new_bind_events)

with open('src/pages/pedidos.astro', 'w') as f:
    f.write(content)
