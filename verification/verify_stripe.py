import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        # Test Donate Page
        await page.goto("http://localhost:4321/es/donate")
        await page.wait_for_timeout(3000) # Wait for Stripe script to load

        # Check for Stripe Buy Buttons
        buy_buttons = await page.query_selector_all('stripe-buy-button')
        print(f"Found {len(buy_buttons)} stripe-buy-buttons")

        button_ids = [await b.get_attribute('buy-button-id') for b in buy_buttons]
        expected_ids = ["buy_btn_1THXtT2dM2f4HRxoMj7g4bnI", "buy_btn_1THY6Z2dM2f4HRxoh7vBIRkB"]

        for eid in expected_ids:
            if eid in button_ids:
                print(f"SUCCESS: buy-button-id '{eid}' found")
            else:
                print(f"FAILURE: buy-button-id '{eid}' NOT found")

        # Check for QR images
        qr_shield = await page.query_selector('img[src="/qr-shield.png"]')
        qr_architect = await page.query_selector('img[src="/qr-architect.png"]')

        if qr_shield: print("SUCCESS: Shield QR found")
        else: print("FAILURE: Shield QR NOT found")

        if qr_architect: print("SUCCESS: Architect QR found")
        else: print("FAILURE: Architect QR NOT found")

        await page.screenshot(path="verification-artifacts/05_stripe_complete.png", full_page=True)
        print("Captured complete Stripe integration screenshot")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
