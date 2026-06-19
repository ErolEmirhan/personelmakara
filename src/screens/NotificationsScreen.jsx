import { useEffect, useState } from 'react';
import { useBranch } from '../context/BranchContext';
import { subscribeStaffAnnouncements } from '../services/firebaseService';
import { BOTTOM_NAV_PADDING } from '../constants/nav';
import { StaffAvatar } from '../components/ui/StaffAvatar';
import { AnnouncementDetailSheet } from '../components/notifications/AnnouncementDetailSheet';
import { formatLastSeen } from '../utils/formatLastSeen';

function AnnouncementCard({ item, theme, onOpen }) {
  const timeLabel = item.createdAtMs ? formatLastSeen(item.createdAtMs) : '';
  const accent = theme.accentSolid;
  const hasComments = item.commentCount > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      aria-label={`Bildirimi aç${hasComments ? `, ${item.commentCount} yorum` : ', yorum ekle'}`}
      className="group w-full text-left rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_-22px_rgba(15,23,42,0.14)] overflow-hidden active:scale-[0.99] transition-all hover:border-slate-200/90 hover:shadow-[0_12px_36px_-20px_rgba(15,23,42,0.18)]"
    >
      <div
        className="h-[3px] w-full opacity-90"
        style={{
          background: `linear-gradient(90deg, ${accent}55 0%, ${accent} 50%, ${accent}55 100%)`,
        }}
      />

      <div className="p-3.5 pb-3">
        <div className="flex gap-3">
          <StaffAvatar
            name={item.authorName}
            surname={item.authorSurname}
            profileImageSrc={item.authorProfileImageSrc}
            isManager={item.authorIsManager}
            isChef={item.authorIsChef}
            isAdmin={item.authorIsAdmin}
            isBoss={item.authorIsBoss}
            size="sm"
            accent={theme.accent}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate">
                  {item.authorName} {item.authorSurname}
                </p>
                <span
                  className="inline-block mt-0.5 text-[8px] font-bold uppercase tracking-wide px-1.5 py-px rounded-full"
                  style={{
                    backgroundColor: `${accent}10`,
                    color: accent,
                  }}
                >
                  Yönetici
                </span>
              </div>
              {timeLabel && (
                <span className="shrink-0 text-[10px] text-slate-400 pt-0.5">{timeLabel}</span>
              )}
            </div>
            {item.title && (
              <p className="font-display font-bold text-[15px] text-slate-900 mt-2 leading-snug line-clamp-2">
                {item.title}
              </p>
            )}
            <p className={`text-sm text-slate-600 leading-relaxed line-clamp-3 ${item.title ? 'mt-1' : 'mt-2'}`}>
              {item.message}
            </p>
          </div>
        </div>
      </div>

      <div
        className="mx-3.5 mb-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors group-hover:border-slate-200"
        style={{
          backgroundColor: `${accent}06`,
          borderColor: `${accent}18`,
        }}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accent}14`, color: accent }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </span>
          <span className="text-xs font-semibold text-slate-600 truncate">
            {hasComments ? (
              <>
                <span style={{ color: accent }}>{item.commentCount}</span>
                {' '}
                yorum
              </>
            ) : (
              'Henüz yorum yok — ilk sen yaz'
            )}
          </span>
        </span>

        <span
          className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold uppercase tracking-wide transition-transform group-hover:translate-x-0.5"
          style={{ color: accent }}
        >
          Aç
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </span>
      </div>
    </button>
  );
}

export function NotificationsScreen() {
  const { theme, branchKey } = useBranch();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!branchKey) return undefined;
    setLoading(true);
    const unsub = subscribeStaffAnnouncements(branchKey, (list) => {
      setAnnouncements(list);
      setLoading(false);
    });
    return unsub;
  }, [branchKey]);

  return (
    <>
      <div className="px-4" style={{ paddingBottom: BOTTOM_NAV_PADDING }}>
        <div className="mb-5 px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Ekip
          </p>
          <h2 className="font-display font-bold text-xl text-slate-900 mt-1 tracking-tight">
            Bildirimler
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-9 h-9 border-[3px] border-violet-100 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Yükleniyor…</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="font-semibold text-slate-700">Henüz bildirim yok</p>
            <p className="text-sm text-slate-400 mt-1 max-w-[260px] mx-auto">
              Yöneticinin gönderdiği duyurular ve ekip yorumları burada görünür.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {announcements.map((item) => (
              <li key={item.id}>
                <AnnouncementCard item={item} theme={theme} onOpen={setSelected} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <AnnouncementDetailSheet
        announcement={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
