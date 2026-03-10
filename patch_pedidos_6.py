with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

# Fix currentCoords reset in link mode
old_link_logic = """      case 'link': {
        const link = (document.getElementById('input-link') as HTMLInputElement).value.trim();
        if (!link) return '';"""

new_link_logic = """      case 'link': {
        const link = (document.getElementById('input-link') as HTMLInputElement).value.trim();
        if (!link) return '';
        currentCoords = null;"""
content = content.replace(old_link_logic, new_link_logic)

# Fix reordering logic and dbPutMany issue
# Wait, I previously verified dbPutMany EXISTS in src/lib/idb.ts. But to be safe, I'll use dbPut with Promise.all as suggested.
old_import = "import { dbPut, dbPutMany, dbDelete, dbGetAll, getStops, completeStop, generateId, STORES } from '../lib/idb';"
new_import = "import { dbPut, dbDelete, dbGetAll, getStops, completeStop, generateId, STORES } from '../lib/idb';"
content = content.replace(old_import, new_import)

old_drop_logic = """        // Reorder logic
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
        }"""

new_drop_logic = """        // Identificamos el id del elemento donde se soltó ANTES de reordenar
        const targetId = filtered[dropIndex].id;

        // Reorder logic en filtered
        const item = filtered.splice(dragIndex, 1)[0];
        filtered.splice(dropIndex, 0, item);

        // Update orders to match new positions
        if (currentFilter === 'all') {
          const promises = filtered.map((stop, idx) => {
            stop.order = idx;
            return dbPut(STORES.STOPS, stop);
          });
          await Promise.all(promises);
        } else {
          // Si estamos filtrando, buscar su índice en allStops
          const allStopsItemIndex = allStops.findIndex(s => s.id === item.id);
          const allStopsTargetIndex = allStops.findIndex(s => s.id === targetId);

          if (allStopsItemIndex > -1 && allStopsTargetIndex > -1) {
            const removedItem = allStops.splice(allStopsItemIndex, 1)[0];
            // Insertar en la nueva posición
            allStops.splice(allStopsTargetIndex, 0, removedItem);

            const promises = allStops.map((stop, idx) => {
              stop.order = idx;
              return dbPut(STORES.STOPS, stop);
            });
            await Promise.all(promises);
          }
        }"""

content = content.replace(old_drop_logic, new_drop_logic)

with open('src/pages/pedidos.astro', 'w') as f:
    f.write(content)
