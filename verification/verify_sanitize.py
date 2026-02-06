from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

        # Navigate to test page
        print("Navigating to /test_vulnerability...")
        page.goto("http://localhost:4321/test_vulnerability")

        # Wait for the search button to be enabled
        print("Waiting for search button...")
        try:
            # Wait longer for WASM
            page.wait_for_selector("#search-btn:not([disabled])", timeout=20000)
        except Exception as e:
            print("Timeout waiting for button. Screenshotting state...")
            page.screenshot(path="verification/timeout_test.png")
            raise e

        # Fill inputs
        print("Filling inputs...")
        page.fill("#origin-input", "El Crucero")
        page.fill("#destination-input", "Zona Hotelera")

        # Click search
        print("Clicking search...")
        page.click("#search-btn")

        # Wait for results
        # 'results-container' should have children
        print("Waiting for results...")
        page.wait_for_selector("#results-container > div", timeout=10000)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/route_results.png", full_page=True)

        browser.close()

if __name__ == "__main__":
    run()
