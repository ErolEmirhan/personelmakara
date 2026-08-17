import { hapticLight } from '../../utils/haptic';

export const ORDERS_VIEWS = {
  ACTIVE: 'active',
  TABLE_CALLS: 'table_calls',
  ORDER_CALLS: 'order_calls',
  HISTORY: 'history',
};

export function OrdersViewSwitch({
  view,
  onChange,
  accent,
  showTableCalls,
  showOrderCalls,
  showHistory,
}) {
  const tabs = [
    { id: ORDERS_VIEWS.ACTIVE, label: 'Aktif' },
  ];

  if (showTableCalls) {
    tabs.push({ id: ORDERS_VIEWS.TABLE_CALLS, label: 'Garson çağrıları' });
  }

  if (showOrderCalls) {
    tabs.push({ id: ORDERS_VIEWS.ORDER_CALLS, label: 'Masa siparişleri' });
  }

  if (showHistory) {
    tabs.push({ id: ORDERS_VIEWS.HISTORY, label: 'Geçmiş' });
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-1.5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.18)] backdrop-blur-sm">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onChange(tab.id);
                hapticLight();
              }}
              className={`flex-1 min-w-[4.75rem] py-2.5 px-2 rounded-xl text-[11px] font-bold leading-tight transition-all active:scale-[0.98] border ${
                active
                  ? 'text-white shadow-md border-transparent'
                  : 'text-slate-500 bg-slate-50/80 border-slate-200/80 hover:border-slate-300'
              }`}
              style={
                active
                  ? { background: `linear-gradient(145deg, ${accent} 0%, ${accent}cc 100%)` }
                  : undefined
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
