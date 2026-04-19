/* eslint-disable */
/**
 * jules-api.mjs — Cliente REST compartido para Google Jules API
 *
 * Uso:
 *   import { createJulesSession, getJulesSession, stopJulesSession, deleteJulesSession, waitForJulesSession, listJulesSessions } from './jules-api.mjs';
 *
 * Requiere variable de entorno: JULES_API_KEY
 * Endpoint base: https://jules.googleapis.com/v1alpha
 */

const JULES_BASE_URL = 'https://jules.googleapis.com/v1alpha';
const REPO_OWNER = 'JULIANJUAREZMX01';
const REPO_NAME = 'MueveCancun';

/**
 * Crea una nueva sesión (tarea) en Jules.
 *
 * @param {object} opts
 * @param {string} opts.task           - Descripción de la tarea a ejecutar.
 * @param {string} [opts.branch]       - Rama base de trabajo (default: main).
 * @param {string} [opts.authorMode]   - 'CO_AUTHORED' | 'JULES' | 'USER_ONLY' (default: CO_AUTHORED).
 * @param {boolean} [opts.autoCommit]  - Jules hace commit automático (default: true).
 * @param {boolean} [opts.openPR]      - Jules abre un PR con los cambios (default: true).
 * @param {string[]} [opts.fileFilter] - Lista de glob patterns para limitar el radio de acción.
 * @param {object} [opts.context]      - Contexto adicional (logs, issue body, etc.).
 * @returns {Promise<object>} Respuesta JSON de la API.
 */
export async function createJulesSession({
  task,
  branch = 'main',
  authorMode = 'CO_AUTHORED',
  autoCommit = true,
  openPR = true,
  fileFilter = [],
  context = {},
}) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) {
    throw new Error('JULES_API_KEY environment variable is not set');
  }

  const payload = {
    repository: {
      owner: REPO_OWNER,
      name: REPO_NAME,
    },
    task,
    branch,
    authorMode,
    autoCommit,
    openPullRequest: openPR,
    context,
  };

  if (fileFilter.length > 0) {
    payload.fileFilter = fileFilter;
  }

  const response = await fetch(`${JULES_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Obtiene el estado de una sesión Jules existente.
 *
 * @param {string} sessionId - ID de sesión devuelto por createJulesSession.
 * @returns {Promise<object>}
 */
export async function getJulesSession(sessionId) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const response = await fetch(`${JULES_BASE_URL}/sessions/${sessionId}`, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Detiene una sesión activa de Jules antes de que termine.
 * Útil si el CI detecta una colisión de lógica prematura.
 *
 * @param {string} sessionId
 * @returns {Promise<object>}
 */
export async function stopJulesSession(sessionId) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const response = await fetch(`${JULES_BASE_URL}/sessions/${sessionId}:stop`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Elimina una sesión del historial para mantener la limpieza del sistema.
 *
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function deleteJulesSession(sessionId) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const response = await fetch(`${JULES_BASE_URL}/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }
}

/**
 * Utilidad de polling para esperar a que una sesión termine su ejecución.
 *
 * @param {string} sessionId
 * @param {number} [interval] - Milisegundos entre checks (default: 10000).
 * @returns {Promise<object>} Sesión finalizada.
 */
export async function waitForJulesSession(sessionId, interval = 10000) {
  while (true) {
    const session = await getJulesSession(sessionId);
    const state = session.state || 'UNKNOWN';

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(state)) {
      return session;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Cuenta las sesiones Jules creadas hoy para un workflow + branch concreto.
 */
export async function isDailyCapReached({ workflowName, branch, cap = 3 }) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  let sessions;
  try {
    sessions = await listJulesSessions({ createTimeAfter: todayStart.toISOString(), pageSize: 50 });
  } catch {
    return false;
  }

  const items = sessions.sessions || sessions.items || [];
  const matches = items.filter((s) => {
    const ctx = s.context || {};
    return ctx.workflowName === workflowName && ctx.headBranch === branch;
  });

  return matches.length >= cap;
}

/**
 * Lista sesiones Jules activas para el repositorio.
 *
 * @param {object} [opts]
 * @param {string} [opts.createTimeAfter] - ISO timestamp para filtrar por cursor de tiempo.
 * @param {number} [opts.pageSize]        - Número máximo de resultados (default: 20).
 * @returns {Promise<object>}
 */
export async function listJulesSessions({ createTimeAfter, pageSize = 20 } = {}) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const params = new URLSearchParams({
    'filter.repository.owner': REPO_OWNER,
    'filter.repository.name': REPO_NAME,
    pageSize: String(pageSize),
  });

  if (createTimeAfter) {
    params.set('filter.createTimeAfter', createTimeAfter);
  }

  const response = await fetch(`${JULES_BASE_URL}/sessions?${params}`, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Descarga el changeset (parche git) de una sesión completada.
 */
export async function getJulesSessionPatch(sessionId) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const response = await fetch(`${JULES_BASE_URL}/sessions/${sessionId}/patch`, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.text();
}

/**
 * Crea una sesión Jules en modo "repoless".
 */
export async function createRepolessSession({ task, runtime = 'node', env = {} }) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const payload = {
    repoless: true,
    runtime,
    task,
    environment: env,
  };

  const response = await fetch(`${JULES_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) {
    throw new Error('JULES_API_KEY environment variable is not set');
  }

  const payload = {
    repository: {
      owner: REPO_OWNER,
      name: REPO_NAME,
    },
    task,
    branch,
    authorMode,
    autoCommit,
    openPullRequest: openPR,
    context,
  };

  if (fileFilter.length > 0) {
    payload.fileFilter = fileFilter;
  }

  const response = await fetch(`${JULES_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Obtiene el estado de una sesión Jules existente.
 *
 * @param {string} sessionId - ID de sesión devuelto por createJulesSession.
 * @returns {Promise<object>}
 */
export async function getJulesSession(sessionId) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const response = await fetch(`${JULES_BASE_URL}/sessions/${sessionId}`, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Cuenta las sesiones Jules creadas hoy para un workflow + branch concreto.
 * Útil para imponer un límite diario (rate-cap) en auto-reparaciones CI.
 *
 * @param {object} opts
 * @param {string} opts.workflowName - Nombre del workflow (label de filtro en context).
 * @param {string} opts.branch       - Nombre del branch afectado.
 * @param {number} [opts.cap]        - Límite máximo permitido (default: 3).
 * @returns {Promise<boolean>} true si ya se alcanzó el límite diario.
 */
export async function isDailyCapReached({ workflowName, branch, cap = 3 }) {
  // Calcular inicio del día UTC actual
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  let sessions;
  try {
    // pageSize=50 is well above the daily cap (3), so a single page is sufficient
    // for this check even on busy days. If > 50 sessions were created today, at least
    // 3 of them will appear in the first page, and the cap will still be enforced correctly.
    sessions = await listJulesSessions({ createTimeAfter: todayStart.toISOString(), pageSize: 50 });
  } catch {
    // Si la API falla, permitir la ejecución para no bloquear reparaciones legítimas
    return false;
  }

  const items = sessions.sessions || sessions.items || [];
  const matches = items.filter((s) => {
    const ctx = s.context || {};
    return ctx.workflowName === workflowName && ctx.headBranch === branch;
  });

  return matches.length >= cap;
}

/**
 * Lista sesiones Jules activas para el repositorio.
 *
 * @param {object} [opts]
 * @param {string} [opts.createTimeAfter] - ISO timestamp para filtrar por cursor de tiempo.
 * @param {number} [opts.pageSize]        - Número máximo de resultados (default: 20).
 * @returns {Promise<object>}
 */
export async function listJulesSessions({ createTimeAfter, pageSize = 20 } = {}) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const params = new URLSearchParams({
    'filter.repository.owner': REPO_OWNER,
    'filter.repository.name': REPO_NAME,
    pageSize: String(pageSize),
  });

  if (createTimeAfter) {
    params.set('filter.createTimeAfter', createTimeAfter);
  }

  const response = await fetch(`${JULES_BASE_URL}/sessions?${params}`, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Descarga el changeset (parche git) de una sesión completada.
 *
 * @param {string} sessionId
 * @returns {Promise<string>} Parche en formato git diff/patch.
 */
export async function getJulesSessionPatch(sessionId) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const response = await fetch(`${JULES_BASE_URL}/sessions/${sessionId}/patch`, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.text();
}

/**
 * Crea una sesión Jules en modo "repoless" (serverless, sin repositorio).
 * Útil para scripts de utilidad o transformaciones de datos efímeras.
 *
 * @param {object} opts
 * @param {string} opts.task      - Descripción de la tarea.
 * @param {string} [opts.runtime] - 'node' | 'python' | 'rust' | 'bun' (default: node).
 * @param {object} [opts.env]     - Variables de entorno para el runtime.
 * @returns {Promise<object>}
 */
export async function createRepolessSession({ task, runtime = 'node', env = {} }) {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) throw new Error('JULES_API_KEY not set');

  const payload = {
    repoless: true,
    runtime,
    task,
    environment: env,
  };

  const response = await fetch(`${JULES_BASE_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Jules API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}
