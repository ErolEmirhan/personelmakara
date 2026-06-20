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

export const SUPPORT_IMAGE_MAX_BYTES = 480_000;

export function validateSupportImageDataUrl(dataUrl) {
  if (!dataUrl?.startsWith('data:image/')) {
    throw new Error('Geçersiz görsel');
  }
  if (dataUrl.length > SUPPORT_IMAGE_MAX_BYTES) {
    throw new Error('Görsel çok büyük — daha küçük alan seçin');
  }
}
