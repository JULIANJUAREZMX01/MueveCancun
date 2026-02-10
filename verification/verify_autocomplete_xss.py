
import json
import time
from playwright.sync_api import sync_playwright

def verify_autocomplete_xss():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

        # Intercept coordinates.json
        def handle_route(route):
            print(f"Intercepted request to: {route.request.url}")
            malicious_data = {
                "<img src=x onerror=window.xss_triggered=true>": [21.16, -86.82],
                "Safe Stop": [21.17, -86.83]
            }
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(malicious_data)
            )

        page.route("**/coordinates.json", handle_route)

        # Navigate to home
        print("Navigating to home...")
        page.goto("http://localhost:4321/")

        # Wait for hydration - CoordinatesStore loads async
        print("Waiting for network idle...")
        page.wait_for_load_state("networkidle")

        # Type into origin input to trigger autocomplete
        print("Typing into input...")
        page.fill("#origin-input", "img") # Search for the malicious key

        # Wait for suggestions
        try:
            print("Waiting for suggestions list...")
            page.wait_for_selector("#origin-input-suggestions", state="visible", timeout=5000)
            print("Suggestions appeared.")

            # Dump suggestions HTML
            html = page.inner_html("#origin-input-suggestions")
            print(f"Suggestions HTML: {html}")

        except Exception as e:
            print(f"Suggestions did not appear: {e}")
            # print(page.content()) # Debug

        # Check for XSS execution
        print("Checking for XSS...")
        # Give some time for onerror to fire
        time.sleep(1)

        is_xss = page.evaluate("() => window.xss_triggered === true")

        if is_xss:
            print("❌ VULNERABILITY CONFIRMED: XSS payload executed via Autocomplete!")
        else:
            # Check if the HTML is escaped in the DOM
            content = page.content()
            if "&lt;img" in content:
                print("✅ SAFE: HTML entities found (escaped).")
            elif "<img" in content:
                 print("⚠️  WARNING: Payload found in DOM but didn't execute? (Maybe blocked by CSP or other means)")
            else:
                 print("❓ INCONCLUSIVE: Payload not found in DOM.")

        browser.close()

if __name__ == "__main__":
    verify_autocomplete_xss()
