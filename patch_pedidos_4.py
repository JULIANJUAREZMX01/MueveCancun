with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

# Fix order calculation logic inside the drop event
old_drop_logic = """        // Reorder logic
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

new_drop_logic = """        // Reorder logic
        const item = filtered.splice(dragIndex, 1)[0];
        filtered.splice(dropIndex, 0, item);

        // Update orders to match new positions (all stops based on sorted array)
        // Solo reordenar cuando estamos viendo todas ("all")
        if (currentFilter === 'all') {
          const updates: import('../lib/idb').Stop[] = [];
          filtered.forEach((stop, idx) => {
            stop.order = idx;
            updates.push(stop);
          });
          await dbPutMany(STORES.STOPS, updates);
        } else {
          // Si estamos filtrando, buscar su índice en allStops
          const allStopsItemIndex = allStops.findIndex(s => s.id === item.id);
          const allStopsTargetIndex = allStops.findIndex(s => s.id === filtered[dropIndex].id);

          if (allStopsItemIndex > -1 && allStopsTargetIndex > -1) {
            const removedItem = allStops.splice(allStopsItemIndex, 1)[0];
            allStops.splice(allStopsTargetIndex, 0, removedItem);

            const updates: import('../lib/idb').Stop[] = [];
            allStops.forEach((stop, idx) => {
              stop.order = idx;
              updates.push(stop);
            });
            await dbPutMany(STORES.STOPS, updates);
          }
        }

        await renderStops();
      });"""

content = content.replace(old_drop_logic, new_drop_logic)

with open('src/pages/pedidos.astro', 'w') as f:
    f.write(content)
