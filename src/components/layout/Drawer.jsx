import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { staffRoleLabel } from '../../utils/staffRole';
import { StaffAvatar } from '../ui/StaffAvatar';
import { SidePanel } from '../ui/SidePanel';
import { LogoutModal } from '../modals/LogoutModal';
import { useBackHandler } from '../../hooks/useBackButton';
import { MAIN_TABS } from '../../constants/nav';

const NAV_ITEMS = [
  {
    id: MAIN_TABS.TABLES,
    label: 'Masalar',
    description: 'Salon ve masa durumu',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: MAIN_TABS.ORDERS,
    label: 'Siparişler',
    description: 'Aktif salon siparişleri',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: MAIN_TABS.NOTIFICATIONS,
    label: 'Bildirimler',
    description: 'Duyurular ve uyarılar',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: MAIN_TABS.OTHER,
    label: 'Ayarlar',
    description: 'Profil, şifre ve bildirimler',
    icon: (active) => (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function SectionLabel({ children }) {
  return (
    <p className="px-1 mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
      {children}
    </p>
  );
}

function NavRow({ icon, label, description, active, accent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-all active:scale-[0.99] ${
        active
          ? 'bg-white border border-slate-200/90 shadow-sm'
          : 'hover:bg-white/70 border border-transparent'
      }`}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
        style={
          active
            ? { backgroundColor: `${accent}18`, color: accent }
            : { backgroundColor: '#f1f5f9', color: '#64748b' }
        }
      >
        {icon(active)}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold truncate ${active ? 'text-slate-900' : 'text-slate-700'}`}>
          {label}
        </span>
        <span className="block text-[11px] text-slate-400 truncate mt-0.5">{description}</span>
      </span>
      {active && (
        <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
      )}
    </button>
  );
}

export function Drawer() {
  const { staff, refreshStaffProfile } = useAuth();
  const { theme } = useBranch();
  const {
    drawerOpen,
    setDrawerOpen,
    mainTab,
    setMainTab,
    tables,
    loadData,
    showToast,
  } = useApp();

  const [showLogout, setShowLogout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const accent = theme.accentSolid;

  const salonStats = useMemo(() => {
    const occupied = tables.filter((t) => t.hasOrder).length;
    return { occupied, total: tables.length };
  }, [tables]);

  useBackHandler(drawerOpen, () => setDrawerOpen(false));
  useBackHandler(showLogout, () => setShowLogout(false));

  const navigate = (tab) => {
    setMainTab(tab);
    setDrawerOpen(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshStaffProfile();
      await loadData({ force: true });
      showToast('success', 'Başarılı', 'Veriler yenilendi');
      setDrawerOpen(false);
    } catch {
      showToast('error', 'Hata', 'Veriler yenilenemedi');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <SidePanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        direction="left"
        widthClass="w-[min(300px,88vw)]"
        zIndexClass="z-[8000]"
        panelClassName="border-slate-200/60"
        contentClassName="min-h-0 h-full"
        ariaLabel="Menü"
      >
        <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${theme.accent} pt-[max(0.75rem,env(safe-area-inset-top))]`}>
              <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_15%_0%,white_0%,transparent_55%)]" />
              <div className="relative px-4 pt-3 pb-4">
                <p className="text-white/65 text-[10px] font-bold uppercase tracking-[0.18em]">
                  {theme.name}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  {staff && (
                    <StaffAvatar
                      name={staff.name}
                      surname={staff.surname}
                      profileImageSrc={staff.profileImageSrc}
                      isManager={staff.is_manager}
                      isChef={staff.is_chef}
                      isAdmin={staff.is_admin}
                      isBoss={staff.is_boss}
                      size="md"
                      accent={theme.accent}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-semibold text-base truncate leading-tight">
                      {staff?.name} {staff?.surname}
                    </p>
                    <span className="inline-block mt-1 text-[9px] font-semibold uppercase tracking-wide text-white/90 bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
                      {staffRoleLabel(staff)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 rounded-xl bg-white/12 border border-white/20 px-3 py-2">
                    <p className="text-white/60 text-[10px] font-medium">Dolu masa</p>
                    <p className="text-white font-bold text-lg leading-tight">{salonStats.occupied}</p>
                  </div>
                  <div className="flex-1 rounded-xl bg-white/12 border border-white/20 px-3 py-2">
                    <p className="text-white/60 text-[10px] font-medium">Toplam</p>
                    <p className="text-white font-bold text-lg leading-tight">{salonStats.total}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-5">
              <section>
                <SectionLabel>Gezin</SectionLabel>
                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => (
                    <NavRow
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      active={mainTab === item.id}
                      accent={accent}
                      onClick={() => navigate(item.id)}
                    />
                  ))}
                </nav>
              </section>

              <section>
                <SectionLabel>İşlemler</SectionLabel>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left bg-white border border-slate-200/80 shadow-sm active:scale-[0.99] transition-all disabled:opacity-60"
                >
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    {refreshing ? (
                      <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">Verileri yenile</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">Masalar, menü ve profil</span>
                  </span>
                </button>
              </section>
            </div>

            <div className="shrink-0 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 border-t border-slate-200/80 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setShowLogout(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold border border-red-100 active:scale-[0.98] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Çıkış yap
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
                MAKARA Mobil Personel
              </p>
            </div>
          </SidePanel>

      <LogoutModal open={showLogout} onClose={() => setShowLogout(false)} />
    </>
  );
}
