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

        # Check for Stripe Buy Button
        buy_button = await page.query_selector('stripe-buy-button')
        if buy_button:
            print("SUCCESS: stripe-buy-button found")
        else:
            print("FAILURE: stripe-buy-button not found")

        # Check for Architect link
        architect_link = await page.query_selector('a[href="https://donate.stripe.com/4gM5kw4ky1Ho12ccPp7AI02"]')
        if architect_link:
            print("SUCCESS: Architect direct link found")
        else:
            print("FAILURE: Architect direct link not found")

        await page.screenshot(path="verification-artifacts/04_stripe_integration.png", full_page=True)
        print("Captured Stripe integration screenshot")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
