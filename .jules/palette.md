## 2025-05-22 - [Form Accessibility and Swap Delight]
**Learning:** Found that core search inputs lack proper label associations (htmlFor/id), hindering screen reader users. Added a 'Swap' interaction which is a standard expectation in transit apps but was missing.
**Action:** Always ensure form inputs have unique IDs and matching labels. Use standard transit UI patterns like 'Swap' to improve efficiency.

## 2025-05-22 - [Static Icons in Astro-Intended Environments]
**Learning:** Importing React-specific UI libraries like `lucide-react` in an Astro project (even when using React islands) can introduce unnecessary bundle bloat and VDOM overhead. The team prefers static alternatives like inline SVGs or `astro-icon`.
**Action:** Prioritize inline SVGs or static icon libraries for better performance and alignment with Astro's lightweight architecture. Avoid `lucide-react` components if static SVGs can suffice.
