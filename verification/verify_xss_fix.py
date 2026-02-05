from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        try:
            print("Navigating to /rutas...")
            page.goto("http://localhost:3000/rutas")

            print("Waiting for routes container to be visible...")
            page.wait_for_selector("#routes-container:not(.hidden)", timeout=20000)

            print("Taking screenshot...")
            page.screenshot(path="verification/rutas_page.png", full_page=True)
            print("Screenshot saved to verification/rutas_page.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
