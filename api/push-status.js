import { getAdminForBranch } from './_lib/firebaseAdmin.js';

const STAFF_PUSH_TOKENS = 'staff_push_tokens';

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

  if (!branchKey || staffId == null) {
    return json(res, 400, { error: 'branchKey ve staffId gerekli' });
  }

  try {
    const { db } = getAdminForBranch(branchKey);

    const staffRef = db.collection(STAFF_PUSH_TOKENS).doc(String(staffId));
    const staffSnap = await staffRef.get();
    const staffData = staffSnap.exists ? staffSnap.data() : null;
    const staffTokens = staffData?.tokens || [];

    const branchSnap = await db.collection(STAFF_PUSH_TOKENS).where('branchKey', '==', branchKey).get();
    let branchTokenCount = 0;
    branchSnap.forEach((docSnap) => {
      branchTokenCount += (docSnap.data()?.tokens || []).length;
    });

    return json(res, 200, {
      success: true,
      staffRegistered: staffTokens.length > 0,
      staffTokenCount: staffTokens.length,
      branchTokenCount,
      branchDeviceCount: branchSnap.size,
    });
  } catch (err) {
    console.error('push-status error:', err);
    return json(res, 500, { error: err.message || 'Durum okunamadı' });
  }
}
