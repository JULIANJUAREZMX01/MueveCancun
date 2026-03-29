from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://localhost:4321/es/home')

    # Wait for things to settle
    page.wait_for_timeout(3000)

    # Try to find elements
    print(f"Origin visible: {page.is_visible('#origin-input')}")
    print(f"Search visible: {page.is_visible('#search-btn')}")

    page.fill('#origin-input', 'la rehoyada')
    page.fill('#destination-input', 'zona hotelera')

    # Force click if disabled? No, let's see if it enables
    search_enabled = False
    for _ in range(10):
        if page.is_enabled('#search-btn'):
            print("Search button enabled!")
            search_enabled = True
            break
        page.wait_for_timeout(1000)

    if not search_enabled:
        print("Search button did not become enabled after waiting 10 seconds.")
        page.screenshot(path='verification/results_v3.png')
        browser.close()
        raise RuntimeError("Cannot click '#search-btn' because it remained disabled.")

    page.click('#search-btn')
    page.wait_for_timeout(3000)
    page.screenshot(path='verification/results_v3.png')
    browser.close()
