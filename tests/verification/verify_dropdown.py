
from playwright.sync_api import sync_playwright
import time
import os

def run(p):
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to http://localhost:4321...")
    page.goto("http://localhost:4321")

    # Wait for the origin input to be present and attached
    origin = page.locator("#origin-input")
    try:
        origin.wait_for(state="attached", timeout=10000)
        print("Found origin input.")
    except Exception as e:
        print(f"Could not find origin input: {e}")
        page.screenshot(path="verification/error_no_input.png")
        browser.close()
        return

    # Wait for JS hydration?
    # The setupAutocomplete runs after hydration
    time.sleep(2)

    print("Typing 'Aeropuerto'...")
    origin.fill("Aeropuerto")
    origin.click() # Ensure focus

    # Wait for the popover to appear
    # The selector is .graffiti-dropdown
    dropdown = page.locator(".graffiti-dropdown").first

    print("Waiting for dropdown...")
    try:
        dropdown.wait_for(state="visible", timeout=5000)
        print("Dropdown is visible!")

        # Take screenshot of the whole page, focused on the dropdown
        page.screenshot(path="verification/dropdown_visible.png")

        # Try to inspect its properties (e.g. popover attribute)
        # Playwright might not expose popover state directly but visibility implies it.
        # We can also check CSS anchor.

    except Exception as e:
        print(f"Dropdown not visible: {e}")
        # Capture DOM state
        with open("verification/dom_dump.html", "w") as f:
            f.write(page.content())
        page.screenshot(path="verification/dropdown_failed.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as p:
        run(p)
