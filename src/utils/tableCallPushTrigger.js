/**
 * QR menü — addDoc('tablecalls') HEMEN SONRASI ekle.
 * Ekip mesajı (sendAnnouncementPush) ile aynı API çağrısı.
 */
export async function sendTableCallPushFromQrMenu({
  db,
  callId,
  tableNumber,
  branchKey = 'makara',
  pushApiOrigin = 'https://personelmakara.vercel.app',
}) {
  const { collection, getDocs, query, where } = await import('firebase/firestore');

  const tokenSnap = await getDocs(
    query(collection(db, 'staff_push_tokens'), where('branchKey', '==', branchKey))
  );

  const tokens = new Set();
  tokenSnap.forEach((docSnap) => {
    for (const token of docSnap.data()?.tokens || []) {
      if (typeof token === 'string' && token.length > 20) tokens.add(token);
    }
  });

  if (!tokens.size) return { sent: 0, reason: 'no_tokens' };

  const title = 'Garson çağrısı';
  const message = `MASA ${tableNumber} Garson Çağırıyor`;
  const root = pushApiOrigin.replace(/\/$/, '');

  const res = await fetch(`${root}/api/push-announcement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchKey,
      title,
      message,
      tokens: [...tokens],
      announcementId: callId ? `tablecall-${callId}` : undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Push gönderilemedi');
  }

  return data;
}
