with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

target = """  // ── Init ──
  function init() {"""

replacement = """  // ── Init ──
  function init() {
    // QR Scanner events
    document.getElementById('btn-start-qr')?.addEventListener('click', startQRScanner);
    document.getElementById('btn-stop-qr')?.addEventListener('click', stopQRScanner);
    document.getElementById('btn-apply-scan')?.addEventListener('click', applyScanResult);
    document.getElementById('btn-discard-scan')?.addEventListener('click', () => {
      document.getElementById('scan-result')!.style.display = 'none';
      scannedData = {};
    });

    // Sub-tabs QR vs OCR
    document.querySelectorAll('.scan-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = (tab as HTMLElement).dataset.scan!;
        document.querySelectorAll('.scan-tab').forEach(t => {
          t.classList.toggle('active', t === tab);
          (t as HTMLButtonElement).setAttribute('aria-pressed', String(t === tab));
        });
        const qrPanel  = document.getElementById('scan-qr-panel')!;
        const ocrPanel = document.getElementById('scan-ocr-panel')!;
        qrPanel.style.display  = mode === 'qr'  ? 'block' : 'none';
        ocrPanel.style.display = mode === 'ocr' ? 'block' : 'none';
        if (mode === 'ocr') stopQRScanner();  // Detener cámara QR si se cambia a OCR
      });
    });

    // OCR: tomar foto
    document.getElementById('btn-take-photo')?.addEventListener('click', async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        // Capturar frame
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        stream.getTracks().forEach(t => t.stop());
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Mostrar preview
        const img = document.getElementById('ocr-preview-img') as HTMLImageElement;
        const placeholder = document.getElementById('ocr-placeholder')!;
        img.src = dataUrl;
        img.style.display = 'block';
        placeholder.style.display = 'none';

        await runOCR(dataUrl);
      } catch {
        alert('No se pudo acceder a la cámara.');
      }
    });

    // OCR: subir archivo de galería
    document.getElementById('file-ocr')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const img = document.getElementById('ocr-preview-img') as HTMLImageElement;
      const placeholder = document.getElementById('ocr-placeholder')!;
      img.src = URL.createObjectURL(file);
      img.style.display = 'block';
      placeholder.style.display = 'none';

      await runOCR(file);
    });
"""

if target in content:
    new_content = content.replace(target, replacement)
    with open('src/pages/pedidos.astro', 'w') as f:
        f.write(new_content)
    print("init() modified successfully.")
else:
    print("Could not find init().")
