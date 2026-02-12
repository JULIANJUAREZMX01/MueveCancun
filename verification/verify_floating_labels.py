import time
from playwright.sync_api import sync_playwright

def verify_floating_labels():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        try:
            print("Navigating to /contribuir...")
            page.goto("http://localhost:4321/contribuir")

            page.wait_for_selector("#contribution-form")

            print("Taking initial screenshot...")
            page.screenshot(path="verification/floating_labels_1_initial.png")

            print("Focusing on 'Nombre Completo'...")
            page.click("input[name='name']")
            time.sleep(0.5)
            print("Taking focused screenshot...")
            page.screenshot(path="verification/floating_labels_2_focused.png")

            print("Typing 'Juan Perez'...")
            page.type("input[name='name']", "Juan Perez")
            time.sleep(0.5)

            print("Blurring...")
            # Click h1 to blur safely
            page.click("h1")
            time.sleep(0.5)
            print(f"Current URL: {page.url}")
            print("Taking filled screenshot...")
            page.screenshot(path="verification/floating_labels_3_filled.png")

            print("Checking textarea...")
            # Check if textarea exists before clicking
            if page.query_selector("textarea[name='details']"):
                print("Found textarea!")
                page.click("textarea[name='details']")
                time.sleep(0.5)
                print("Taking textarea focused screenshot...")
                page.screenshot(path="verification/floating_labels_4_textarea_focused.png")
            else:
                print("Textarea NOT FOUND!")
                print("Body HTML:")
                print(page.inner_html("body"))

            print("Verification complete.")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_floating_labels()
