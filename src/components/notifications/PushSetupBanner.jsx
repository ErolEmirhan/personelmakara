import {
  fetchPushRegistrationStatus,
  isPushConfiguredForBranch,
  isPushRegisteredLocally,
  pushRegistrationErrorMessage,
  registerStaffPushNotifications,
} from '../../services/pushNotifications';

export function PushSetupBanner({ branchKey, staffId, message, onRetry, onDismiss }) {
  if (!message) return null;

  return (
    <div className="mx-4 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 shadow-sm">
      <p className="text-xs font-semibold text-amber-900">Push bildirimi kurulamadı</p>
      <p className="text-[11px] text-amber-800/90 mt-1 leading-relaxed">{message}</p>
      <div className="flex gap-2 mt-2">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-600 text-white active:scale-[0.98]"
          >
            Tekrar dene
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white text-amber-800 border border-amber-200"
          >
            Kapat
          </button>
        )}
      </div>
    </div>
  );
}

export async function resolvePushSetupMessage(branchKey, staffId, entryResult) {
  if (!isPushConfiguredForBranch(branchKey)) {
    return 'Push yapılandırması eksik (VAPID anahtarı build\'e girmemiş olabilir).';
  }

  if (entryResult?.ok && isPushRegisteredLocally(staffId)) {
    return '';
  }

  if (entryResult && !entryResult.ok && entryResult.reason !== 'already_prompted') {
    return pushRegistrationErrorMessage(entryResult.reason, entryResult.error);
  }

  if (Notification.permission === 'granted' && !isPushRegisteredLocally(staffId)) {
    try {
      const status = await fetchPushRegistrationStatus(branchKey, staffId);
      if (status.staffRegistered) {
        return '';
      }
      return 'İzin verildi ama cihaz sunucuya kaydedilmedi. Tekrar deneyin veya Ayarlar → Cihazı kaydet.';
    } catch (err) {
      return err.message || 'Push sunucusu yanıt vermiyor.';
    }
  }

  return '';
}

export async function retryPushRegistration(branchKey, staffId) {
  return registerStaffPushNotifications(branchKey, staffId, { forceSync: true });
}
