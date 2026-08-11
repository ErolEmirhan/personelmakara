import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBranch } from '../../context/BranchContext';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackButton';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { hapticSuccess } from '../../utils/haptic';

function CartItemThumb({ imageSrc, name, accent }) {
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        className="w-12 h-12 rounded-xl object-cover shrink-0 ring-2 ring-white shadow-sm bg-gray-100"
      />
    );
  }

  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div
      className={`w-12 h-12 rounded-xl shrink-0 ring-2 ring-white shadow-sm flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br ${accent}`}
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
    sendOrder, cartOpen, setCartOpen, finalizeSentOrder,
  } = useApp();

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const noteInputRef = useRef(null);
  const shouldFocusNoteRef = useRef(false);
  const keyboardInset = useKeyboardInset();

  const focusNoteInput = useCallback(() => {
    const input = noteInputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
    });
  }, []);

  const openNoteEditor = useCallback(() => {
    shouldFocusNoteRef.current = true;
    setShowNote(true);

    // iOS PWA: klavyeyi dokunuş zinciri içinde aç
    const probe = document.createElement('input');
    probe.type = 'text';
    probe.setAttribute('readonly', 'readonly');
    probe.style.cssText = 'position:fixed;top:50%;left:50%;opacity:0;height:0;font-size:16px;';
    document.body.appendChild(probe);
    probe.focus();
    window.setTimeout(() => {
      probe.remove();
      focusNoteInput();
    }, 0);
  }, [focusNoteInput]);

  const assignNoteInputRef = useCallback((node) => {
    noteInputRef.current = node;
    if (!node || !shouldFocusNoteRef.current) return;
    shouldFocusNoteRef.current = false;
    focusNoteInput();
  }, [focusNoteInput]);

  useBackHandler(
    screen === 'order' && !!selectedTable && (showNote || cartOpen),
    () => {
      if (showNote) {
        setShowNote(false);
        return;
      }
      if (cartOpen) {
        setCartOpen(false);
      }
    }
  );

  useEffect(() => {
    if (!cartOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [cartOpen]);

  useLayoutEffect(() => {
    if (!showNote) return;
    focusNoteInput();
  }, [showNote, focusNoteInput]);

  useEffect(() => {
    if (!showNote) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showNote]);

  if (screen !== 'order' || !selectedTable) return null;

  const handleSend = async () => {
    if (!cart.length || sending || !staff) return;
    setSending(true);
    const tableId = selectedTable.id;

    try {
      const result = await sendOrder(staff);
      if (!result.success) {
        showToast('error', 'Hata', 'Sipariş kaydedilemedi');
        setSending(false);
        return;
      }

      hapticSuccess();
      setSent(true);
      showToast('success', 'Sipariş Gönderildi', 'Kasaya iletildi, yazdırılıyor...');
      finalizeSentOrder(tableId);
      loadExistingOrders(tableId);
      setCartOpen(false);

      setTimeout(() => {
        setSending(false);
        setSent(false);
        if (theme.isSultan || theme.isMakaraHavzan) goBackToTables();
      }, 1200);
    } catch {
      showToast('error', 'Bağlantı Hatası', 'Firebase\'e iletilemedi');
      setSending(false);
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

  const tableLabel = selectedTable?.name || `Masa ${selectedTable?.number ?? ''}`;

  const sheet = cartOpen && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[8500] flex flex-col" role="dialog" aria-modal="true" aria-label="Sepet">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[4px]"
            onClick={() => setCartOpen(false)}
            aria-label="Kapat"
          />

          <div className="relative flex flex-col h-full w-full bg-white animate-slide-up safe-top safe-bottom">
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Sepet</p>
                  <h2 className="text-xl font-display font-bold text-slate-900 truncate">{tableLabel}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="shrink-0 w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Kapat"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 border border-slate-100">
                <span className="text-sm font-semibold text-slate-600">{cartCount} ürün</span>
                <span className="text-lg font-display font-bold tabular-nums text-slate-900">
                  {cartTotal.toFixed(2)} ₺
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 mb-3">
                    <span className="text-2xl" aria-hidden>🛒</span>
                  </div>
                  <p className="text-slate-500 font-medium">Sepet boş</p>
                  <p className="text-slate-400 text-sm mt-1">Ürün ekleyip buradan gönderebilirsiniz</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div
                    key={item.cartLineId}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm animate-stagger-in opacity-0"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <CartItemThumb imageSrc={item.imageSrc} name={item.name} accent={theme.accent} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 leading-snug">
                        {item.name}
                        {item.isGift && <span className="text-emerald-600 text-xs ml-1">İkram</span>}
                      </p>
                      <p className="text-gray-500 text-xs tabular-nums mt-0.5">
                        {item.isGift ? '0.00' : item.price.toFixed(2)} ₺ × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => decrementItem(item)}
                        className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 font-bold active:scale-95 transition-transform"
                        aria-label="Azalt"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-bold tabular-nums text-sm">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartItem(item.cartLineId, { quantity: item.quantity + 1 })}
                        className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 font-bold active:scale-95 transition-transform"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleGift(item.cartLineId)}
                      className={`text-xs font-bold px-2 py-1.5 rounded-xl transition-colors ${
                        item.isGift ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 border border-slate-200 text-slate-500'
                      }`}
                    >
                      🎁
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartLineId)}
                      className="text-red-400 font-bold text-xl px-1 active:scale-90 transition-transform"
                      aria-label="Kaldır"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="shrink-0 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-slate-100 bg-white/95 backdrop-blur-sm space-y-2.5">
              <button
                type="button"
                onClick={openNoteEditor}
                className={`w-full py-3 rounded-2xl border-2 text-sm font-semibold transition-colors active:scale-[0.99] ${
                  orderNote
                    ? 'border-violet-200 bg-violet-50 text-violet-800'
                    : 'border-dashed border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <span className="block truncate">
                  {orderNote ? `📝 ${orderNote}` : '📝 Sipariş notu ekle'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || cart.length === 0}
                className={`w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-emerald-500 to-teal-500 disabled:opacity-45 disabled:cursor-not-allowed transition-all duration-ui ease-premium active:scale-[0.99] shadow-[0_14px_32px_-12px_rgba(16,185,129,0.55)] ${
                  sent ? 'animate-success-ripple' : ''
                }`}
              >
                {sent ? '✓ Gönderildi' : sending ? 'Gönderiliyor...' : `Siparişi Gönder · ${cartTotal.toFixed(2)} ₺`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  const noteSheet = showNote && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[8600]" role="dialog" aria-modal="true" aria-label="Sipariş notu">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
            onClick={() => setShowNote(false)}
            aria-label="Kapat"
          />
          <div
            className="absolute inset-x-0 bg-white rounded-t-[1.75rem] shadow-[0_-16px_48px_rgba(15,23,42,0.18)] animate-slide-up"
            style={{
              bottom: keyboardInset,
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" aria-hidden />
            </div>
            <div className="px-5 pb-2">
              <h3 className="text-lg font-bold text-gray-900 font-display">Sipariş Notu</h3>
              <p className="text-xs text-slate-500 mt-0.5">Özel istek, alerji vb.</p>
            </div>
            <div className="px-5 pb-4">
              <textarea
                ref={assignNoteInputRef}
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 resize-none h-28 focus-accent transition-all text-base"
                style={{ '--accent-solid': theme.accentSolid, '--accent-ring': `${theme.accentSolid}33` }}
                placeholder="Notunuzu yazın..."
                autoFocus
                inputMode="text"
                enterKeyHint="done"
              />
              <button
                type="button"
                onClick={() => setShowNote(false)}
                className={`w-full mt-3 py-3.5 rounded-xl bg-gradient-to-r ${theme.accent} text-white font-bold active:scale-[0.98] transition-transform`}
              >
                Tamam
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {sheet}
      {noteSheet}
    </>
  );
}

/** Sipariş ekranı üst barındaki sepet butonu */
export function OrderCartButton() {
  const { theme } = useBranch();
  const { cartTotal, cartCount, cartBump, setCartOpen } = useApp();

  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      className={`relative shrink-0 flex items-center gap-2.5 pl-3 pr-3.5 py-2 min-h-[3.25rem] rounded-2xl text-white shadow-[0_12px_28px_-10px_rgba(15,23,42,0.35)] active:scale-[0.97] transition-all bg-gradient-to-br ${theme.accent}`}
      aria-label={`Sepet, ${cartCount} ürün, ${cartTotal.toFixed(2)} lira`}
    >
      <span className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/20">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        {cartCount > 0 && (
          <span
            key={cartBump}
            className={`absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-white text-[11px] font-black tabular-nums flex items-center justify-center shadow-md ${
              cartBump > 0 ? 'animate-badge-pop' : ''
            }`}
            style={{ color: theme.accentSolid }}
          >
            {cartCount}
          </span>
        )}
      </span>
      <div className="text-left min-w-[3.5rem]">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/80 leading-none">Sepet</p>
        <p className="text-[15px] font-black tabular-nums leading-tight mt-0.5">{cartTotal.toFixed(2)} ₺</p>
      </div>
    </button>
  );
}
