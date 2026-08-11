import { hapticLight } from '../../utils/haptic';

export const ORDERS_VIEWS = {
  ACTIVE: 'active',
  HISTORY: 'history',
};

export function OrdersViewSwitch({ view, onChange, accent }) {
  return (
    <div className="p-1 rounded-2xl bg-slate-100 flex gap-1">
      {[
        { id: ORDERS_VIEWS.ACTIVE, label: 'Aktif siparişler' },
        { id: ORDERS_VIEWS.HISTORY, label: 'Geçmiş satışlar' },
      ].map((tab) => {
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              onChange(tab.id);
              hapticLight();
            }}
            className={`flex-1 py-2.5 px-2 rounded-xl text-[13px] font-bold transition-all active:scale-[0.98] ${
              active ? 'text-white shadow-md' : 'text-slate-500'
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
  );
}
