🎯 **What:** Added missing unit tests for `getAllRoutes` data-loading logic in `src/utils/routes.ts`.

📊 **Coverage:** The new test suite (`src/tests/routes.test.ts`) covers multiple scenarios using `node:fs/promises` mocking:
* Fallback to master routes on an empty directory
* Loading of single objects, arrays, and structured (`.rutas`) JSON layouts.
* Graceful handling of invalid JSON data.
* Proper deduplicated merging of `master_routes.json` files and individual fragments.

✨ **Result:** Improved reliability through higher unit test coverage on core routing configuration logic. Fixed a minor syntax error in `src/tests/utils.test.ts` discovered during suite execution.
🎯 **What:** Implemented the ROI change logic in `src/pages/metricas.astro` using `STORES.STATS`.

💡 **Why:** The application was using a placeholder `+—%` for the ROI change. This update implements the actual logic to calculate the ROI percentage comparing this week's income to the previous week's income using the IndexedDB `STATS` store.

✅ **Verification:** Verified that the script compiles successfully. Ran `npx vitest run` locally to ensure no related tests failed. Addressed test compilation issues by doing minor linting fixes in unrelated files when needed to confirm compilation works as expected.

✨ **Result:** Users will now see an accurate percentage change for their ROI compared to the previous week on the metrics page.
