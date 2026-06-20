export function IncomingPushBanner({ title, body, onOpen, onDismiss }) {
  if (!title && !body) return null;

  return (
    <div className="mx-4 mb-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 shadow-sm">
      <p className="text-xs font-bold text-violet-900">{title || 'Yeni bildirim'}</p>
      {body && <p className="text-[11px] text-violet-800/90 mt-1 leading-relaxed">{body}</p>}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-violet-600 text-white active:scale-[0.98]"
        >
          Görüntüle
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-white text-violet-800 border border-violet-200"
        >
          Kapat
        </button>
      </div>
    </div>
  );
}
