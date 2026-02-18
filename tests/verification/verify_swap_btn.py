from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))

        # Navigate to home
        page.goto("http://localhost:4321/home")

        swap_btn = page.locator("#swap-btn")
        origin = page.locator("#origin-input")
        dest = page.locator("#destination-input")

        print("Filling inputs...")
        origin.fill("Origin A")
        dest.fill("Destination B")

        print(f"Origin value before swap: '{origin.input_value()}'")
        print(f"Dest value before swap: '{dest.input_value()}'")

        print("Clicking swap button...")
        try:
            swap_btn.click(timeout=2000)
            print("Click successful.")
        except Exception as e:
            print(f"Click failed: {e}")
            print("Trying force click...")
            swap_btn.click(force=True)

        page.wait_for_timeout(1000)

        orig_val = origin.input_value()
        dest_val = dest.input_value()
        print(f"Origin value after swap: '{orig_val}'")
        print(f"Dest value after swap: '{dest_val}'")

        if orig_val == "Destination B" and dest_val == "Origin A":
             print("SUCCESS: Values swapped.")
        else:
             print("FAILURE: Values not swapped.")

        browser.close()

if __name__ == "__main__":
    run()
