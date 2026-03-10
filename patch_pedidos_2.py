with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

# Modify the import statement to include dbPutMany
old_import = "import { dbPut, dbDelete, dbGetAll, getStops, completeStop, generateId, STORES } from '../lib/idb';"
new_import = "import { dbPut, dbPutMany, dbDelete, dbGetAll, getStops, completeStop, generateId, STORES } from '../lib/idb';"
content = content.replace(old_import, new_import)

# Modify renderStops to add draggable and data-index
old_stop_card = """      <div class="stop-card ${s.status === 'completed' ? 'completed' : ''} ${s.priority === 'urgent' ? 'priority-urgent' : 'priority-normal'}"
           data-id="${s.id}" role="button" tabindex="0" aria-label="Parada ${s.order + 1}: ${escapeHtml(s.address)}">"""

new_stop_card = """      <div class="stop-card ${s.status === 'completed' ? 'completed' : ''} ${s.priority === 'urgent' ? 'priority-urgent' : 'priority-normal'}"
           data-id="${s.id}" data-index="${i}" draggable="true" role="button" tabindex="0" aria-label="Parada ${s.order + 1}: ${escapeHtml(s.address)}">"""
content = content.replace(old_stop_card, new_stop_card)

with open('src/pages/pedidos.astro', 'w') as f:
    f.write(content)
