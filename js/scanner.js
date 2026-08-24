// Barcode-scan via de native BarcodeDetector API (Chrome/Edge/Android).
// Geen ondersteuning (o.a. iOS Safari) → caller toont handmatige invoer.
const Scanner = (() => {
  let stream = null;
  let rafId = null;

  const supported = 'BarcodeDetector' in window;

  async function start(videoEl, onResult) {
    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
    });
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    videoEl.srcObject = stream;
    await videoEl.play();

    const tick = async () => {
      if (!stream) return;
      try {
        const codes = await detector.detect(videoEl);
        if (codes.length) {
          const value = codes[0].rawValue;
          stop(videoEl);
          onResult(value);
          return;
        }
      } catch { /* frame nog niet klaar */ }
      rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  function stop(videoEl) {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    if (videoEl) videoEl.srcObject = null;
  }

  // Open Food Facts: gratis lookup voor naam/merk bij onbekende EAN.
  async function lookup(ean) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name,brands`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== 1) return null;
      return {
        name: data.product.product_name || '',
        brand: data.product.brands || '',
      };
    } catch {
      return null;
    }
  }

  return { supported, start, stop, lookup };
})();
