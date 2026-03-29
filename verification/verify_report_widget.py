from playwright.sync_api import sync_playwright, expect
import time

def verify_widget():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # 1. Load the home page
            print("Navigating to home page...")
            page.goto("http://localhost:4321/es/home")
            time.sleep(3)

            # 2. Check if FAB is visible
            print("Checking FAB...")
            fab = page.locator("#rw-fab")
            expect(fab).to_be_visible()
            page.screenshot(path="verification/01_home_fab.png")

            # 3. Click FAB to open modal
            print("Opening modal...")
            fab.click()
            time.sleep(1)
            overlay = page.locator("#rw-overlay")
            # In HTML5 'hidden' is a boolean attribute, when present it is usually empty or 'true'
            # But let's check visibility which is more robust for user-facing tests
            expect(overlay).to_be_visible()
            page.screenshot(path="verification/02_modal_open.png")

            # 4. Navigate to Community and check button
            print("Navigating to community...")
            page.goto("http://localhost:4321/es/community")
            time.sleep(2)

            report_btn = page.locator("#btn-report-community")
            expect(report_btn).to_be_visible()
            print("Clicking community report button...")
            report_btn.click()
            time.sleep(1)
            expect(page.locator("#rw-overlay")).to_be_visible()
            page.screenshot(path="verification/03_community_modal.png")

        finally:
            browser.close()

if __name__ == "__main__":
    verify_widget()
