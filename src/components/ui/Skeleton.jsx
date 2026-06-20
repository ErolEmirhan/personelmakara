export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 bg-[length:200%_100%] animate-shimmer ${className}`}
      aria-hidden
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[1.35rem] bg-white border border-slate-100/90 overflow-hidden shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <SkeletonBlock className="w-full aspect-[5/4] rounded-none" />
      <div className="px-3 pt-3 pb-3.5 space-y-2">
        <SkeletonBlock className="h-3.5 w-[88%]" />
        <SkeletonBlock className="h-3.5 w-[62%]" />
        <SkeletonBlock className="h-5 w-[40%] mt-2" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:gap-4" aria-busy="true" aria-label="Ürünler yükleniyor">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-stagger-in opacity-0"
          style={{ animationDelay: `${i * 55}ms` }}
        >
          <ProductCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function TableButtonSkeleton() {
  return (
    <SkeletonBlock className="aspect-square rounded-2xl" />
  );
}

export function TableGridSkeleton({ count = 8, columns = 4 }) {
  return (
    <div
      className={`grid gap-2 ${columns === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}
      aria-busy="true"
      aria-label="Masalar yükleniyor"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-stagger-in opacity-0"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <TableButtonSkeleton />
        </div>
      ))}
    </div>
  );
}

export function TableSectionSkeleton({ title = true }) {
  return (
    <section className="rounded-2xl border-2 border-slate-100/90 bg-white/60 p-3.5 mb-5 shadow-sm">
      {title && (
        <div className="flex items-center gap-2.5 mb-3.5">
          <SkeletonBlock className="w-2 h-2 rounded-full shrink-0" />
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-5 w-8 ml-auto rounded-lg" />
        </div>
      )}
      <TableGridSkeleton count={8} />
    </section>
  );
}
