import time
from playwright.sync_api import sync_playwright

def verify_toast():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to home...")
        try:
            page.goto("http://localhost:4321/home")
        except Exception as e:
            print(f"Navigation failed: {e}")
            return

        # Wait for page to be ready
        page.wait_for_load_state("domcontentloaded")
        time.sleep(2) # Give it a moment for hydration/scripts

        print("Triggering toast...")
        # Execute the global showToast function
        page.evaluate("window.showToast('Test Message GraffitiWarrior', 'success', 5000)")

        # Wait for animation
        time.sleep(1)

        # Check computed styles
        computed_top = page.evaluate("window.getComputedStyle(document.getElementById('toast-notification')).top")
        computed_transform = page.evaluate("window.getComputedStyle(document.getElementById('toast-notification')).transform")
        print(f"Computed top: {computed_top}")
        print(f"Computed transform: {computed_transform}")

        # Take screenshot
        screenshot_path = "verification/toast_verification.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_toast()
