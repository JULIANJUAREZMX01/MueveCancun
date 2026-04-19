# Security Policy

## Supported Versions

We only support the latest version on the `main` branch.

## Reporting a Vulnerability

If you discover a security vulnerability within MueveCancun, please DO NOT open a public issue.
Instead, please send an email to the repository owner or send a direct message via GitHub.

Include the following information in your report:
- Type of vulnerability (e.g., XSS, SQLi, Info Disclosure).
- Step-by-step instructions to reproduce the vulnerability.
- Proof of Concept (PoC) or screenshots if applicable.

We will acknowledge receipt of your vulnerability report and strive to send you regular updates about our progress.

## Offline-First Integrity (Nexus Protocol)

To ensure the platform remains fully functional in offline environments, the use of external runtime dependencies (CDNs, third-party fonts, or map APIs) is strictly prohibited. All assets must be bundled locally.

A static audit can be performed using:
```bash
pnpm audit:survival
```
