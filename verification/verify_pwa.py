from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    try:
        # Use Port 4323
        print("Navigating to root (4323)...")
        page.goto("http://localhost:4323", wait_until="load")
        page.wait_for_timeout(3000)

        page.screenshot(path="verification/screenshots/01_tutorial_start.png")

        for i in range(3):
            page.get_by_text("Siguiente").click()
            page.wait_for_timeout(500)

        page.screenshot(path="verification/screenshots/02_tutorial_end.png")

        print("Clicking Start...")
        page.get_by_text("Comenzar en Español").click()
        page.wait_for_timeout(5000)

        print(f"Current URL: {page.url}")
        page.screenshot(path="verification/screenshots/03_after_start.png")

        # Try direct navigation with state
        print("Direct navigation to /es/home...")
        page.goto("http://localhost:4323/es/home", wait_until="load")
        page.wait_for_timeout(5000)
        print(f"Final URL: {page.url}")
        page.screenshot(path="verification/screenshots/04_home_es.png")

    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/screenshots/error.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
