import os
import time
from playwright.sync_api import sync_playwright

def verify_route_calculator():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to http://localhost:4321/ ...")
        page.goto("http://localhost:4321/")

        # Check if RouteCalculator is present
        page.wait_for_selector("#route-calculator-wrapper", timeout=10000)
        print("RouteCalculator found.")

        # Wait for some JS execution
        time.sleep(2)

        # Check Balance Badge
        balance_badge = page.locator("#balance-badge")
        print(f"Balance Badge Text: {balance_badge.inner_text()}")

        # Check CTA Button
        btn = page.locator("#search-btn")
        if btn.is_visible():
            print("CTA Button is visible.")
            if btn.is_disabled():
                print("CTA Button is disabled.")
            else:
                print("CTA Button is enabled.")
        else:
            print("CTA Button is NOT visible!")

        # Screenshot
        screenshot_path = os.path.abspath("verification/route_calc.png")
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_route_calculator()
