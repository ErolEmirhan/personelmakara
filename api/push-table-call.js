import { getAdminForBranch, getMessagingForBranch } from './_lib/firebaseAdmin.js';

const STAFF_PUSH_TOKENS = 'staff_push_tokens';
const TABLE_CALL_PUSH_LOG = 'table_call_push_log';
const MAX_TOKENS_PER_BATCH = 500;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function normalizeTokens(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((t) => typeof t === 'string' && t.length > 20))];
}

async function fetchBranchPushTokens(db, branchKey) {
  const snap = await db.collection(STAFF_PUSH_TOKENS).where('branchKey', '==', branchKey).get();
  const tokens = new Set();
  snap.forEach((docSnap) => {
    for (const token of docSnap.data()?.tokens || []) {
      if (typeof token === 'string' && token.length > 20) tokens.add(token);
    }
  });
  return [...tokens];
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

  const branchKey = body?.branchKey || 'makara';
  const tableNumber = body?.tableNumber ?? body?.table_number ?? null;
  const callId = body?.callId || body?.call_id || null;
  const optionalSecret = process.env.PUSH_API_SECRET;

  if (optionalSecret && body?.secret !== optionalSecret) {
    return json(res, 401, { error: 'Yetkisiz istek' });
  }

  if (tableNumber == null || String(tableNumber).trim() === '') {
    return json(res, 400, { error: 'tableNumber gerekli' });
  }

  const tableLabel = String(tableNumber).trim();
  const message = `MASA ${tableLabel} Garson Çağırıyor`;
  const title = 'Garson çağrısı';
  const dedupeId = callId ? String(callId) : `manual-${tableLabel}-${Date.now()}`;

  try {
    const { db } = getAdminForBranch(branchKey);
    const logRef = db.collection(TABLE_CALL_PUSH_LOG).doc(dedupeId);
    const existing = await logRef.get();
    if (existing.exists) {
      return json(res, 200, {
        success: true,
        sent: 0,
        skipped: true,
        reason: 'already_sent',
      });
    }

    const tokens = normalizeTokens(body?.tokens).length
      ? normalizeTokens(body?.tokens)
      : await fetchBranchPushTokens(db, branchKey);

    if (!tokens.length) {
      return json(res, 200, { success: true, sent: 0, message: 'Kayıtlı cihaz yok' });
    }

    const messaging = getMessagingForBranch(branchKey);
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const origin = host ? `${protocol}://${host}` : '';
    const openUrl = origin ? `${origin}/?tab=tables` : '/?tab=tables';

    let sent = 0;
    let failed = 0;
    const invalidTokens = [];

    for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_BATCH) {
      const chunk = tokens.slice(i, i + MAX_TOKENS_PER_BATCH);
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title,
          body: message,
        },
        data: {
          type: 'table_call',
          branchKey: String(branchKey),
          callId: dedupeId,
          tableNumber: tableLabel,
          title,
          body: message,
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
        const code = item.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(chunk[index]);
        }
      });
    }

    await logRef.set({
      callId: dedupeId,
      tableNumber: tableLabel,
      sentAt: new Date(),
      source: 'push_table_call_api',
      sent,
      failed,
    });

    return json(res, 200, {
      success: true,
      sent,
      failed,
      totalTokens: tokens.length,
      invalidTokens,
      callId: dedupeId,
    });
  } catch (err) {
    console.error('push-table-call error:', err);
    return json(res, 500, { error: err.message || 'Push gönderilemedi' });
  }
}
