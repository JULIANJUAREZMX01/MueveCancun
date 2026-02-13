
/**
 * Reproduction Script for Vulnerabilities
 * Run with: node verify_hardening.mjs
 */

import assert from 'assert';

// 1. Check if escapeHtml handles non-strings
function escapeHtml_original(unsafe) {
    // This is the original implementation from src/components/RouteCalculator.astro
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function escapeHtml_fixed(unsafe) {
    // This is the proposed implementation
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

console.log("--- 1. Testing escapeHtml Robustness ---");
try {
    escapeHtml_original(123);
    console.error("❌ FAILURE: Original escapeHtml did NOT crash on number input.");
} catch (e) {
    console.log("✅ SUCCESS: Original escapeHtml crashed on number input (Vulnerability Confirmed).");
}

try {
    const res = escapeHtml_fixed(123);
    assert.strictEqual(res, "123");
    console.log("✅ SUCCESS: Fixed escapeHtml handled number input: " + res);
} catch (e) {
    console.error("❌ FAILURE: Fixed escapeHtml crashed on number input.");
}

// 2. Check JSON Attribute Sanitization
console.log("\n--- 2. Testing JSON Attribute Sanitization ---");
const malicious = { name: "</button><script>alert(1)</script>" };

// Original (only single quotes)
const original_sanitization = JSON.stringify(malicious).replace(/'/g, "&#39;");
console.log("Original Sanitized:", original_sanitization);
if (original_sanitization.includes("</button>")) {
    console.log("⚠️  WARNING: Original sanitization allows breaking out of tag if parser is quirky.");
}

// Fixed (replace < with \u003c)
const fixed_sanitization = JSON.stringify(malicious)
    .replace(/'/g, "&#39;")
    .replace(/</g, "\\u003c");

console.log("Fixed Sanitized:   ", fixed_sanitization);
if (!fixed_sanitization.includes("<")) {
    console.log("✅ SUCCESS: Fixed sanitization removed '<' character.");
} else {
    console.error("❌ FAILURE: Fixed sanitization failed to remove '<'.");
}

// Verify JSON correctness
try {
    // Browser would see \u003c as literal chars inside attribute string
    // JSON.parse handles \u003c -> <
    // Simulate attribute extraction
    const attrValue = fixed_sanitization.replace(/&#39;/g, "'"); // Browser decodes entity
    // However, JS replace(/\\u003c/g) is tricky because of backslashes
    // If we parse the JSON string:
    // {"name":"\u003c..."}
    const parsed = JSON.parse(attrValue);
    assert.strictEqual(parsed.name, malicious.name);
    console.log("✅ SUCCESS: JSON remains valid after sanitization.");
} catch (e) {
    console.error("❌ FAILURE: Sanitized JSON is invalid:", e);
}
