import { getAdminForBranch } from './_lib/firebaseAdmin.js';

const STAFF_PUSH_TOKENS = 'staff_push_tokens';
const STAFF_COLLECTION = 'staff';
const MAX_TOKENS = 5;

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
  const staffId = body?.staffId;
  const token = (body?.token || '').trim();

  if (!branchKey || staffId == null || !token) {
    return json(res, 400, { error: 'branchKey, staffId ve token gerekli' });
  }

  try {
    const { db } = getAdminForBranch(branchKey);

    const staffSnap = await db.collection(STAFF_COLLECTION).doc(String(staffId)).get();
    if (!staffSnap.exists) {
      return json(res, 403, { error: 'Personel bulunamadı' });
    }

    const staff = staffSnap.data();
    if (staff.branchKey && staff.branchKey !== branchKey) {
      return json(res, 403, { error: 'Şube uyuşmuyor' });
    }

    const ref = db.collection(STAFF_PUSH_TOKENS).doc(String(staffId));
    const snap = await ref.get();
    const existing = snap.exists ? (snap.data().tokens || []) : [];
    const merged = [...new Set([...existing, token])].slice(-MAX_TOKENS);

    await ref.set(
      {
        staffId,
        branchKey,
        tokens: merged,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return json(res, 200, {
      success: true,
      tokenCount: merged.length,
    });
  } catch (err) {
    console.error('register-push-token error:', err);
    return json(res, 500, { error: err.message || 'Token kaydedilemedi' });
  }
}
