import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})

        # Wait for preview server
        url = "http://localhost:4321/home"
        for i in range(10):
            try:
                await page.goto(url)
                break
            except:
                await asyncio.sleep(1)

        print(f"Page title: {await page.title()}")

        # Check if button has correct text (initially Loading... then CALCULATE ROUTE)
        btn = page.locator("#search-btn")
        await btn.wait_for(state="visible")

        # Wait for WASM load
        await page.wait_for_function("document.getElementById('search-btn').disabled === false", timeout=30000)

        btn_text = await page.locator("#btn-text").text_content()
        print(f"Button text: {btn_text.strip()}")

        # Perform a search
        await page.fill("#origin-input", "El Crucero Hub")
        await page.fill("#destination-input", "Plaza Las Américas")

        # Dismiss autocomplete if it intercepts
        await page.evaluate("document.activeElement.blur()")
        await asyncio.sleep(0.5) # Wait for animation

        await btn.click()

        # Wait for results
        results_info = page.locator("#results-info")
        await results_info.wait_for(state="visible", timeout=10000)

        count_label = await page.locator("#results-count-label").text_content()
        print(f"Results count: {count_label.strip()}")

        # Take screenshot of results
        await page.screenshot(path="results_verification.png")

        # Click "View Map"
        view_map_btn = page.locator(".view-map-btn").first
        await view_map_btn.click()

        # Check if map is visible
        await page.wait_for_timeout(2000) # Wait for animation/render
        await page.screenshot(path="map_verification.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
