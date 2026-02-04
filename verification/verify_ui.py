from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        # 1. Desktop View
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        print("Navigating to Desktop Home...")
        try:
            page.goto("http://localhost:4321", timeout=60000)
            page.wait_for_selector("aside .route-calculator-panel", timeout=10000)
            time.sleep(2)
            page.screenshot(path="verification/desktop_view.png")
            print("📸 Desktop Screenshot saved.")
        except Exception as e:
            print(f"Error desktop: {e}")
        browser.close()

        # 2. Mobile View
        iphone_13 = p.devices['iPhone 13']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone_13)
        page = context.new_page()

        print("Navigating to Mobile Home...")
        try:
            page.goto("http://localhost:4321", timeout=60000)
            # Mobile panel is inside mobile-search-sheet
            page.wait_for_selector("#mobile-search-sheet .route-calculator-panel", timeout=10000)
            time.sleep(2)
            page.screenshot(path="verification/mobile_view.png")
            print("📸 Mobile Screenshot saved.")
        except Exception as e:
            print(f"Error mobile: {e}")
        browser.close()

if __name__ == "__main__":
    run()
