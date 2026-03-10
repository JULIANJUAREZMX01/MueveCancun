🎯 **What:** Implemented the ROI change logic in `src/pages/metricas.astro` using `STORES.STATS`.

💡 **Why:** The application was using a placeholder `+—%` for the ROI change. This update implements the actual logic to calculate the ROI percentage comparing this week's income to the previous week's income using the IndexedDB `STATS` store.

✅ **Verification:** Verified that the script compiles successfully. Ran `npx vitest run` locally to ensure no related tests failed. Addressed test compilation issues by doing minor linting fixes in unrelated files when needed to confirm compilation works as expected.

✨ **Result:** Users will now see an accurate percentage change for their ROI compared to the previous week on the metrics page.
