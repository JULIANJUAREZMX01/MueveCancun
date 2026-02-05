from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_pages(page: Page):
    # Verify Home (Dashboard)
    print("Navigating to Home...")
    page.goto("http://localhost:4321/home")
    expect(page.get_by_text("CancúnMueve")).to_be_visible()
    expect(page.get_by_text("TRAZAR RUTA")).to_be_visible()
    page.screenshot(path="verification/home.png")
    print("Home verified.")

    # Verify Wallet & Modal
    print("Navigating to Wallet...")
    page.goto("http://localhost:4321/wallet")
    expect(page.get_by_text("$180")).to_be_visible()

    # Open Modal
    print("Opening Modal...")
    page.get_by_role("button", name="Recargar").click()
    expect(page.get_by_text("Recargar Saldo", exact=True)).to_be_visible()
    page.screenshot(path="verification/wallet_modal.png")

    # Close Modal (click Cancel)
    page.get_by_text("Cancelar").click()

    print("Wallet verified.")

    # Verify Tracking
    print("Navigating to Tracking...")
    page.goto("http://localhost:4321/tracking")
    expect(page.get_by_text("Ruta 12")).to_be_visible()
    page.screenshot(path="verification/tracking.png")
    print("Tracking verified.")

    # Verify Community
    print("Navigating to Community...")
    page.goto("http://localhost:4321/community")
    # Wait for the page to settle
    time.sleep(1)
    expect(page.get_by_text("Comunidad").first).to_be_visible()
    page.screenshot(path="verification/community.png")
    print("Community verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 375, "height": 812})
        try:
            verify_pages(page)
        finally:
            browser.close()
