🎯 **What:** Removed development `console.log` statements from `src/components/RouteCalculator.astro`.

💡 **Why:** This improves the maintainability and cleanliness of the codebase by removing unnecessary debugging lines that pollute the console output in production.

✅ **Verification:** Verified the code changes locally using `pnpm build`. No functionality is affected as these were strictly logging statements.

✨ **Result:** A cleaner production build and improved codebase readability without any behavior changes.
