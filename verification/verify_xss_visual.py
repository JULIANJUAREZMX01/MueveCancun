
import json
import time
from playwright.sync_api import sync_playwright

def verify_xss_visual():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Intercept coordinates.json
        def handle_route(route):
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
        page.goto("http://localhost:4321/")
        page.wait_for_load_state("networkidle")

        # Type into origin input
        page.fill("#origin-input", "img")

        # Wait for suggestions
        try:
            page.wait_for_selector("#origin-input-suggestions", state="visible", timeout=5000)

            # Take screenshot of the suggestions
            # Focus on the input area + suggestions
            input_box = page.locator("#origin-input").locator("..").locator("..")
            suggestions = page.locator("#origin-input-suggestions")

            # Screenshot full page to be safe
            page.screenshot(path="verification/xss_prevention.png", full_page=True)
            print("Screenshot saved to verification/xss_prevention.png")

        except Exception as e:
            print(f"Failed to take screenshot: {e}")

        browser.close()

if __name__ == "__main__":
    verify_xss_visual()
