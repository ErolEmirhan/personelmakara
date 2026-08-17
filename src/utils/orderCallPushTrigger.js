/**
 * QR menü — addDoc('OrderCalls') HEMEN SONRASI ekle.
 * Garson çağrısı push'u ile aynı API yolu.
 */
export async function sendOrderCallPushFromQrMenu({
  db,
  orderCallId,
  tableNumber,
  total,
  itemCount,
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

  const label = tableNumber != null ? String(tableNumber).trim() : '?';
  const title = 'Masa siparişi';
  const totalLabel = Number(total) > 0 ? `${Number(total).toLocaleString('tr-TR')} ₺` : '';
  const countLabel = Number(itemCount) > 0 ? `${itemCount} ürün` : '';
  const detail = [countLabel, totalLabel].filter(Boolean).join(' · ');
  const message = detail
    ? `MASA ${label} sipariş verdi · ${detail}`
    : `MASA ${label} sipariş verdi`;

  const root = pushApiOrigin.replace(/\/$/, '');

  const res = await fetch(`${root}/api/push-announcement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchKey,
      title,
      message,
      tokens: [...tokens],
      pushType: 'order_call',
      orderCallId,
      tableNumber: label,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Push gönderilemedi');
  }

  return data;
}
