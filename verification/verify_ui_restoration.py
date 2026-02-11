from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to Home...")
        page.goto("http://localhost:4321/")

        # Verify Hero Headline
        if page.locator(".hero-headline h1").count() > 0:
            print("✅ Hero Headline found")
        else:
            print("❌ Hero Headline MISSING")

        # Verify Brand Animation
        if page.locator(".brand-tetris-container").count() > 0:
            print("✅ Brand Animation found")
        else:
            print("❌ Brand Animation MISSING")

        # Verify Quick Zones
        zones = page.locator(".zone-chip").count()
        if zones >= 3:
            print(f"✅ Quick Zones found: {zones}")
        else:
            print(f"❌ Quick Zones missing or too few: {zones}")

        # Verify Community Link
        if page.locator('a[href="/community"]').count() > 0:
            print("✅ Community Link found")
        else:
            print("❌ Community Link MISSING")

        print("Navigating to Catalog...")
        page.goto("http://localhost:4321/rutas")

        # Verify Routes
        routes = page.locator(".glass-card").count()
        if routes > 2:
            print(f"✅ Routes loaded correctly: {routes}")
        else:
            print(f"❌ Routes missing (only {routes} found)")

        # Screenshot
        page.screenshot(path="verification/ui_restored.png", full_page=True)
        print("📸 Screenshot saved to verification/ui_restored.png")

        browser.close()

if __name__ == "__main__":
    run()
