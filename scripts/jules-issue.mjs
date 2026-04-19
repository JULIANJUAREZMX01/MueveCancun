/* eslint-disable */
/**
 * jules-issue.mjs — Bridge GitHub Issue → Jules task.
 * Optimizado para el flujo de ramas dinámicas de MueveCancun.
 */

import { createJulesSession } from './jules-api.mjs';

const issueNumber = process.env.ISSUE_NUMBER || '0';
const issueTitle = process.env.ISSUE_TITLE || '(sin título)';
const issueBody = (process.env.ISSUE_BODY || '').slice(0, 8192);
const issueLabels = process.env.ISSUE_LABELS || '[]';
const issueUrl = process.env.ISSUE_URL || '';
const defaultBranch = process.env.DEFAULT_BRANCH || 'main';
// RECUPERAMOS LA RAMA CREADA POR EL WORKFLOW
const workingBranch = process.env.WORKING_BRANCH || `fix/issue-${issueNumber}`; 

const task = `
