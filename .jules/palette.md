## 2025-05-22 - [Form Accessibility and Swap Delight]
**Learning:** Found that core search inputs lack proper label associations (htmlFor/id), hindering screen reader users. Added a 'Swap' interaction which is a standard expectation in transit apps but was missing.
**Action:** Always ensure form inputs have unique IDs and matching labels. Use standard transit UI patterns like 'Swap' to improve efficiency.

## 2025-05-23 - [Bilingual Accessibility and Visual Scannability]
**Learning:** Transit information (cost, time, steps) is highly critical and should be scannable without reading full text. Bilingual support in tourist destinations is a fundamental UX requirement. Semantic HTML (<ol>/<li>) is essential for navigable route steps.
**Action:** Use Lucide icons for key metrics. Always provide bilingual labels for international users. Use semantic list tags for sequential information.
