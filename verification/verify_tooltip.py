from playwright.sync_api import Page, expect, sync_playwright
import time

def test_tooltip(page: Page):
    page.goto("http://localhost:4321")

    # Wait for the calculator to load (it has animations)
    page.wait_for_selector("#route-calculator-wrapper")

    # Locate GPS button
    gps_btn = page.locator("#gps-btn")
    expect(gps_btn).to_be_visible()

    # Hover to trigger tooltip
    gps_btn.hover()

    # Wait for tooltip (it has transition)
    tooltip = page.locator("#gps-tooltip")
    expect(tooltip).to_have_css("opacity", "1")

    # Take screenshot of GPS tooltip
    page.screenshot(path="verification/gps_tooltip.png")

    # Move mouse away to hide
    page.mouse.move(0, 0)
    time.sleep(0.5)

    # Locate Map Picker button
    map_btn = page.locator("#map-picker-btn")
    map_btn.hover()

    # Wait for tooltip
    map_tooltip = page.locator("#map-tooltip")
    expect(map_tooltip).to_have_css("opacity", "1")

    # Take screenshot of Map tooltip
    page.screenshot(path="verification/map_tooltip.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_tooltip(page)
        finally:
            browser.close()
