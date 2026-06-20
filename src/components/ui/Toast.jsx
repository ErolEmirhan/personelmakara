export function ToastOverlay({ toast }) {
  if (!toast) return null;

  const styles = {
    success: 'bg-emerald-600',
    error: 'bg-red-500',
    info: 'bg-violet-600',
  };

  return (
    <div
      className="fixed left-4 right-4 z-[9600] flex justify-center pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.25rem)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className={`${styles[toast.type] || styles.info} text-white px-4 py-3 rounded-2xl shadow-lg max-w-sm w-full pointer-events-auto animate-slide-up`}
      >
        <p className="font-bold text-sm">{toast.title}</p>
        {toast.message ? (
          <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>
        ) : null}
      </div>
    </div>
  );
}
