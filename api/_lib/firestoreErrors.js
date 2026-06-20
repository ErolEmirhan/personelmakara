export function isFirestoreQuotaError(err) {
  const message = err?.message || String(err || '');
  return message.includes('RESOURCE_EXHAUSTED') || message.includes('Quota exceeded');
}

export function firestoreErrorResponse(err) {
  if (isFirestoreQuotaError(err)) {
    return {
      status: 429,
      body: {
        error: 'Firebase günlük kotası doldu. Birkaç saat sonra tekrar deneyin veya Firebase Console → Blaze planına geçin.',
        code: 'firestore_quota_exceeded',
      },
    };
  }
  return {
    status: 500,
    body: { error: err?.message || 'Firestore hatası' },
  };
}
