
import re
from playwright.sync_api import sync_playwright

def verify_xss():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to map picker
        print("Navigating to map picker...")
        page.goto("http://localhost:4321/mapa?picker=destination")

        # Wait for map to load
        page.wait_for_selector("#map-container", timeout=10000)
        print("Map container found.")

        # Simulate click on map center (where a stop exists)
        print("Clicking map center...")
        # We need to click on the map canvas/container
        map_container = page.locator("#map-container")
        box = map_container.bounding_box()
        if box:
            center_x = box["x"] + box["width"] / 2
            center_y = box["y"] + box["height"] / 2
            page.mouse.click(center_x, center_y)
        else:
            print("Could not find map bounding box.")
            browser.close()
            return

        # Wait for popup
        print("Waiting for popup...")
        try:
            # The popup content wrapper
            popup = page.wait_for_selector(".leaflet-popup-content", state="visible", timeout=5000)

            # Find the button inside
            button = popup.query_selector("button")

            if button:
                onclick_attr = button.get_attribute("onclick")
                if onclick_attr:
                    print(f"❌ VULNERABILITY DETECTED: Inline 'onclick' attribute found: {onclick_attr}")
                else:
                    print("✅ SAFE: No inline 'onclick' attribute found. Event listener likely used.")
            else:
                print("⚠️  Button not found in popup.")

        except Exception as e:
            print(f"Error waiting for popup: {e}")
            # Dump content for debugging
            # print(page.content())

        # Cleanup
        browser.close()

if __name__ == "__main__":
    verify_xss()
