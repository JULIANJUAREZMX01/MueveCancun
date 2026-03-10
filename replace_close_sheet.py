with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

target = """  function closeAddSheet() {
    document.getElementById('add-overlay')!.classList.remove('open');"""

replacement = """  function closeAddSheet() {
    stopQRScanner();
    document.getElementById('add-overlay')!.classList.remove('open');"""

if target in content:
    new_content = content.replace(target, replacement)
    with open('src/pages/pedidos.astro', 'w') as f:
        f.write(new_content)
    print("closeAddSheet modified successfully.")
else:
    print("Could not find closeAddSheet.")
