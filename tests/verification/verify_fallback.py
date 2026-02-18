
from playwright.sync_api import sync_playwright
import time

def run(p):
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:4321")

    # Wait for hydration
    time.sleep(2)

    origin = page.locator("#origin-input")
    origin.fill("Aeropuerto")
    origin.click()

    dropdown = page.locator(".graffiti-dropdown").first
    dropdown.wait_for(state="visible", timeout=5000)

    # Evaluate JS to get styles
    styles = page.evaluate("""() => {
        const dd = document.querySelector('.graffiti-dropdown');
        const input = document.getElementById('origin-input');
        const style = window.getComputedStyle(dd);
        const inputStyle = window.getComputedStyle(input);
        return {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            top: style.top,
            left: style.left,
            position: style.position,
            width: style.width,
            height: style.height,
            zIndex: style.zIndex,
            anchorName: inputStyle.anchorName,
            positionAnchor: style.positionAnchor,
            transform: style.transform
        };
    }""")

    print("Dropdown Styles:", styles)

    page.screenshot(path="verification/dropdown_debug.png")
    browser.close()

with sync_playwright() as p:
    run(p)
