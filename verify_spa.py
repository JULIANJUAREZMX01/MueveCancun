from playwright.sync_api import Page, expect, sync_playwright
import time

def test_spa_flow(page: Page):
    print("Navigating to homepage...")
    page.goto("http://localhost:4321")

    # 2. Check Hero
    print("Checking Hero...")
    expect(page.get_by_text("¿Que ruta me lleva?")).to_be_visible()

    # 3. Check Calculator Title
    print("Checking Calculator Title...")
    expect(page.get_by_text("¿A dónde vamos hoy?")).to_be_visible()

    # 4. Check Button
    print("Checking Button...")
    btn = page.locator("#search-btn")
    expect(btn).to_contain_text("¿Como llegar?")

    # Screenshot Initial
    print("Taking initial screenshot...")
    page.screenshot(path="/home/jules/verification/initial_state.png")

    # 5. Perform Search
    print("Performing search...")
    # Need to wait for WASM to load? 'WASM initialized' console log.
    # We can just fill inputs.

    # Wait for inputs to be interactive
    page.wait_for_selector("#origin-input")

    # Note: WASM loading is async. The button might check for wasmLoaded.
    # We should wait a bit or wait for console log.
    # For now, just fill and click.

    page.fill("#origin-input", "Crucero")
    page.fill("#destination-input", "Zona Hotelera")

    # Blur to trigger brand update phases if any
    page.locator("#destination-input").blur()

    print("Clicking Search...")
    btn.click()

    # Wait for Summary Bar
    print("Waiting for Summary Bar...")
    summary = page.locator("#summary-bar")

    # Wait for it to be visible. This confirms the switch to MAP view happened.
    expect(summary).to_be_visible(timeout=10000)

    # Check Summary Content
    print("Checking Summary Content...")
    # It might take a moment to populate
    expect(page.locator("#summary-origin")).not_to_be_empty()

    # Screenshot Map State
    print("Taking map screenshot...")
    page.screenshot(path="/home/jules/verification/map_state.png")

    # 6. Click Edit (Pencil)
    print("Clicking Edit...")
    edit_btn = page.locator("#edit-search-btn")
    edit_btn.click()

    # Expect Calculator to be visible again
    print("Verifying restore...")
    # Calculator is in #search-view.
    expect(page.locator("#search-view")).to_be_visible()
    expect(page.locator("#summary-bar")).not_to_be_visible()

    # Screenshot Restored
    print("Taking restored screenshot...")
    page.screenshot(path="/home/jules/verification/restored_state.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_spa_flow(page)
            print("Verification Successful")
        except Exception as e:
            print(f"Verification Failed: {e}")
        finally:
            browser.close()
