import { StaffAvatar } from '../ui/StaffAvatar';
import { formatLastSeen } from '../../utils/formatLastSeen';

export function AnnouncementReadReceipts({
  reads,
  loading,
  totalStaff,
  accent,
  accentSolid,
}) {
  const count = reads.length;

  return (
    <div
      className="mt-4 rounded-2xl border overflow-hidden"
      style={{
        borderColor: `${accentSolid}20`,
        backgroundColor: `${accentSolid}05`,
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b"
        style={{ borderColor: `${accentSolid}15` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${accentSolid}14`, color: accentSolid }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">
              {count > 0 ? (
                <>
                  {count}
                  {typeof totalStaff === 'number' ? ` / ${totalStaff}` : ''}
                  {' '}
                  personel gördü
                </>
              ) : (
                'Henüz kimse görmedi'
              )}
            </p>
            {typeof totalStaff === 'number' && count > 0 && count < totalStaff && (
              <p className="text-[11px] text-slate-500 mt-0.5">
                {totalStaff - count} personel henüz açmadı
              </p>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <span className="w-5 h-5 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : count === 0 ? (
        <p className="text-xs text-slate-500 px-3.5 py-4 leading-relaxed">
          Personel bildirimi açtığında burada görünür.
        </p>
      ) : (
        <ul className="max-h-44 overflow-y-auto divide-y divide-slate-100/80">
          {reads.map((read) => {
            const timeLabel = read.readAtMs ? formatLastSeen(read.readAtMs) : '';
            return (
              <li key={read.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                <StaffAvatar
                  name={read.staffName}
                  surname={read.staffSurname}
                  profileImageSrc={read.profileImageSrc}
                  isManager={read.isManager}
                  isChef={read.isChef}
                  isAdmin={read.isAdmin}
                  isBoss={read.isBoss}
                  size="xs"
                  accent={accent}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {read.staffName} {read.staffSurname}
                  </p>
                  {timeLabel && (
                    <p className="text-[10px] text-slate-400">{timeLabel} görüldü</p>
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
