
import time
from playwright.sync_api import sync_playwright

def verify_csp_and_render():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to home
        print("Navigating to http://localhost:4321...")
        try:
            page.goto("http://localhost:4321", timeout=10000)
        except Exception as e:
            print(f"Error navigating: {e}")
            browser.close()
            return

        # Check CSP Meta Tag
        print("Checking CSP meta tag...")
        csp_meta = page.locator('meta[http-equiv="Content-Security-Policy"]')
        if csp_meta.count() > 0:
            content = csp_meta.get_attribute("content")
            print(f"✅ CSP Found: {content}")
            if "default-src 'self'" in content and "script-src 'self'" in content:
                print("✅ CSP looks correct.")
            else:
                print("⚠️ CSP content might be missing strict directives.")
        else:
            print("❌ CSP meta tag NOT found!")

        # Take Screenshot of Home
        print("Taking screenshot of home...")
        page.screenshot(path="verification/home.png")

        # Navigate to Routes to check if WASM/JS didn't crash
        print("Navigating to /rutas...")
        page.goto("http://localhost:4321/rutas")

        # Wait for potential WASM load (search box enabled?)
        # The search button starts disabled. If WASM loads, it might enable.
        # But visual check is enough for now.
        time.sleep(2)
        print("Taking screenshot of routes...")
        page.screenshot(path="verification/routes.png")

        browser.close()

if __name__ == "__main__":
    verify_csp_and_render()
