import { StaffAvatar } from '../ui/StaffAvatar';
import { formatLastSeen } from '../../utils/formatLastSeen';

export function AnnouncementLikeReceipts({ likes, loading, accent, accentSolid }) {
  const count = likes.length;
  if (!loading && count === 0) return null;

  return (
    <div
      className="mt-3 rounded-2xl border overflow-hidden"
      style={{
        borderColor: `${accentSolid}18`,
        backgroundColor: 'rgba(244, 63, 94, 0.04)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3.5 py-2.5 border-b"
        style={{ borderColor: 'rgba(244, 63, 94, 0.12)' }}
      >
        <span className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-rose-100 text-rose-600">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </span>
        <p className="text-sm font-bold text-slate-900">
          {count > 0 ? `${count} beğeni` : 'Beğeniler'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-5">
          <span className="w-5 h-5 border-2 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : (
        <ul className="max-h-36 overflow-y-auto divide-y divide-rose-50">
          {likes.map((like) => {
            const timeLabel = like.likedAtMs ? formatLastSeen(like.likedAtMs) : '';
            return (
              <li key={like.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                <StaffAvatar
                  name={like.staffName}
                  surname={like.staffSurname}
                  profileImageSrc={like.profileImageSrc}
                  isManager={like.isManager}
                  isChef={like.isChef}
                  isAdmin={like.isAdmin}
                  isBoss={like.isBoss}
                  size="xs"
                  accent={accent}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {like.staffName} {like.staffSurname}
                  </p>
                  {timeLabel && (
                    <p className="text-[10px] text-slate-400">{timeLabel}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
