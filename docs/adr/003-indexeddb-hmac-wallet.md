# ADR-003: IndexedDB Wallet with HMAC Integrity

**Date:** 2026-01-20
**Status:** Accepted

## Context

MueveCancun requires a balance system for transit fare tracking. Zero operational cost
is a hard constraint — no backend, no database server. Data must persist indefinitely
offline, survive app restarts, and be tamper-evident (not tamper-proof).

## Decision

Implement the wallet using IndexedDB (via src/utils/db.ts) with an HMAC signature
stored alongside the balance value. The HMAC serves as a deterrent against casual
tampering via browser DevTools. It is not a cryptographic security guarantee.

Balance is unified across all stored values. The `BALANCE_UPDATED` CustomEvent
notifies RouteCalculator when the wallet changes.

## Consequences

- No synchronization across devices (single-device, single-browser).
- User can clear IndexedDB via browser settings, resetting the balance.
- HMAC is a deterrent only — a determined user can reconstruct the signature.
- No backend costs. Works fully offline after first page load.

## Alternatives Considered

- **localStorage**: Rejected — 5MB limit, no transactional writes, no binary storage.
- **Backend API + JWT**: Rejected — violates zero-cost-operation constraint.
- **Full WebCrypto wallet**: Rejected — excessive complexity for the use case (fare tracking, not financial transactions).
