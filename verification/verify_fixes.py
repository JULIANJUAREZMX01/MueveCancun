from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 390, 'height': 844})
        page = context.new_page()

        try:
            # 1. Load Home
            print('Navigating to home...')
            page.goto('http://localhost:4321/es/home')

            # Wait for map loader to disappear
            page.wait_for_selector('#map-loader', state='hidden', timeout=10000)
            print('Map loaded.')

            # 2. Test Search (Normalization check)
            print('Testing search normalization...')
            page.fill('#origin-input', 'la rehoyada') # Lowercase, no accents
            page.fill('#destination-input', 'zona hotelera')

            page.click('#search-btn')

            # Wait for results
            page.wait_for_selector('#best-result-area', state='visible', timeout=10000)
            print('Results found.')

            # 3. Test "Ver Mapa" (Bottom sheet check)
            print('Testing Bottom Sheet...')
            map_btn = page.locator('.view-map-btn').first
            map_btn.click()

            # Wait for transition
            time.sleep(2)

            page.screenshot(path='verification/final_state.png')
            print('Verification complete.')

        except Exception as e:
            print(f'Error during verification: {e}')
            page.screenshot(path='verification/error_state.png')
        finally:
            browser.close()

if __name__ == '__main__':
    run_verification()
