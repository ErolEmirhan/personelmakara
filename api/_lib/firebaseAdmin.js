import admin from 'firebase-admin';

const CREDENTIAL_ENV_BY_BRANCH = {
  makara: 'FIREBASE_ADMIN_CREDENTIALS_MAKARA',
};

const initialized = new Map();

export function getAdminForBranch(branchKey) {
  const envName = CREDENTIAL_ENV_BY_BRANCH[branchKey];
  if (!envName) {
    throw new Error(`Push bildirimi bu şube için henüz yapılandırılmadı: ${branchKey}`);
  }

  if (initialized.has(branchKey)) {
    return initialized.get(branchKey);
  }

  const raw = process.env[envName];
  if (!raw) {
    throw new Error(`Sunucu yapılandırması eksik (${envName})`);
  }

  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error(`${envName} geçerli JSON değil`);
  }

  const app = admin.initializeApp(
    {
      credential: admin.credential.cert(credentials),
    },
    `makara-admin-${branchKey}`
  );

  initialized.set(branchKey, { app, db: admin.firestore(app), messaging: admin.messaging(app) });
  return initialized.get(branchKey);
}

export function canSendAnnouncements(staff) {
  return !!(staff?.is_admin || staff?.is_manager || staff?.is_boss);
}
