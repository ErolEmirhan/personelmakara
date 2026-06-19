const SIZE = {
  '2xs': { box: 'w-8 h-8', text: 'text-[10px]', ring: 2 },
  xs: { box: 'w-10 h-10', text: 'text-xs', ring: 2.5 },
  sm: { box: 'w-11 h-11', text: 'text-xs', ring: 2.5 },
  md: { box: 'w-12 h-12', text: 'text-sm', ring: 3 },
  lg: { box: 'w-16 h-16', text: 'text-base', ring: 3.5 },
  header: { box: 'w-10 h-10', text: 'text-xs', ring: 2.5 },
};

const ROLE_FRAME = {
  admin: {
    ring: 'bg-gradient-to-br from-amber-400 via-amber-500 to-[#9a7209] shadow-[0_2px_10px_-3px_rgba(180,134,11,0.4)]',
    badge: 'bg-slate-900 text-amber-200 border-amber-500/30 font-bold',
    label: 'A',
    title: 'Admin',
    face: 'from-slate-700 via-slate-800 to-slate-900',
  },
  boss: {
    ring: 'bg-gradient-to-br from-rose-500 via-red-600 to-[#7f1d1d] shadow-[0_3px_14px_-4px_rgba(220,38,38,0.55)]',
    badge: 'bg-[#450a0a] text-rose-100 border-red-400/35 font-bold',
    label: 'P',
    title: 'Patron',
    face: 'from-red-900 via-rose-950 to-slate-900',
  },
  manager: {
    ring: 'bg-gradient-to-br from-orange-400 via-red-500 to-rose-600 shadow-[0_0_12px_rgba(239,68,68,0.32)]',
    badge: 'bg-gradient-to-br from-red-600 to-rose-700 text-white border-red-300/50',
    label: 'M',
    title: 'Müdür',
  },
  chef: {
    ring: 'bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.42)]',
    badge: 'bg-gradient-to-br from-amber-500 to-yellow-500 text-amber-950 border-amber-200/80',
    label: 'Ş',
    title: 'Şef',
  },
};

const BADGE_CLASS = {
  '2xs': 'hidden',
  xs: 'w-[14px] h-[14px] text-[7px] -bottom-px -right-px',
  sm: 'w-[15px] h-[15px] text-[8px] -bottom-px -right-px',
  md: 'w-[16px] h-[16px] text-[8px] -bottom-px -right-px',
  lg: 'w-[18px] h-[18px] text-[9px] -bottom-0.5 -right-0.5',
  header: 'w-[14px] h-[14px] text-[7px] -bottom-px -right-px',
};

export function staffInitials(name, surname) {
  const a = (name || '').trim().charAt(0);
  const b = (surname || '').trim().charAt(0);
  return `${a}${b}`.toUpperCase() || '?';
}

export function resolveStaffRoleFrame(isManager, isChef, isAdmin = false, isBoss = false) {
  if (isAdmin) return 'admin';
  if (isBoss) return 'boss';
  if (isManager) return 'manager';
  if (isChef) return 'chef';
  return null;
}

function AvatarFace({
  name,
  surname,
  profileImageSrc,
  box,
  text,
  accent,
  onlineRing,
}) {
  if (profileImageSrc) {
    return (
      <img
        src={profileImageSrc}
        alt=""
        className={`${box} aspect-square rounded-full object-cover object-center shrink-0 block ${onlineRing}`}
      />
    );
  }

  return (
    <div
      className={`${box} ${text} aspect-square rounded-full shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br ${accent} ${onlineRing}`}
      aria-hidden
    >
      {staffInitials(name, surname)}
    </div>
  );
}

export function StaffAvatar({
  name,
  surname,
  profileImageSrc,
  size = 'md',
  accent = 'from-slate-500 to-slate-700',
  online,
  isManager = false,
  isChef = false,
  isAdmin = false,
  isBoss = false,
  role,
  className = '',
}) {
  const dims = SIZE[size] || SIZE.md;
  const roleFrame = role ?? resolveStaffRoleFrame(isManager, isChef, isAdmin, isBoss);
  const frameStyle = roleFrame ? ROLE_FRAME[roleFrame] : null;
  const onlineRing = online && !frameStyle ? 'ring-2 ring-emerald-400/80 ring-offset-2' : '';
  const avatarAccent = frameStyle?.face ? ROLE_FRAME[roleFrame].face : accent;

  const face = (
    <AvatarFace
      name={name}
      surname={surname}
      profileImageSrc={profileImageSrc}
      box={dims.box}
      text={dims.text}
      accent={avatarAccent}
      onlineRing={onlineRing}
    />
  );

  if (!frameStyle) {
    return (
      <div className={`relative inline-flex shrink-0 ${className}`}>
        {face}
        {online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white translate-x-0.5 translate-y-0.5" />
        )}
      </div>
    );
  }

  const badgeClass = BADGE_CLASS[size] || BADGE_CLASS.md;

  return (
    <div
      className={`relative inline-block shrink-0 ${dims.box} ${className}`}
      title={frameStyle.title}
    >
      <div
        className={`box-border w-full h-full rounded-full ${frameStyle.ring}`}
        style={{ padding: `${dims.ring}px` }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full">
          {profileImageSrc ? (
            <img
              src={profileImageSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <div
              className={`absolute inset-0 flex items-center justify-center font-bold text-white bg-gradient-to-br ${avatarAccent} ${dims.text}`}
              aria-hidden
            >
              {staffInitials(name, surname)}
            </div>
          )}
        </div>
      </div>
      <span
        className={`absolute z-[2] flex items-center justify-center rounded-full border leading-none ${frameStyle.badge} ${badgeClass}`}
        aria-hidden
      >
        {frameStyle.label}
      </span>
      {online && (
        <span className="absolute top-0 left-0 z-[3] h-3 w-3 -translate-x-0.5 -translate-y-0.5 rounded-full border-2 border-white bg-emerald-500" />
      )}
    </div>
  );
}
