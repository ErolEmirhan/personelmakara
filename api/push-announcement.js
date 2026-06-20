import { getAdminForBranch, canSendAnnouncements } from './_lib/firebaseAdmin.js';
import { firestoreErrorResponse } from './_lib/firestoreErrors.js';

const STAFF_PUSH_TOKENS = 'staff_push_tokens';
const STAFF_COLLECTION = 'staff';
const MAX_TOKENS_PER_BATCH = 500;

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function collectBranchTokens(db, branchKey, excludeStaffId) {
  const snap = await db.collection(STAFF_PUSH_TOKENS).where('branchKey', '==', branchKey).get();
  const tokens = new Set();
  const tokenDocIds = new Map();

  snap.forEach((docSnap) => {
    if (excludeStaffId && docSnap.id === String(excludeStaffId)) return;
    const data = docSnap.data() || {};
    for (const token of data.tokens || []) {
      if (typeof token === 'string' && token.length > 20) {
        tokens.add(token);
        tokenDocIds.set(token, docSnap.id);
      }
    }
  });

  return { tokens: [...tokens], tokenDocIds };
}

async function removeInvalidTokens(db, tokensToRemove, tokenDocIds) {
  if (!tokensToRemove.length) return;

  const docIds = new Set(
    tokensToRemove.map((token) => tokenDocIds.get(token)).filter(Boolean)
  );

  if (docIds.size === 0) return;

  const batch = db.batch();
  let writes = 0;

  for (const docId of docIds) {
    const ref = db.collection(STAFF_PUSH_TOKENS).doc(docId);
    const docSnap = await ref.get();
    if (!docSnap.exists) continue;

    const data = docSnap.data() || {};
    const current = data.tokens || [];
    const next = current.filter((t) => !tokensToRemove.includes(t));
    if (next.length !== current.length) {
      batch.set(ref, { ...data, tokens: next, updatedAt: new Date() }, { merge: true });
      writes += 1;
    }
  }

  if (writes > 0) await batch.commit();
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
  const staffId = body?.staffId;
  const title = (body?.title || '').trim();
  const message = (body?.message || '').trim();
  const announcementId = body?.announcementId || null;

  if (!branchKey || staffId == null || !message) {
    return json(res, 400, { error: 'branchKey, staffId ve message gerekli' });
  }

  const optionalSecret = process.env.PUSH_API_SECRET;
  if (optionalSecret && body?.secret !== optionalSecret) {
    return json(res, 401, { error: 'Yetkisiz istek' });
  }

  try {
    const { db, messaging } = getAdminForBranch(branchKey);

    const staffSnap = await db.collection(STAFF_COLLECTION).doc(String(staffId)).get();
    if (!staffSnap.exists) {
      return json(res, 403, { error: 'Personel bulunamadı' });
    }

    const staff = staffSnap.data();
    if (staff.branchKey && staff.branchKey !== branchKey) {
      return json(res, 403, { error: 'Şube uyuşmuyor' });
    }
    if (!canSendAnnouncements(staff)) {
      return json(res, 403, { error: 'Bildirim gönderme yetkisi yok' });
    }

    const { tokens, tokenDocIds } = await collectBranchTokens(db, branchKey, null);
    if (tokens.length === 0) {
      return json(res, 200, { success: true, sent: 0, message: 'Kayıtlı cihaz yok' });
    }

    const notificationTitle = title || 'MAKARA · Ekip bildirimi';
    const notificationBody = message.length > 180 ? `${message.slice(0, 177)}…` : message;

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const protocol = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
    const origin = host ? `${protocol}://${host}` : '';

    let sent = 0;
    let failed = 0;
    const invalidTokens = [];
    let firstError = null;

    const iconUrl = origin ? `${origin}/icons/icon-192.png` : '/icons/icon-192.png';
    const openUrl = origin ? `${origin}/?tab=notifications` : '/?tab=notifications';

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
          notification: {
            title: notificationTitle,
            body: notificationBody,
            icon: iconUrl,
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

    await removeInvalidTokens(db, invalidTokens, tokenDocIds);

    return json(res, 200, {
      success: true,
      sent,
      failed,
      totalTokens: tokens.length,
      invalidRemoved: invalidTokens.length,
      firstError,
    });
  } catch (err) {
    console.error('push-announcement error:', err);
    const { status, body: errorBody } = firestoreErrorResponse(err);
    return json(res, status, errorBody);
  }
}
