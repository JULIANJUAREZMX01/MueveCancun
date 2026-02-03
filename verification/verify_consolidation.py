import os
import time
from playwright.sync_api import sync_playwright

def verify_system_consolidation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Verify Global Nav & Rutas Link
        print("Navigating to Home...")
        page.goto("http://localhost:4321/")

        nav = page.locator("nav.fixed.bottom-0")
        if nav.is_visible():
            print("Bottom Nav is visible.")
            rutas_link = nav.get_by_text("Rutas")
            if rutas_link.is_visible():
                print("'Rutas' link found in nav.")
            else:
                print("'Rutas' link NOT found.")
        else:
             # Desktop header check
             header = page.locator("header.hidden.lg\:flex")
             if header.is_visible():
                 print("Desktop Header is visible.")
             else:
                 print("Nav not found (could be mobile view on desktop size without bottom nav?)")

        # 2. Verify Map Page Loads Leaflet
        print("Navigating to /mapa ...")
        page.goto("http://localhost:4321/mapa")
        page.wait_for_selector("#map-container", timeout=10000)

        # Check for Leaflet specific class
        leaflet_pane = page.locator(".leaflet-pane")
        if leaflet_pane.count() > 0:
            print("Leaflet map initialized successfully.")
        else:
            print("Leaflet map NOT detected.")

        page.screenshot(path=os.path.abspath("verification/map_page.png"))

        # 3. Verify Wallet Persistence & Recharge
        print("Navigating to /driver ...")
        page.goto("http://localhost:4321/driver")

        balance_el = page.locator("#display-balance")
        # Wait for animation/load
        time.sleep(2)
        initial_balance = balance_el.inner_text()
        print(f"Initial Balance: {initial_balance}")

        # Click Recharge 0
        page.locator("#top-up-trigger").click()
        page.locator("button[data-amount='50']").click()
        time.sleep(2)

        new_balance = balance_el.inner_text()
        print(f"New Balance: {new_balance}")

        if int(new_balance) == int(initial_balance) + 50:
            print("Recharge successful!")
        else:
            print("Recharge failed or UI not updated.")

        # Verify persistence by reloading
        page.reload()
        time.sleep(2)
        persisted_balance = page.locator("#display-balance").inner_text()
        print(f"Persisted Balance: {persisted_balance}")

        if persisted_balance == new_balance:
             print("Persistence confirmed.")
        else:
             print("Persistence FAILED.")

        page.screenshot(path=os.path.abspath("verification/wallet_page.png"))

        browser.close()

if __name__ == "__main__":
    verify_system_consolidation()
