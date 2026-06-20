import { getMessagingForBranch } from './_lib/firebaseAdmin.js';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return json(res, 400, { error: 'Geçersiz JSON' });
    }
  }

  const branchKey = body?.branchKey;
  const token = (body?.token || '').trim();

  if (!branchKey || !token) {
    return json(res, 400, { error: 'branchKey ve token gerekli' });
  }

  try {
    const messaging = getMessagingForBranch(branchKey);

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const origin = host ? `${protocol}://${host}` : '';
    const iconUrl = origin ? `${origin}/icons/icon-192.png` : '/icons/icon-192.png';
    const openUrl = origin ? `${origin}/?tab=notifications` : '/?tab=notifications';

    const title = 'MAKARA · Test bildirimi';
    const testBody = 'Push çalışıyor — bu cihaz bildirim alabiliyor.';

    const response = await messaging.sendEachForMulticast({
      tokens: [token],
      data: {
        type: 'staff_announcement',
        branchKey: String(branchKey),
        announcementId: '',
        title,
        body: testBody,
      },
      webpush: {
        headers: { Urgency: 'high', TTL: '86400' },
        fcmOptions: { link: openUrl },
        notification: { title, body: testBody, icon: iconUrl },
      },
    });

    let firstError = null;
    response.responses.forEach((item) => {
      if (!item.success && !firstError && item.error?.message) {
        firstError = item.error.message;
      }
    });

    return json(res, 200, {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      totalTokens: 1,
      firstError,
    });
  } catch (err) {
    console.error('push-self-test error:', err);
    return json(res, 500, { error: err.message || 'Test push gönderilemedi' });
  }
}
