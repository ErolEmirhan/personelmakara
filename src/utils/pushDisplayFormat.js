/** PWA push bildiriminde OS uygulama adının altında görünecek metin düzeni */

const DEFAULT_HEADLINE = 'MAKARA · Ekip bildirimi';

export function formatPushNotificationDisplay(customTitle, message) {
  const headline = (customTitle || '').trim();
  const text = (message || '').trim();
  const hasHeadline = headline && headline !== DEFAULT_HEADLINE;

  // title boş bırakılamaz; görünmez karakter — üstte ekstra "MAKARA" satırı çıkmasın.
  return {
    title: '\u200B',
    body: hasHeadline ? `${headline}\n${text}` : text,
  };
}
