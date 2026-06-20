import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { MAIN_TABS } from '../../constants/nav';
import { StaffTeamModal } from '../modals/StaffTeamModal';
import { StaffAvatar } from '../ui/StaffAvatar';

const TAB_TITLES = {
  [MAIN_TABS.ORDERS]: 'Siparişler',
  [MAIN_TABS.NOTIFICATIONS]: 'Bildirimler',
  [MAIN_TABS.OTHER]: 'Ayarlar',
};

function PersonelBadge({ theme }) {
  const accent = theme.accentSolid;

  return (
    <span
      className="shrink-0 text-[8px] font-extrabold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border leading-none -translate-y-px"
      style={{
        backgroundColor: `${accent}12`,
        borderColor: `${accent}28`,
        color: accent,
      }}
    >
      Personel
    </span>
  );
}

function HeaderBrandLockup({ theme, showPersonelBadge = true }) {
  return (
    <div className="flex items-baseline gap-1.5 min-w-0 max-w-full justify-center">
      <h1
        className={`font-display font-bold text-[15px] tracking-[-0.04em] truncate leading-none bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}
      >
        {theme.name}
      </h1>
      {showPersonelBadge && <PersonelBadge theme={theme} />}
    </div>
  );
}

function HeaderEyebrow({ theme, label }) {
  return (
    <p
      className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5 bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}
    >
      {label}
    </p>
  );
}

function HeaderCenter({ isOrder, isHome, title, subtitle, theme, staff }) {
  if (isHome) {
    return (
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-1">
        <HeaderBrandLockup theme={theme} />
        {staff && (
          <p className="text-[11px] text-slate-500 font-medium truncate max-w-full mt-0.5 leading-tight">
            {staff.name} {staff.surname}
          </p>
        )}
      </div>
    );
  }

  if (isOrder) {
    return (
      <div className="flex-1 min-w-0 text-center px-1">
        <HeaderEyebrow theme={theme} label="Sipariş" />
        <h1 className="font-display font-semibold text-[17px] text-slate-900 tracking-[-0.02em] truncate leading-tight">
          {title}
        </h1>
        <p
          className={`text-[11px] font-semibold truncate mt-0.5 bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`}
        >
          {subtitle}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 text-center px-1">
      <HeaderEyebrow theme={theme} label={theme.name} />
      <h1 className="font-display font-semibold text-[17px] text-slate-900 tracking-[-0.02em] truncate leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function AppHeader() {
  const { staff } = useAuth();
  const { theme, branchKey } = useBranch();
  const { setDrawerOpen, screen, selectedTable, mainTab } = useApp();
  const [teamOpen, setTeamOpen] = useState(false);

  const isOrder = screen === 'order' && selectedTable;
  const isHome = !isOrder && mainTab === MAIN_TABS.TABLES;
  const title = isOrder
    ? selectedTable.name || `Masa ${selectedTable.number}`
    : TAB_TITLES[mainTab] || theme.name;
  const subtitle = isOrder
    ? theme.name
    : isHome
      ? ''
      : (staff ? `${staff.name} ${staff.surname}` : theme.subtitle || '');

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.12)] pt-[env(safe-area-inset-top,0px)]">
          <div className="flex items-center gap-3 px-4 h-14">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="shrink-0 w-10 h-10 rounded-2xl bg-slate-100/90 text-slate-600 flex items-center justify-center active:scale-[0.96] transition-transform"
              aria-label="Menü"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>

            <HeaderCenter
              isOrder={isOrder}
              isHome={isHome}
              title={title}
              subtitle={subtitle}
              theme={theme}
              staff={staff}
            />

            <button
              type="button"
              onClick={() => setTeamOpen(true)}
              className="shrink-0 w-10 h-10 rounded-2xl bg-slate-100/90 flex items-center justify-center active:scale-[0.96] transition-transform overflow-visible"
              aria-label="Ekip paneli"
              title="Ekip"
            >
              {staff ? (
                <StaffAvatar
                  name={staff.name}
                  surname={staff.surname}
                  profileImageSrc={staff.profileImageSrc}
                  isManager={staff.is_manager}
                  isChef={staff.is_chef}
                  isAdmin={staff.is_admin}
                  isBoss={staff.is_boss}
                  size="header"
                  accent={theme.accent}
                />
              ) : (
                <span className="w-9 h-9 rounded-full bg-slate-200 text-slate-500 font-bold text-xs flex items-center justify-center">
                  ?
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <StaffTeamModal
        open={teamOpen}
        onClose={() => setTeamOpen(false)}
        branchKey={branchKey}
      />
    </>
  );
}
