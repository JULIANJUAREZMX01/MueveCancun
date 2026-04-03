from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        page = context.new_page()

        try:
            print('Navigating to home...')
            page.goto('http://localhost:4321/es/home')

            # Wait for map loader to disappear
            page.wait_for_selector('#map-loader', state='hidden', timeout=15000)
            print('Map loaded.')

            # Wait for search button to be ENABLED (WASM ready)
            search_btn = page.locator('#search-btn')
            expect(search_btn).to_be_enabled(timeout=20000)
            print('WASM Ready (Search button enabled).')

            page.fill('#origin-input', 'la rehoyada')
            page.fill('#destination-input', 'zona hotelera')

            search_btn.click()

            # Wait for results area to populate
            page.wait_for_selector('#best-result-area div.glass-card', state='visible', timeout=15000)
            print('Results rendered.')

            # Click "Ver Mapa"
            map_btn = page.locator('.view-map-btn').first
            map_btn.click()

            time.sleep(2) # Transition time

            page.screenshot(path='verification/final_results_with_map.png')
            print('Verification SUCCESS.')

        except Exception as e:
            print(f'Verification error: {e}')
            page.screenshot(path='verification/final_error.png')
        finally:
            browser.close()

if __name__ == '__main__':
    run_verification()
