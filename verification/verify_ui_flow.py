from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        print("Navigating...")
        page.goto("http://localhost:4321/", timeout=60000)

        # 1. Check Hero
        print("Checking Hero...")
        # Wait for hydration
        time.sleep(2)

        hero_title = page.locator("#hero-section h1")
        print(f"Hero Title: {hero_title.text_content().strip()}")

        # Check City Swapper
        swapper = page.locator("#city-swapper")
        initial_city = swapper.text_content()
        print(f"Initial City: {initial_city}")

        # Wait for swap (3s interval)
        print("Waiting for city swap...")
        time.sleep(3.5)
        new_city = swapper.text_content()
        print(f"New City: {new_city}")

        if initial_city == new_city:
            print("WARNING: City did not swap.")
        else:
            print("SUCCESS: City swapped.")

        # 2. Check Route Calculator
        print("Checking Calculator...")
        btn = page.locator("#search-btn")
        print(f"Button Text: {btn.text_content().strip()}")

        # Fill inputs
        print("Filling inputs...")
        # We need to type to ensure events fire if any, but value setting is faster
        page.fill("#origin-input", "ADO Centro")
        page.fill("#destination-input", "Plaza Las Américas")

        # 3. Click Button
        print("Clicking Search...")
        btn.click()

        # 4. Check Button Text Change
        print("Checking button text change...")
        time.sleep(0.5)
        btn_txt = btn.text_content().strip()
        print(f"Button Text Post-Click: {btn_txt}")

        if "¿Como llegar?" in btn_txt or "How to get" in btn_txt:
             print("SUCCESS: Button text changed.")
        else:
             print("WARNING: Button text might not have changed yet or logic failed.")

        # 5. Wait for Transition (Map Active)
        print("Waiting for Map Expansion (up to 5s)...")
        time.sleep(5)

        map_section = page.locator("#map-section")
        classes = map_section.get_attribute("class")
        print(f"Map Section Classes: {classes}")

        if "fixed" in classes and "inset-0" in classes:
            print("SUCCESS: Map expanded.")
        else:
            print("FAIL: Map did not expand.")
            # Check for error message
            if page.locator(".bg-red-50").count() > 0:
                print("Error displayed on UI:", page.locator(".bg-red-50").text_content())

        # Check Hero Collapsed
        hero = page.locator("#hero-section")
        hero_classes = hero.get_attribute("class")
        if "opacity-0" in hero_classes:
            print("SUCCESS: Hero collapsed.")
        else:
            print("FAIL: Hero did not collapse.")

        # Screenshot
        page.screenshot(path="verification/ui_flow.png")
        print("Screenshot taken.")

    except Exception as e:
        print(f"Error: {e}")
        try:
            page.screenshot(path="verification/error_flow.png")
        except:
            pass
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
