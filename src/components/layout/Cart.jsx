import { useState } from 'react';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackButton';
import { Modal } from '../ui/Modal';
import { hapticSuccess } from '../../utils/haptic';

function CartItemThumb({ imageSrc, name, accent }) {
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm bg-gray-100"
      />
    );
  }

  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className={`w-11 h-11 rounded-full shrink-0 ring-2 ring-white shadow-sm flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${accent}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}

export function Cart() {
  const { theme } = useBranch();
  const { staff } = useAuth();
  const {
    cart, cartTotal, cartCount, cartBump, screen,
    selectedTable, orderNote, setOrderNote,
    updateCartItem, removeFromCart, clearCart,
    showToast, goBackToTables, loadExistingOrders,
    sendOrder,
  } = useApp();

  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showNote, setShowNote] = useState(false);

  useBackHandler(
    screen === 'order' && !!selectedTable && (showNote || expanded),
    () => {
      if (showNote) {
        setShowNote(false);
        return;
      }
      if (expanded) {
        setExpanded(false);
      }
    }
  );

  if (screen !== 'order' || !selectedTable) return null;

  const handleSend = async () => {
    if (!cart.length || sending || !staff) return;
    setSending(true);
    const tableId = selectedTable.id;

    hapticSuccess();
    setSent(true);
    showToast('success', 'Sipariş Gönderildi', 'Kasaya iletildi, yazdırılıyor...');
    clearCart();
    loadExistingOrders(tableId);

    setTimeout(() => {
      setSending(false);
      setSent(false);
      if (theme.isSultan || theme.isMakaraHavzan) goBackToTables();
    }, 1200);

    try {
      const result = await sendOrder(staff);
      if (!result.success) {
        showToast('error', 'Hata', 'Sipariş kaydedilemedi');
      }
    } catch {
      showToast('error', 'Bağlantı Hatası', 'Firebase\'e iletilemedi');
    }
  };

  const toggleGift = (cartLineId) => {
    const item = cart.find((i) => i.cartLineId === cartLineId);
    if (item) updateCartItem(cartLineId, { isGift: !item.isGift });
  };

  const decrementItem = (item) => {
    if (item.quantity <= 1) {
      removeFromCart(item.cartLineId);
    } else {
      updateCartItem(item.cartLineId, { quantity: item.quantity - 1 });
    }
  };

  const bottomSafePad = 'pb-[calc(1rem+env(safe-area-inset-bottom,0px))]';

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="w-full rounded-t-3xl bg-white/95 backdrop-blur-md shadow-panel border-t border-white/80 overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r ${theme.accent} transition-all duration-ui ease-premium active:scale-[0.995]`}
          >
            <div className="flex items-center gap-3">
              <span
                key={cartBump}
                className={`w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-sm tabular-nums ${
                  cartBump > 0 ? 'animate-badge-pop' : ''
                }`}
              >
                {cartCount}
              </span>
              <span className="text-white font-bold tracking-tight">Sepet</span>
            </div>
            <span className="text-white font-black text-lg tabular-nums">{cartTotal.toFixed(2)} ₺</span>
          </button>

          <div
            className={`grid transition-[grid-template-rows] duration-panel ease-premium ${
              expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 mb-2">
                      <span className="text-xl" aria-hidden>🛒</span>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Sepet boş</p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div
                      key={item.cartLineId}
                      className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50/90 border border-slate-100/80 animate-stagger-in opacity-0"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <CartItemThumb imageSrc={item.imageSrc} name={item.name} accent={theme.accent} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">
                          {item.name}
                          {item.isGift && <span className="text-emerald-600 text-xs ml-1">İkram</span>}
                        </p>
                        <p className="text-gray-500 text-xs tabular-nums">
                          {item.isGift ? '0.00' : item.price.toFixed(2)} ₺ × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => decrementItem(item)}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold active:scale-95 transition-transform"
                          aria-label="Azalt"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItem(item.cartLineId, { quantity: item.quantity + 1 })}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold active:scale-95 transition-transform"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => toggleGift(item.cartLineId)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${
                          item.isGift ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-slate-200 text-slate-500'
                        }`}
                      >
                        🎁
                      </button>
                      <button
                        onClick={() => removeFromCart(item.cartLineId)}
                        className="text-red-400 font-bold text-lg px-1 active:scale-90 transition-transform"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
                <button
                  onClick={() => setShowNote(true)}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-semibold hover:border-slate-300 transition-colors"
                >
                  {orderNote ? `📝 ${orderNote}` : '📝 Sipariş notu ekle'}
                </button>
              </div>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={handleSend}
              disabled={sending}
              className={`w-full pt-4 font-bold text-lg text-white bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-70 transition-all duration-ui ease-premium active:scale-[0.99] ${bottomSafePad} ${
                sent ? 'animate-success-ripple' : ''
              }`}
            >
              {sent ? '✓ Gönderildi' : sending ? 'Gönderiliyor...' : 'Siparişi Gönder'}
            </button>
          )}

          {cart.length === 0 && (
            <div
              aria-hidden
              className={`min-h-[env(safe-area-inset-bottom,0px)] ${expanded ? 'bg-white/95' : `bg-gradient-to-r ${theme.accent}`}`}
            />
          )}
        </div>
      </div>

      <Modal open={showNote} onClose={() => setShowNote(false)} title="Sipariş Notu">
        <textarea
          value={orderNote}
          onChange={(e) => setOrderNote(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 resize-none h-24 focus-accent transition-all"
          style={{ '--accent-solid': theme.accentSolid, '--accent-ring': `${theme.accentSolid}33` }}
          autoFocus
          placeholder="Özel istek, alerji vb."
        />
        <button
          onClick={() => setShowNote(false)}
          className={`w-full mt-3 py-3 rounded-xl bg-gradient-to-r ${theme.accent} text-white font-bold active:scale-[0.98] transition-transform`}
        >
          Tamam
        </button>
      </Modal>
    </>
  );
}
