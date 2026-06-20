function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Görsel yüklenemedi')));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

/** Dosyayı crop öncesi ham data URL olarak okur */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Geçersiz dosya türü'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/** Kare crop alanını JPEG data URL'e dönüştürür */
export async function getCroppedProfileDataUrl(imageSrc, pixelCrop, maxSize = 320) {
  return getCroppedImageDataUrl(imageSrc, pixelCrop, { maxEdge: maxSize, quality: 0.85 });
}

/** Destek mesajları için crop — en uzun kenar sınırlı, oran korunur */
export async function getCroppedImageDataUrl(imageSrc, pixelCrop, { maxEdge = 720, quality = 0.82 } = {}) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Görsel işlenemedi');

  const cropW = Math.max(1, Math.round(pixelCrop.width));
  const cropH = Math.max(1, Math.round(pixelCrop.height));
  const scale = maxEdge / Math.max(cropW, cropH);
  const outW = Math.max(1, Math.round(cropW * Math.min(1, scale)));
  const outH = Math.max(1, Math.round(cropH * Math.min(1, scale)));

  canvas.width = outW;
  canvas.height = outH;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH
  );

  return canvas.toDataURL('image/jpeg', quality);
}

/** Firestore belge limiti (~1MB) için base64 üst sınırı */
export const SUPPORT_IMAGE_MAX_BYTES = 750_000;

export function validateSupportImageDataUrl(dataUrl) {
  if (!dataUrl?.startsWith('data:image/')) {
    throw new Error('Geçersiz görsel');
  }
  if (dataUrl.length > SUPPORT_IMAGE_MAX_BYTES) {
    throw new Error('Görsel çok büyük — daha küçük bir fotoğraf seçin');
  }
}

/** Destek mesajı: kırpmadan orijinal en-boy; sadece limit aşılırsa oran korunarak sıkıştırılır */
export async function prepareSupportImageDataUrl(file) {
  const raw = await fileToDataUrl(file);
  if (raw.length <= SUPPORT_IMAGE_MAX_BYTES) {
    return raw;
  }

  const image = await createImage(raw);
  const srcW = image.naturalWidth || image.width;
  const srcH = image.naturalHeight || image.height;
  if (!srcW || !srcH) throw new Error('Görsel boyutu okunamadı');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Görsel işlenemedi');

  const encode = (width, height, quality) => {
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  };

  for (let quality = 0.9; quality >= 0.55; quality -= 0.05) {
    const out = encode(srcW, srcH, quality);
    if (out.length <= SUPPORT_IMAGE_MAX_BYTES) return out;
  }

  for (let scale = 0.92; scale >= 0.2; scale -= 0.08) {
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    for (let quality = 0.88; quality >= 0.55; quality -= 0.08) {
      const out = encode(width, height, quality);
      if (out.length <= SUPPORT_IMAGE_MAX_BYTES) return out;
    }
  }

  throw new Error('Görsel çok büyük — daha küçük bir fotoğraf seçin');
}
