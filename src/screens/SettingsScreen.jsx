import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useApp } from '../context/AppContext';
import { StaffAvatar } from '../components/ui/StaffAvatar';
import { ProfileImageCropModal } from '../components/modals/ProfileImageCropModal';
import { LogoutModal } from '../components/modals/LogoutModal';
import {
  changeStaffPassword,
  updateStaffMemberProfile,
  updateStaffProfileImage,
} from '../services/firebaseService';
import { fileToDataUrl } from '../services/staffProfileImage';
import { staffRoleLabel, canSendStaffAnnouncements } from '../utils/staffRole';
import { StaffAnnouncementComposer } from '../components/settings/StaffAnnouncementComposer';
import {
  DEFAULT_NOTIFICATION_PREFS,
  loadNotificationPrefs,
  saveNotificationPrefs,
} from '../utils/notificationPrefs';
import {
  getPushPermissionState,
  isPushConfiguredForBranch,
  isPushRegisteredLocally,
  isPushSupported,
  pushRegistrationErrorMessage,
  registerStaffPushNotifications,
  syncStaffPushToken,
} from '../services/pushNotifications';
import { BOTTOM_NAV_PADDING } from '../constants/nav';

function SettingsCard({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_-20px_rgba(15,23,42,0.12)] overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </h3>
        </div>
      )}
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

function FieldInput({ label, value, onChange, type = 'text', placeholder, autoComplete }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-300 focus:bg-white transition-colors"
      />
    </label>
  );
}

function SettingsToggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 last:pb-0 first:pt-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-violet-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsScreen() {
  const { staff, updateStaff } = useAuth();
  const { theme, branchKey } = useBranch();
  const { showToast } = useApp();
  const fileRef = useRef(null);

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passError, setPassError] = useState('');

  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIFICATION_PREFS);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(false);
  const [pushStatusNote, setPushStatusNote] = useState('');
  const [showLogout, setShowLogout] = useState(false);
  const pushAvailable = isPushConfiguredForBranch(branchKey);

  useEffect(() => {
    if (!staff) return;
    setName(staff.name || '');
    setSurname(staff.surname || '');
    setNotifPrefs(loadNotificationPrefs(staff.id));
  }, [staff]);

  useEffect(() => {
    getPushPermissionState().then(setPushPermission);
  }, []);

  useEffect(() => {
    if (!staff?.id || !pushAvailable) return;
    setPushRegistered(isPushRegisteredLocally(staff.id));

    if (Notification.permission !== 'granted') return;

    syncStaffPushToken(branchKey, staff.id).then((result) => {
      if (result.ok) {
        setPushRegistered(true);
        setPushStatusNote('Bu cihaz push için kayıtlı.');
      } else if (result.reason !== 'not_granted') {
        setPushStatusNote(pushRegistrationErrorMessage(result.reason, result.error));
      }
    });
  }, [staff?.id, branchKey, pushAvailable]);

  const profileDirty = useMemo(() => {
    if (!staff) return false;
    return name.trim() !== (staff.name || '').trim()
      || surname.trim() !== (staff.surname || '').trim();
  }, [staff, name, surname]);

  const handleSaveProfile = async () => {
    if (!staff || !profileDirty) return;
    const trimmedName = name.trim();
    const trimmedSurname = surname.trim();
    if (!trimmedName || !trimmedSurname) {
      showToast('error', 'Hata', 'Ad ve soyad zorunludur');
      return;
    }
    setSavingProfile(true);
    try {
      await updateStaffMemberProfile(staff.id, {
        name: trimmedName,
        surname: trimmedSurname,
      });
      updateStaff({ name: trimmedName, surname: trimmedSurname });
      showToast('success', 'Kaydedildi', 'Profil bilgileri güncellendi');
    } catch {
      showToast('error', 'Hata', 'Profil kaydedilemedi');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setCropImageSrc(dataUrl);
    } catch {
      showToast('error', 'Hata', 'Geçerli bir görsel seçin');
    }
  };

  const applyPhoto = async (dataUrl) => {
    if (!staff) return;
    setUploadingPhoto(true);
    try {
      await updateStaffProfileImage(staff.id, dataUrl);
      updateStaff({ profileImageSrc: dataUrl || null });
      showToast('success', 'Profil', dataUrl ? 'Fotoğraf güncellendi' : 'Fotoğraf kaldırıldı');
    } catch {
      showToast('error', 'Hata', 'Fotoğraf kaydedilemedi');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!staff) return;
    setPassError('');
    if (!currentPass || !newPass || !confirmPass) {
      setPassError('Tüm alanları doldurun');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Yeni şifreler eşleşmiyor');
      return;
    }
    if (newPass.length < 4) {
      setPassError('Şifre en az 4 karakter olmalı');
      return;
    }
    setSavingPass(true);
    try {
      const res = await changeStaffPassword(staff.id, currentPass, newPass);
      if (res.success) {
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        showToast('success', 'Güvenlik', 'Şifreniz güncellendi');
      } else {
        setPassError(res.error || 'Şifre güncellenemedi');
      }
    } catch {
      setPassError('Bağlantı hatası');
    } finally {
      setSavingPass(false);
    }
  };

  const handleNotifChange = (key, value) => {
    if (!staff) return;
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    saveNotificationPrefs(staff.id, next);
  };

  const handleEnablePush = async () => {
    if (!staff?.id || !pushAvailable || pushBusy) return;
    setPushBusy(true);
    setPushStatusNote('');
    try {
      const supported = await isPushSupported();
      if (!supported) {
        setPushStatusNote('Bu cihaz push bildirimini desteklemiyor.');
        return;
      }
      const result = await registerStaffPushNotifications(branchKey, staff.id);
      const permission = await getPushPermissionState();
      setPushPermission(permission);
      if (result.ok) {
        setPushRegistered(true);
        setPushStatusNote('Bu cihaz push için kayıtlı. Yönetici bildirimi gelince ana ekranda görünür.');
        showToast('success', 'Aktif', 'Ana ekran bildirimleri açıldı');
      } else {
        setPushRegistered(false);
        setPushStatusNote(pushRegistrationErrorMessage(result.reason, result.error));
        if (result.reason === 'denied') {
          showToast('error', 'Reddedildi', 'Telefon ayarlarından bildirim izni verin');
        } else {
          showToast('error', 'Hata', pushRegistrationErrorMessage(result.reason, result.error));
        }
      }
    } catch (err) {
      setPushStatusNote(err.message || 'Push kaydı yapılamadı');
      showToast('error', 'Hata', 'Push kaydı yapılamadı');
    } finally {
      setPushBusy(false);
    }
  };

  if (!staff) return null;

  const displayRole = staffRoleLabel(staff);
  const canSendAnnouncements = canSendStaffAnnouncements(staff);

  return (
    <>
      <div className="px-4" style={{ paddingBottom: BOTTOM_NAV_PADDING }}>
        <div className="mb-4 px-0.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Hesap
          </p>
          <h2 className="font-display font-bold text-xl text-slate-900 mt-1 tracking-tight">
            Ayarlar
          </h2>
        </div>

        <div
          className={`relative overflow-hidden rounded-2xl mb-4 p-4 bg-gradient-to-br ${theme.accent} shadow-[0_12px_40px_-16px_rgba(91,33,182,0.35)]`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_0%,white_0%,transparent_55%)]" />
          <div className="relative flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="relative shrink-0 active:scale-95 transition-transform disabled:opacity-70"
              aria-label="Profil fotoğrafı değiştir"
            >
              <StaffAvatar
                name={name || staff.name}
                surname={surname || staff.surname}
                profileImageSrc={staff.profileImageSrc}
                isManager={staff.is_manager}
                isChef={staff.is_chef}
                isAdmin={staff.is_admin}
                isBoss={staff.is_boss}
                size="lg"
                accent={theme.accent}
              />
              <span className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
                {uploadingPhoto ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                )}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-white font-semibold text-lg truncate leading-tight">
                {name.trim() || staff.name} {surname.trim() || staff.surname}
              </p>
              <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                {displayRole}
              </span>
            </div>
          </div>
          <div className="relative flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex-1 text-xs font-semibold py-2 rounded-xl bg-white/15 text-white border border-white/25 active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              Fotoğraf değiştir
            </button>
            {staff.profileImageSrc && (
              <button
                type="button"
                onClick={() => applyPhoto(null)}
                disabled={uploadingPhoto}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-white/10 text-white/80 border border-white/15 active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                Kaldır
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <SettingsCard title="Kişisel bilgiler">
            <div className="space-y-3">
              <FieldInput label="Ad" value={name} onChange={setName} autoComplete="given-name" />
              <FieldInput label="Soyad" value={surname} onChange={setSurname} autoComplete="family-name" />
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={!profileDirty || savingProfile}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-45 active:scale-[0.99] transition-all"
                style={{ background: `linear-gradient(135deg, ${theme.accentSolid} 0%, ${theme.accentSolid}cc 100%)` }}
              >
                {savingProfile ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
              </button>
            </div>
          </SettingsCard>

          <SettingsCard title="Güvenlik">
            <div className="space-y-3">
              <FieldInput
                label="Mevcut şifre"
                type="password"
                value={currentPass}
                onChange={setCurrentPass}
                autoComplete="current-password"
              />
              <FieldInput
                label="Yeni şifre"
                type="password"
                value={newPass}
                onChange={setNewPass}
                autoComplete="new-password"
              />
              <FieldInput
                label="Yeni şifre (tekrar)"
                type="password"
                value={confirmPass}
                onChange={setConfirmPass}
                autoComplete="new-password"
              />
              {passError && (
                <p className="text-xs text-red-600 font-medium">{passError}</p>
              )}
              <button
                type="button"
                onClick={handlePasswordSave}
                disabled={savingPass}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition-transform"
              >
                {savingPass ? 'Güncelleniyor…' : 'Şifreyi güncelle'}
              </button>
            </div>
          </SettingsCard>

          {canSendAnnouncements && (
            <SettingsCard title="Yönetici — Ekip bildirimi">
              <StaffAnnouncementComposer
                branchKey={branchKey}
                staff={staff}
                theme={theme}
                showToast={showToast}
              />
            </SettingsCard>
          )}

          <SettingsCard title="Bildirimler">
            <SettingsToggle
              label="Duyurular"
              description="Masaüstünden gönderilen salon duyuruları"
              checked={notifPrefs.broadcasts}
              onChange={(v) => handleNotifChange('broadcasts', v)}
            />
            <SettingsToggle
              label="Sipariş uyarıları"
              description="Masa ve sipariş güncellemeleri"
              checked={notifPrefs.orderUpdates}
              onChange={(v) => handleNotifChange('orderUpdates', v)}
            />
            <SettingsToggle
              label="Ekip bildirimleri"
              description="Personel çevrimiçi durumu ve ekip aktivitesi"
              checked={notifPrefs.teamOnline}
              onChange={(v) => handleNotifChange('teamOnline', v)}
            />
            {pushAvailable && (
              <div className="pt-3 mt-1 border-t border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Ana ekran push bildirimleri</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Uygulama kapalıyken yönetici bildirimlerini almak için izin verin. PWA ana ekrana ekli olmalıdır.
                </p>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                    pushPermission === 'granted'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : pushPermission === 'denied'
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {pushPermission === 'granted' ? 'İzin verildi' : pushPermission === 'denied' ? 'İzin kapalı' : 'İzin bekleniyor'}
                  </span>
                  {pushRegistered && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                      Cihaz kayıtlı
                    </span>
                  )}
                  {pushPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={pushBusy || pushPermission === 'denied'}
                      className="ml-auto text-xs font-bold px-3 py-2 rounded-xl bg-violet-600 text-white disabled:opacity-45 active:scale-[0.98] transition-all"
                    >
                      {pushBusy ? 'Kaydediliyor…' : 'İzin ver'}
                    </button>
                  )}
                  {pushPermission === 'granted' && !pushRegistered && (
                    <button
                      type="button"
                      onClick={handleEnablePush}
                      disabled={pushBusy}
                      className="ml-auto text-xs font-bold px-3 py-2 rounded-xl bg-violet-600 text-white disabled:opacity-45 active:scale-[0.98] transition-all"
                    >
                      {pushBusy ? 'Kaydediliyor…' : 'Cihazı kaydet'}
                    </button>
                  )}
                </div>
                {pushStatusNote && (
                  <p className={`mt-2 text-xs leading-relaxed ${
                    pushRegistered ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {pushStatusNote}
                  </p>
                )}
              </div>
            )}
          </SettingsCard>

          <button
            type="button"
            onClick={() => setShowLogout(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 text-red-600 text-sm font-bold border border-red-100 active:scale-[0.98] transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Çıkış yap
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePickPhoto}
      />

      <ProfileImageCropModal
        open={!!cropImageSrc}
        imageSrc={cropImageSrc}
        accent={theme.accent}
        onConfirm={async (dataUrl) => {
          setCropImageSrc(null);
          await applyPhoto(dataUrl);
        }}
        onCancel={() => setCropImageSrc(null)}
      />

      <LogoutModal open={showLogout} onClose={() => setShowLogout(false)} />
    </>
  );
}
