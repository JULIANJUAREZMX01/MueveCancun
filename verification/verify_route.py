from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            response = page.goto("http://localhost:4321/ruta/de-oxxo-villas-otoch-paraiso-el-arco-a-zona-hotelera-hasta-retornar/")
            if response.status != 200:
                print(f"Failed to load page: {response.status}")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/route_page.png", full_page=True)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
