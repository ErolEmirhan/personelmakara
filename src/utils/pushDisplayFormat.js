/** PWA push bildiriminde OS uygulama adının altında görünecek metin düzeni */

const DEFAULT_HEADLINE = 'MAKARA · Ekip bildirimi';

export function formatPushNotificationDisplay(customTitle, message) {
  const headline = (customTitle || '').trim();
  const text = (message || '').trim();
  const hasHeadline = headline && headline !== DEFAULT_HEADLINE;

  // title alanı OS'te "from …" satırının üstüne çıkıyor; özel başlık body'de.
  return {
    title: 'MAKARA',
    body: hasHeadline ? `${headline}\n${text}` : text,
  };
}
