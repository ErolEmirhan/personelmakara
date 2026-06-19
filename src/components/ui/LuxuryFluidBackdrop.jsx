const VARIANTS = {
  admin: {
    base: 'bg-gradient-to-br from-[#faf6ef] via-[#fffdf9] to-[#ede4d4]',
    border: 'border-amber-200/45',
    shadow: 'shadow-[0_12px_40px_-14px_rgba(180,134,11,0.28)]',
    blobs: [
      { color: 'rgba(251,191,36,0.55)', size: '72%', top: '-28%', left: '-18%', anim: 'animate-luxury-float-a' },
      { color: 'rgba(217,119,6,0.35)', size: '58%', top: '42%', left: '58%', anim: 'animate-luxury-float-b' },
      { color: 'rgba(254,243,199,0.85)', size: '48%', top: '8%', left: '32%', anim: 'animate-luxury-float-c' },
      { color: 'rgba(146,98,10,0.18)', size: '64%', top: '62%', left: '-12%', anim: 'animate-luxury-float-b' },
    ],
    shimmer: 'from-transparent via-amber-100/50 to-transparent',
    sheen: 'rgba(255,255,255,0.55)',
  },
  boss: {
    base: 'bg-gradient-to-br from-[#fff7f7] via-white to-[#ffe8e8]',
    border: 'border-red-200/45',
    shadow: 'shadow-[0_12px_40px_-14px_rgba(220,38,38,0.24)]',
    blobs: [
      { color: 'rgba(248,113,113,0.45)', size: '68%', top: '-24%', left: '-14%', anim: 'animate-luxury-float-b' },
      { color: 'rgba(225,29,72,0.28)', size: '54%', top: '48%', left: '54%', anim: 'animate-luxury-float-a' },
      { color: 'rgba(254,202,202,0.75)', size: '46%', top: '12%', left: '28%', anim: 'animate-luxury-float-c' },
    ],
    shimmer: 'from-transparent via-rose-100/45 to-transparent',
    sheen: 'rgba(255,255,255,0.5)',
  },
  manager: {
    base: 'bg-gradient-to-br from-[#fff8f5] via-white to-[#ffedd5]',
    border: 'border-orange-200/45',
    shadow: 'shadow-[0_12px_36px_-14px_rgba(249,115,22,0.24)]',
    blobs: [
      { color: 'rgba(251,146,60,0.48)', size: '70%', top: '-26%', left: '-16%', anim: 'animate-luxury-float-c' },
      { color: 'rgba(244,63,94,0.32)', size: '56%', top: '44%', left: '56%', anim: 'animate-luxury-float-a' },
      { color: 'rgba(254,215,170,0.8)', size: '44%', top: '10%', left: '34%', anim: 'animate-luxury-float-b' },
    ],
    shimmer: 'from-transparent via-orange-100/45 to-transparent',
    sheen: 'rgba(255,255,255,0.48)',
  },
  self: {
    base: 'bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500',
    border: 'border-white/20',
    shadow: 'shadow-[0_14px_44px_-12px_rgba(124,58,237,0.55)]',
    blobs: [
      { color: 'rgba(255,255,255,0.22)', size: '68%', top: '-30%', left: '-20%', anim: 'animate-luxury-float-a' },
      { color: 'rgba(236,72,153,0.45)', size: '58%', top: '40%', left: '52%', anim: 'animate-luxury-float-c' },
      { color: 'rgba(167,139,250,0.4)', size: '50%', top: '6%', left: '30%', anim: 'animate-luxury-float-b' },
      { color: 'rgba(0,0,0,0.12)', size: '62%', top: '58%', left: '-10%', anim: 'animate-luxury-float-a' },
    ],
    shimmer: 'from-transparent via-white/25 to-transparent',
    sheen: 'rgba(255,255,255,0.12)',
  },
};

export function getLuxuryCardShell(variant) {
  const v = VARIANTS[variant] || VARIANTS.manager;
  return `relative overflow-hidden rounded-xl border ${v.border} ${v.shadow}`;
}

export function LuxuryFluidBackdrop({ variant = 'admin' }) {
  const v = VARIANTS[variant] || VARIANTS.admin;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
      <div className={`absolute inset-0 ${v.base}`} />

      {v.blobs.map((blob, i) => (
        <div
          key={i}
          className={`absolute rounded-full blur-3xl will-change-transform motion-reduce:animate-none ${blob.anim}`}
          style={{
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
            animationDelay: `${i * 1.4}s`,
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 68%)`,
          }}
        />
      ))}

      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.45) 0.6px, transparent 0.6px)',
          backgroundSize: '14px 14px',
        }}
      />

      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        <div
          className={`absolute -inset-y-4 -left-1/2 w-1/2 bg-gradient-to-r ${v.shimmer} animate-luxury-shimmer motion-reduce:animate-none skew-x-12`}
        />
      </div>

      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background: `linear-gradient(145deg, ${v.sheen} 0%, transparent 42%, transparent 100%)`,
        }}
      />

      <div className="absolute inset-[1px] rounded-[inherit] ring-1 ring-inset ring-white/30" />
    </div>
  );
}
