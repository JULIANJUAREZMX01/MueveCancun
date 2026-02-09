
import re
from playwright.sync_api import sync_playwright

def verify_xss():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to map page
        print("Navigating to map...")
        page.goto("http://localhost:4321/mapa")

        # Wait for map to load
        page.wait_for_selector("#map-container", timeout=10000)
        print("Map container found.")

        # Inject malicious event
        print("Injecting malicious event...")
        page.evaluate("""
            const event = new CustomEvent('SHOW_ROUTE_ON_MAP', {
                detail: {
                    legs: [{
                        stops_info: [
                            {name: '<b>MaliciousStop</b>', lat: 21.1619, lng: -86.8515},
                            {name: 'NormalStop', lat: 21.17, lng: -86.86}
                        ]
                    }]
                }
            });
            window.dispatchEvent(event);
        """)

        # Wait for markers to appear
        print("Waiting for markers...")
        # Leaflet markers have class 'leaflet-marker-icon'
        try:
            page.wait_for_selector(".leaflet-marker-icon", timeout=5000)
            print("Markers found.")
        except:
            print("No markers found! Dumping page content...")
            print(page.content())
            browser.close()
            return

        # Click the first marker (Start)
        print("Clicking marker...")
        page.locator(".leaflet-marker-icon").first.click()

        # Wait for popup
        print("Waiting for popup...")
        popup = page.wait_for_selector(".leaflet-popup-content", state="visible", timeout=5000)

        if popup:
            content = popup.inner_html()
            print(f"Popup Content: {content}")

            if "&lt;b&gt;MaliciousStop&lt;/b&gt;" in content or "<b>Inicio:</b> &lt;b&gt;MaliciousStop&lt;/b&gt;" in content:
                print("✅ SUCCESS: HTML was escaped!")
            elif "<b>MaliciousStop</b>" in content:
                print("❌ FAILURE: HTML was NOT escaped! XSS possible.")
            else:
                print("⚠️  UNCLEAR: Content didn't match expected patterns.")

        # Cleanup
        browser.close()

if __name__ == "__main__":
    verify_xss()
