import re

with open('src/pages/pedidos.astro', 'r') as f:
    content = f.read()

new_html = """<div id="mode-qr" class="mode-panel" style="display:none;">

  <!-- Sub-tabs: QR Camera | OCR Foto -->
  <div class="scan-tabs" role="group" aria-label="Método de escaneo">
    <button class="scan-tab active" data-scan="qr"  aria-pressed="true">
      📷 Escanear QR
    </button>
    <button class="scan-tab"        data-scan="ocr" aria-pressed="false">
      📝 Foto de pedido
    </button>
  </div>

  <!-- Panel QR: cámara en tiempo real -->
  <div id="scan-qr-panel">
    <div id="qr-video-container" style="position:relative;border-radius:var(--radius-lg);overflow:hidden;background:#000;aspect-ratio:4/3;">
      <video id="qr-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;"></video>
      <canvas id="qr-canvas" style="display:none;"></canvas>
      <!-- Visor de enfoque -->
      <div id="qr-viewfinder" style="position:absolute;inset:15%;border:2px solid var(--color-primary);border-radius:8px;box-shadow:0 0 0 1000px rgba(0,0,0,0.4);"></div>
      <!-- Estado -->
      <div id="qr-status" style="position:absolute;bottom:0.75rem;left:0;right:0;text-align:center;font-size:0.75rem;font-weight:700;color:white;">
        Apunta al código QR
      </div>
    </div>
    <button id="btn-start-qr" class="btn-primary btn-md" style="width:100%;margin-top:0.75rem;">
      Activar cámara QR
    </button>
    <button id="btn-stop-qr" class="btn-secondary btn-sm" style="width:100%;margin-top:0.5rem;display:none;">
      Detener cámara
    </button>
  </div>

  <!-- Panel OCR: foto o archivo -->
  <div id="scan-ocr-panel" style="display:none;">
    <div id="ocr-preview-container" style="border-radius:var(--radius-lg);overflow:hidden;background:var(--surface-elevated);border:1px dashed var(--border-light);aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;">
      <div id="ocr-placeholder" style="text-align:center;padding:1rem;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style="color:var(--text-tertiary);margin-bottom:0.5rem;display:block;margin-inline:auto;">
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
        <p style="font-size:0.8125rem;color:var(--text-tertiary);margin:0;">Toma o selecciona una foto del pedido</p>
      </div>
      <img id="ocr-preview-img" style="display:none;width:100%;height:100%;object-fit:contain;" alt="Vista previa" />
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.75rem;">
      <button id="btn-take-photo" class="btn-primary btn-md">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M12 7a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5m-7-1H3V6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2l-2-2H9l-2 2z"/></svg>
        Tomar foto
      </button>
      <label class="btn-secondary btn-md" style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.375rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
        Galería
        <input id="file-ocr" type="file" accept="image/*" capture="environment" style="display:none;" />
      </label>
    </div>

    <div id="ocr-processing" style="display:none;text-align:center;padding:1rem;">
      <div style="width:24px;height:24px;border:3px solid var(--color-primary);border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 0.5rem;"></div>
      <p style="font-size:0.8125rem;color:var(--text-secondary);margin:0;">Analizando texto...</p>
    </div>
  </div>

  <!-- Resultado del escaneo -->
  <div id="scan-result" style="display:none;margin-top:0.75rem;padding:0.75rem;background:var(--color-primary-light);border:1px solid var(--color-primary);border-radius:var(--radius-lg);">
    <p style="font-size:0.75rem;font-weight:700;color:var(--text-brand);margin:0 0 0.375rem;">Datos detectados — revisa y edita:</p>
    <div id="scan-result-content" style="font-size:0.8125rem;color:var(--text-secondary);"></div>
    <button id="btn-apply-scan" class="btn-primary btn-sm" style="width:100%;margin-top:0.625rem;">
      Usar estos datos
    </button>
    <button id="btn-discard-scan" class="btn-secondary btn-sm" style="width:100%;margin-top:0.375rem;">
      Descartar
    </button>
  </div>

</div>"""

pattern = r'<div id="mode-qr" class="mode-panel" style="display:none;">.*?</div>\s*</div>'

new_content = re.sub(pattern, new_html, content, flags=re.DOTALL)

with open('src/pages/pedidos.astro', 'w') as f:
    f.write(new_content)

print("HTML replacement complete.")
