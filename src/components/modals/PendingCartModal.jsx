import { Modal } from '../ui/Modal';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';

function tableLabel(table) {
  if (!table) return 'Masa';
  return table.name || (table.number != null ? `Masa ${table.number}` : 'Masa');
}

function cartSummary(cart) {
  const count = (cart || []).reduce((sum, i) => sum + i.quantity, 0);
  const total = (cart || []).reduce(
    (sum, i) => sum + (i.isGift ? 0 : i.price * i.quantity),
    0
  );
  return { count, total };
}

export function PendingCartModal() {
  const { theme } = useBranch();
  const {
    pendingCartPrompt,
    dismissPendingCartPrompt,
    resolvePendingCartGoTo,
    resolvePendingCartDiscard,
  } = useApp();

  if (!pendingCartPrompt) return null;

  const { pendingTable, pendingCart } = pendingCartPrompt;
  const label = tableLabel(pendingTable);
  const { count, total } = cartSummary(pendingCart);

  return (
    <Modal
      open
      onClose={dismissPendingCartPrompt}
      title="Gönderilmemiş sepet var"
      className="max-w-sm"
    >
      <div className="mt-2 space-y-5">
        <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3.5">
          <p className="text-sm text-amber-950 leading-relaxed">
            <span className="font-bold">{label}</span> masasının sepeti hâlâ dolu
            ({count} ürün · {total.toFixed(2)} ₺). Sipariş gönderilmeden ayrıldınız.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={resolvePendingCartGoTo}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-[15px] bg-gradient-to-r ${theme.accent} active:scale-[0.98] transition-transform shadow-md`}
          >
            Sepete git
          </button>
          <button
            type="button"
            onClick={resolvePendingCartDiscard}
            className="w-full py-3.5 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-bold text-[15px] active:scale-[0.98] transition-transform"
          >
            Sepeti sil
          </button>
          <button
            type="button"
            onClick={dismissPendingCartPrompt}
            className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            Vazgeç
          </button>
        </div>
      </div>
    </Modal>
  );
}
