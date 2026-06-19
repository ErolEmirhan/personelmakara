import { useEffect, useMemo, useRef, useState } from 'react';
import { SidePanel } from '../ui/SidePanel';
import { StaffAvatar } from '../ui/StaffAvatar';
import { LuxuryFluidBackdrop, getLuxuryCardShell } from '../ui/LuxuryFluidBackdrop';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackButton';
import {
  fetchBranchStaff,
  subscribeStaffPresence,
  updateStaffProfileImage,
} from '../../services/firebaseService';
import { fileToDataUrl } from '../../services/staffProfileImage';
import { ProfileImageCropModal } from './ProfileImageCropModal';
import { StaffAssignModal } from './StaffAssignModal';
import { StaffDeleteModal } from './StaffDeleteModal';
import { staffRoleLabel, staffRolePriority, canManageStaff } from '../../utils/staffRole';
import {
  adminBadgeClass,
} from '../../constants/adminTheme';
import {
  bossBadgeClass,
} from '../../constants/bossTheme';
import {
  managerBadgeClass,
} from '../../constants/managerTheme';
import { formatLastSeenLabel } from '../../utils/formatLastSeen';

function OnlinePill({ online, compact, light, lastSeenLabel }) {
  if (compact) {
    return (
      <div className="flex flex-col items-end gap-0.5 max-w-[7.5rem]">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
            light
              ? online
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-white/10 text-white/50 border border-white/15'
              : online
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-gray-100 text-gray-500 border border-gray-200/80'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          {online ? 'Aktif' : 'Kapalı'}
        </span>
        {!online && lastSeenLabel && (
          <span
            className={`text-[9px] font-medium leading-snug text-right ${
              light ? 'text-white/45' : 'text-gray-400'
            }`}
          >
            {lastSeenLabel}
          </span>
        )}
      </div>
    );
  }
  return null;
}

export function StaffTeamModal({ open, onClose, branchKey }) {
  const { theme } = useBranch();
  const { staff: currentStaff, updateStaff } = useAuth();
  const { showToast } = useApp();
  const [staffList, setStaffList] = useState([]);
  const [presenceMap, setPresenceMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef(null);

  const isCurrentAdmin = canManageStaff(currentStaff);

  const reloadStaff = async () => {
    if (!branchKey) return;
    try {
      const list = await fetchBranchStaff(branchKey);
      setStaffList(list);
    } catch {
      setStaffList([]);
    }
  };

  useEffect(() => {
    if (!open || !branchKey) return undefined;
    setLoading(true);
    fetchBranchStaff(branchKey)
      .then(setStaffList)
      .catch(() => setStaffList([]))
      .finally(() => setLoading(false));

    const unsub = subscribeStaffPresence(branchKey, setPresenceMap);
    return unsub;
  }, [open, branchKey]);

  useEffect(() => {
    if (!open) return undefined;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [open]);

  const rows = useMemo(() => {
    const mapped = staffList.map((s) => {
      const presence = presenceMap.get(s.id);
      const viewingName = presence?.viewingTableName?.trim() || null;
      const isSelf = currentStaff?.id === s.id;
      const online = !!presence?.online;
      return {
        ...s,
        profileImageSrc: isSelf ? currentStaff?.profileImageSrc || s.profileImageSrc : s.profileImageSrc,
        online,
        viewingTableName: online && viewingName ? viewingName : null,
        lastSeenLabel: !online ? formatLastSeenLabel(presence, now) : null,
        isSelf,
      };
    });

    return mapped.sort((a, b) => {
      const roleDiff = staffRolePriority(a) - staffRolePriority(b);
      if (roleDiff !== 0) return roleDiff;
      return `${a.name || ''} ${a.surname || ''}`.localeCompare(
        `${b.name || ''} ${b.surname || ''}`,
        'tr'
      );
    });
  }, [staffList, presenceMap, currentStaff?.id, currentStaff?.profileImageSrc, now]);

  const onlineCount = rows.filter((r) => r.online).length;
  const totalCount = rows.length;

  const applyProfileImage = async (dataUrl) => {
    if (!currentStaff) return;
    setUploadingProfile(true);
    try {
      await updateStaffProfileImage(currentStaff.id, dataUrl);
      updateStaff({ profileImageSrc: dataUrl || null });
      setStaffList((prev) =>
        prev.map((s) =>
          s.id === currentStaff.id ? { ...s, profileImageSrc: dataUrl || null } : s
        )
      );
      showToast('success', 'Profil', dataUrl ? 'Fotoğraf kaydedildi' : 'Fotoğraf kaldırıldı');
    } catch {
      showToast('error', 'Hata', 'Profil fotoğrafı kaydedilemedi');
    } finally {
      setUploadingProfile(false);
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

  const handleCropConfirm = async (dataUrl) => {
    setCropImageSrc(null);
    await applyProfileImage(dataUrl);
  };

  useBackHandler(open, () => {
    if (cropImageSrc) {
      setCropImageSrc(null);
      return;
    }
    if (assignTarget) {
      setAssignTarget(null);
      return;
    }
    if (deleteTarget) {
      setDeleteTarget(null);
      return;
    }
    onClose();
  });

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        widthClass="w-[min(292px,84vw)]"
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-9 h-9 border-[3px] border-pink-100 border-t-pink-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Ekip yükleniyor...</p>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-sm">Personel bulunamadı</p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2 px-0.5">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <p className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-900">{onlineCount}</span>
                  <span className="text-gray-400">/{totalCount}</span>
                  {' '}
                  <span className="text-gray-500">çevrimiçi</span>
                </p>
              </div>

              <ul className="space-y-1.5">
                {rows.map((member) => {
                  const isAdmin = !!member.is_admin;
                  const isBoss = !!member.is_boss && !isAdmin;
                  const isManager = !!member.is_manager && !isAdmin && !isBoss;
                  const isSelf = member.isSelf;
                  const hasLuxuryBg = isSelf || isAdmin || isBoss || isManager;
                  const cardClass = isSelf
                    ? getLuxuryCardShell('self')
                    : isAdmin
                      ? getLuxuryCardShell('admin')
                      : isBoss
                        ? getLuxuryCardShell('boss')
                        : isManager
                          ? getLuxuryCardShell('manager')
                          : 'rounded-xl border border-gray-100 bg-white shadow-sm shadow-gray-100/80';

                  return (
                    <li key={member.id} className={`group transition-all ${cardClass}`}>
                      {isSelf && <LuxuryFluidBackdrop variant="self" />}
                      {isAdmin && !isSelf && (
                        <>
                          <LuxuryFluidBackdrop variant="admin" />
                          <div
                            className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full bg-gradient-to-b from-amber-700 via-amber-500 to-amber-600/80 z-[1]"
                            aria-hidden
                          />
                        </>
                      )}
                      {isBoss && !isSelf && (
                        <>
                          <LuxuryFluidBackdrop variant="boss" />
                          <div
                            className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-full bg-gradient-to-b from-red-800 via-red-500 to-rose-500/85 z-[1]"
                            aria-hidden
                          />
                        </>
                      )}
                      {isManager && !isSelf && <LuxuryFluidBackdrop variant="manager" />}
                      <div className={`relative z-10 flex items-center gap-2.5 ${
                        hasLuxuryBg && !isSelf ? 'py-2 pr-2 pl-3' : 'p-2 pl-2.5'
                      }`}>
                        <div className="relative shrink-0">
                          {isSelf ? (
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              disabled={uploadingProfile}
                              className="relative block overflow-visible active:scale-95 transition-transform disabled:opacity-70"
                              aria-label="Profil fotoğrafı değiştir"
                            >
                              <StaffAvatar
                                name={member.name}
                                surname={member.surname}
                                profileImageSrc={member.profileImageSrc}
                                isManager={member.is_manager}
                                isChef={member.is_chef}
                                isAdmin={member.is_admin}
                                isBoss={member.is_boss}
                                online={member.online}
                                size="sm"
                                accent={theme.accent}
                              />
                              <span className="absolute inset-0 rounded-full overflow-hidden bg-black/25 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
                                {uploadingProfile ? (
                                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                                  </svg>
                                )}
                              </span>
                            </button>
                          ) : (
                            <StaffAvatar
                              name={member.name}
                              surname={member.surname}
                              profileImageSrc={member.profileImageSrc}
                              isManager={member.is_manager}
                              isChef={member.is_chef}
                              isAdmin={member.is_admin}
                              isBoss={member.is_boss}
                              online={member.online}
                              size="sm"
                              accent="from-slate-500 to-slate-700"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <p className={`font-semibold truncate leading-tight ${
                              isSelf
                                ? 'text-[13px] text-white'
                                : 'text-[13px] text-gray-900'
                            }`}>
                              {member.name} {member.surname}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {isAdmin && (
                              <span className={`shrink-0 ${
                                isSelf
                                  ? 'text-[8px] font-semibold tracking-wide uppercase text-amber-100 bg-white/10 px-1.5 py-px rounded-full border border-amber-200/30'
                                  : `${adminBadgeClass} !text-[8px] !px-1.5 !py-px !tracking-wide`
                              }`}>
                                Admin
                              </span>
                            )}
                            {isManager && !isSelf && (
                              <span className={`shrink-0 ${managerBadgeClass}`}>
                                Müdür
                              </span>
                            )}
                            {(isBoss || (isSelf && member.is_boss && !isAdmin)) && (
                              <span className={`shrink-0 ${
                                isSelf
                                  ? 'text-[8px] font-semibold tracking-wide uppercase text-rose-100 bg-white/10 px-1.5 py-px rounded-full border border-red-200/30'
                                  : `${bossBadgeClass} !text-[8px] !px-1.5 !py-px !tracking-wide`
                              }`}>
                                Patron
                              </span>
                            )}
                            {isSelf && (
                              <span className="text-[8px] font-bold uppercase tracking-wide text-white/90 bg-white/12 px-1.5 py-px rounded-full border border-white/20 shrink-0">
                                Sen
                              </span>
                            )}
                            <span className={`text-[10px] leading-none ${
                              isSelf
                                ? 'text-white/60'
                                : isAdmin
                                  ? 'text-amber-800/45'
                                  : isBoss
                                    ? 'text-red-800/45'
                                    : isManager
                                      ? 'text-orange-800/45'
                                      : 'text-gray-400'
                            }`}>
                              · {staffRoleLabel(member)}
                            </span>
                          </div>
                          {member.viewingTableName && (
                            <p className={`text-[10px] font-medium mt-0.5 truncate leading-tight ${
                              isSelf
                                ? 'text-white/75'
                                : isAdmin
                                  ? 'text-amber-800/65'
                                  : isBoss
                                    ? 'text-red-800/65'
                                    : isManager
                                      ? 'text-orange-800/65'
                                      : 'text-pink-600/90'
                            }`}>
                              {member.viewingTableName}&apos;e bakıyor
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <OnlinePill
                            online={member.online}
                            compact
                            light={isSelf}
                            lastSeenLabel={member.lastSeenLabel}
                          />
                          {isCurrentAdmin && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setAssignTarget(member)}
                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md active:scale-95 transition-transform ${
                                  isSelf
                                    ? 'bg-white/12 text-white border border-white/20'
                                    : 'bg-violet-50 text-violet-700 border border-violet-100'
                                }`}
                              >
                                Düzenle
                              </button>
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteTarget(member)}
                                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100 active:scale-95 transition-transform"
                                  aria-label="Personeli sil"
                                >
                                  Sil
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePickPhoto}
        />

      </SidePanel>

      <ProfileImageCropModal
        open={!!cropImageSrc}
        imageSrc={cropImageSrc}
        accent={theme.accent}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropImageSrc(null)}
      />

      <StaffAssignModal
        open={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        member={assignTarget}
        branchKey={branchKey}
        accent={theme.accent}
        onSaved={async (updated) => {
          setStaffList((prev) =>
            prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
          );
          if (currentStaff?.id === updated.id) {
            updateStaff(updated);
          }
          await reloadStaff();
          showToast('success', 'Güncellendi', 'Personel kaydı güncellendi');
        }}
      />

      <StaffDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        member={deleteTarget}
        onDeleted={async (staffId) => {
          setStaffList((prev) => prev.filter((s) => s.id !== staffId));
          await reloadStaff();
          showToast('success', 'Silindi', 'Personel kaldırıldı');
        }}
      />
    </>
  );
}
