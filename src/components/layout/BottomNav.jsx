import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { MAIN_TABS } from '../../constants/nav';
const LEFT_TABS = [
  {
    id: MAIN_TABS.TABLES,
    label: 'Masalar',
    icon: (active) => (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75A2.25 2.25 0 0115.75 13.5H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25zM13.5 6A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: MAIN_TABS.ORDERS,
    label: 'Siparişler',
    icon: (active) => (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
];

const RIGHT_TABS = [
  {
    id: MAIN_TABS.NOTIFICATIONS,
    label: 'Bildirimler',
    badge: true,
    icon: (active) => (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    id: MAIN_TABS.OTHER,
    label: 'Ayarlar',
    icon: (active) => (
      <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function NavItem({ tab, active, accent, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1 min-w-0 py-2 transition-colors ${
        active ? 'text-slate-900' : 'text-slate-400'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span
        className={`relative flex items-center justify-center w-10 h-7 rounded-2xl transition-all duration-300 ${
          active ? 'scale-105' : ''
        }`}
        style={active ? { color: accent, backgroundColor: `${accent}14` } : undefined}
      >
        {tab.icon(active)}
        {tab.badge && !active && (
          <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-white" />
        )}
      </span>
      <span className={`text-[10px] font-semibold tracking-wide truncate max-w-full px-0.5 ${
        active ? 'text-slate-800' : 'text-slate-400'
      }`}
      >
        {tab.label}
      </span>
    </button>
  );
}

export function BottomNav({ accountOpen, onAccountOpen }) {
  const { theme } = useBranch();
  const { mainTab, setMainTab } = useApp();  const accent = theme.accentSolid;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      aria-label="Ana menü"
    >
      <div
        className="pointer-events-auto relative mx-3 mb-[max(0.65rem,env(safe-area-inset-bottom))] rounded-[1.65rem] bg-white border border-slate-200/90 shadow-[0_-8px_40px_rgba(15,23,42,0.08),0_16px_40px_rgba(15,23,42,0.06)]"
        style={{ height: '4.25rem' }}
      >
        <div className="grid grid-cols-5 h-full items-end pb-1.5">
          {LEFT_TABS.map((tab) => (
            <NavItem
              key={tab.id}
              tab={tab}
              active={mainTab === tab.id}
              accent={accent}
              onSelect={setMainTab}
            />
          ))}

          <div className="flex items-end justify-center" aria-hidden />

          {RIGHT_TABS.map((tab) => (
            <NavItem
              key={tab.id}
              tab={tab}
              active={mainTab === tab.id}
              accent={accent}
              onSelect={setMainTab}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onAccountOpen}
          className="absolute left-1/2 -translate-x-1/2 -top-7 w-[3.75rem] h-[3.75rem] rounded-full flex items-center justify-center active:scale-[0.96] transition-transform shadow-[0_12px_32px_-8px_rgba(15,23,42,0.35)] ring-[3px] ring-white"
          style={{
            background: `linear-gradient(145deg, ${accent} 0%, ${accent}cc 100%)`,
          }}
          aria-label="Hızlı işlemler"
          aria-expanded={accountOpen}
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>      </div>
    </nav>
  );
}
