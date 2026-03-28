/**
 * jules-api.mjs — Cliente REST compartido para Google Jules API
 *
 * Uso:
 *   import { createJulesSession, getJulesSession, listJulesSessions } from './jules-api.mjs';
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
