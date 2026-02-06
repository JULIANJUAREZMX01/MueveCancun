import os
from playwright.sync_api import sync_playwright, expect

def verify_passenger_selector(page):
    print("Navigating to home...")
    page.goto("http://localhost:4321/home")

    # Wait for the selector to be visible
    selector_btn = page.locator("#passenger-selector")
    expect(selector_btn).to_be_visible()

    print("Checking initial state...")
    # Check initial state (Default is 3)
    # Use generic selector for the display span inside the button
    display_span = selector_btn.locator("span").first
    expect(display_span).to_have_text("3 Pasajeros")

    # Screenshot initial state
    os.makedirs("/home/jules/verification", exist_ok=True)
    page.screenshot(path="/home/jules/verification/selector_initial.png")

    print("Clicking selector...")
    # Click to open
    selector_btn.click()

    # Wait for popover to be open
    menu = page.locator("#passenger-selector-menu")
    expect(menu).to_be_visible()

    print("Taking screenshot of open state...")
    # Screenshot open state
    page.screenshot(path="/home/jules/verification/selector_open.png")

    print("Selecting option 2...")
    # Click "2 Pasajeros"
    # The label contains the text
    option_2 = menu.locator("label").filter(has_text="2 Pasajeros")
    option_2.click()

    # Verify text updated
    print("Verifying update...")
    expect(display_span).to_have_text("2 Pasajeros")

    # Screenshot updated state
    page.screenshot(path="/home/jules/verification/selector_updated.png")
    print("Done.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_passenger_selector(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise
        finally:
            browser.close()
