🎯 **What:** Added missing unit tests for `getAllRoutes` data-loading logic in `src/utils/routes.ts`.

📊 **Coverage:** The new test suite (`src/tests/routes.test.ts`) covers multiple scenarios using `node:fs/promises` mocking:
* Fallback to master routes on an empty directory
* Loading of single objects, arrays, and structured (`.rutas`) JSON layouts.
* Graceful handling of invalid JSON data.
* Proper deduplicated merging of `master_routes.json` files and individual fragments.

✨ **Result:** Improved reliability through higher unit test coverage on core routing configuration logic. Fixed a minor syntax error in `src/tests/utils.test.ts` discovered during suite execution.
