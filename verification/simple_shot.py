from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://localhost:4321/es/home')
    page.wait_for_timeout(5000)
    page.screenshot(path='verification/home_v3.png')
    browser.close()
