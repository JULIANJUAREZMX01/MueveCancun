from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        print("Navigating to http://localhost:4321/")
        page.goto("http://localhost:4321/")

        # Wait for splash screen redirect
        print("Waiting for redirect to /home...")
        page.wait_for_url("**/home*", timeout=10000)

        # Wait for Route Calculator to be visible
        print("Waiting for Route Calculator...")
        page.wait_for_selector("#search-card", state="visible")

        # Check if the button says "CALCULATE ROUTE" (means WASM loaded)
        # Initially it says "LOADING..." or "Cargando rutas..."
        # Then WASM loads and it changes.

        print("Waiting for WASM initialization (Calculate button enabled)...")
        # Wait for button to not be disabled
        page.wait_for_function("document.getElementById('search-btn').disabled === false", timeout=10000)

        print("Taking screenshot...")
        page.screenshot(path="verification/home_loaded.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()
