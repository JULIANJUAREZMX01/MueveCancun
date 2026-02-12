from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:4321/home")

        # Wait for map container
        page.wait_for_selector("#leaflet-map")

        # Wait for Leaflet to initialize
        # We can check if window.L is defined
        page.wait_for_function("window.L !== undefined")

        print("Leaflet (window.L) is defined.")

        # Wait a bit for tiles to render
        page.wait_for_timeout(2000)

        # Take screenshot
        page.screenshot(path="verification/map_loaded.png")

        print("Map loaded and screenshot taken.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
