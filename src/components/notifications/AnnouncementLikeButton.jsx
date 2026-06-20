export function AnnouncementLikeButton({
  liked,
  likeCount,
  toggling,
  onToggle,
  accentSolid,
  compact = false,
}) {
  const count = likeCount || 0;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      disabled={toggling}
      aria-label={liked ? 'Beğeniyi kaldır' : 'Beğen'}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition-all duration-ui ease-premium active:scale-95 disabled:opacity-60 ${
        compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
      } ${
        liked
          ? 'text-rose-600 bg-rose-50 border border-rose-200/80'
          : 'text-slate-600 bg-slate-50 border border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <svg
        className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} transition-transform ${liked ? 'scale-110' : ''} ${toggling ? 'animate-pulse' : ''}`}
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={liked ? 0 : 2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      <span className="tabular-nums">
        {count > 0 ? count : liked ? 'Beğenildi' : 'Beğen'}
      </span>
    </button>
  );
}
