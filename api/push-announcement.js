import { getMessagingForBranch } from './_lib/firebaseAdmin.js';

const MAX_TOKENS_PER_BATCH = 500;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function normalizeTokens(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((t) => typeof t === 'string' && t.length > 20))];
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
  const title = (body?.title || '').trim();
  const message = (body?.message || '').trim();
  const announcementId = body?.announcementId || null;
  const tokens = normalizeTokens(body?.tokens);

  if (!branchKey || !message) {
    return json(res, 400, { error: 'branchKey ve message gerekli' });
  }

  const optionalSecret = process.env.PUSH_API_SECRET;
  if (optionalSecret && body?.secret !== optionalSecret) {
    return json(res, 401, { error: 'Yetkisiz istek' });
  }

  if (tokens.length === 0) {
    return json(res, 200, { success: true, sent: 0, message: 'Kayıtlı cihaz yok' });
  }

  try {
    const messaging = getMessagingForBranch(branchKey);

    const notificationTitle = title || 'MAKARA';
    const notificationBody = message.length > 180 ? `${message.slice(0, 177)}…` : message;

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const origin = host ? `${protocol}://${host}` : '';

    const openUrl = origin ? `${origin}/?tab=notifications` : '/?tab=notifications';

    let sent = 0;
    let failed = 0;
    const invalidTokens = [];
    let firstError = null;

    for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_BATCH) {
      const chunk = tokens.slice(i, i + MAX_TOKENS_PER_BATCH);
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        data: {
          type: 'staff_announcement',
          branchKey: String(branchKey),
          announcementId: String(announcementId || ''),
          title: notificationTitle,
          body: notificationBody,
        },
        webpush: {
          headers: {
            Urgency: 'high',
            TTL: '86400',
          },
          fcmOptions: {
            link: openUrl,
          },
        },
      });

      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((item, index) => {
        if (item.success) return;
        if (!firstError && item.error?.message) {
          firstError = item.error.message;
        }
        const code = item.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(chunk[index]);
        }
      });
    }

    return json(res, 200, {
      success: true,
      sent,
      failed,
      totalTokens: tokens.length,
      invalidTokens,
      firstError,
    });
  } catch (err) {
    console.error('push-announcement error:', err);
    return json(res, 500, { error: err.message || 'Push gönderilemedi' });
  }
}
