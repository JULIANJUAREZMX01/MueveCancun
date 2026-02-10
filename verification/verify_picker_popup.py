from playwright.sync_api import sync_playwright

def verify_picker_popup():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to map picker mode
        print("Navigating to map picker...")
        page.goto("http://localhost:4321/mapa?picker=destination")

        # Wait for map
        page.wait_for_selector("#map-container", timeout=20000)
        print("Map container found.")

        # Wait a bit for coordinates to load (async)
        page.wait_for_timeout(3000)

        print("Clicking map center...")
        # Get map container bounding box
        box = page.locator("#map-container").bounding_box()
        if box:
            x = box['x'] + box['width'] / 2
            y = box['y'] + box['height'] / 2
            page.mouse.click(x, y)
        else:
            print("Could not find map container box.")
            browser.close()
            return

        # Wait for popup
        print("Waiting for popup...")
        try:
            # Check for either picker popup or toast if no stop found
            # If we click near a stop (minDist < 1500), popup appears.
            # 1500 meters is huge, so it should find something.
            popup = page.wait_for_selector(".leaflet-popup-content", state="visible", timeout=5000)

            if popup:
                print("Popup found.")
                # Check for the button
                button = popup.query_selector("button")
                if button:
                    text = button.inner_text()
                    print(f"Button text: {text}")
                    if "USAR ESTA PARADA" in text:
                        print("✅ SUCCESS: Picker popup rendered correctly.")
                    else:
                        print("❌ FAILURE: Button text mismatch.")
                else:
                    print("❌ FAILURE: No button in popup.")

                # Take screenshot
                page.screenshot(path="verification/picker_popup.png")
                print("Screenshot saved to verification/picker_popup.png")
            else:
                print("No popup found.")
                page.screenshot(path="verification/picker_failed.png")

        except Exception as e:
            print(f"Error waiting for popup: {e}")
            page.screenshot(path="verification/picker_error.png")

        browser.close()

if __name__ == "__main__":
    verify_picker_popup()
