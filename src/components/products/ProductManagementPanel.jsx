import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SidePanel } from '../ui/SidePanel';
import { BottomSheet } from '../ui/BottomSheet';
import { ProfileImageCropModal } from '../modals/ProfileImageCropModal';
import { useBranch } from '../../context/BranchContext';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackButton';
import { seedAllProductDetailsFromFirestore, updateProductRecord } from '../../services/firebaseService';
import { clearCatalogCache } from '../../services/catalogCache';
import { clearProductImageCache, normalizeProductImage } from '../../services/productImageCache';
import { prepareSupportImageDataUrl, validateSupportImageDataUrl } from '../../services/staffProfileImage';
import { isBestSellersCategory } from '../../utils/bestSellers';
import { productNeedsDetailRefresh } from '../../utils/productDetailDefaults';
import { hapticLight } from '../../utils/haptic';

function productMeta(product) {
  return product?.firestoreDocId ? { firestoreDocId: product.firestoreDocId } : {};
}

const SHEET_Z = 'z-[9200]';

function ProductThumb({ imageSrc, name, accent }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        className="w-14 h-14 rounded-2xl object-cover shrink-0 ring-2 ring-white shadow-sm bg-slate-100"
      />
    );
  }
  return (
    <div
      className={`w-14 h-14 rounded-2xl shrink-0 ring-2 ring-white shadow-sm flex items-center justify-center text-white text-lg font-bold bg-gradient-to-br ${accent}`}
    >
      {initial}
    </div>
  );
}

function MetaChip({ active, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
        active
          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
          : 'bg-slate-50 text-slate-400 border-slate-100'
      }`}
    >
      {active && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
      {children}
    </span>
  );
}

function ActionChip({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 active:scale-[0.98] transition-transform shadow-sm"
    >
      {children}
    </button>
  );
}

function ProductEditorRow({
  product,
  accent,
  accentSolid,
  saving,
  onSaveBasics,
  onOpenContent,
  onOpenCalories,
  onOpenImage,
}) {
  const [name, setName] = useState(product.name || '');
  const [price, setPrice] = useState(String(product.price ?? ''));
  const imageSrc = product.imageSrc || normalizeProductImage(product.imageRaw);

  useEffect(() => {
    setName(product.name || '');
    setPrice(String(product.price ?? ''));
  }, [product.id, product.name, product.price]);

  const dirty =
    name.trim() !== (product.name || '').trim()
    || Number(price) !== Number(product.price);

  const hasContent = !!(product.content || '').trim();
  const hasCalories = !!(product.calories || '').trim();
  const hasImage = !!imageSrc;

  return (
    <article className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_28px_-22px_rgba(15,23,42,0.18)] overflow-hidden">
      <div className="p-3.5 flex gap-3">
        <ProductThumb imageSrc={imageSrc} name={name} accent={accent} />
        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2"
            style={{ boxShadow: 'none', outline: 'none' }}
            placeholder="Ürün adı"
          />
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2"
              placeholder="0,00"
            />
            <span className="text-sm font-bold text-slate-400 shrink-0">₺</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <MetaChip active={hasContent}>İçerik</MetaChip>
            <MetaChip active={hasCalories}>Kalori</MetaChip>
            <MetaChip active={hasImage}>Görsel</MetaChip>
          </div>
        </div>
      </div>

      <div className="px-3.5 pb-3.5 flex flex-wrap gap-2">
        <ActionChip onClick={() => onOpenContent(product)}>
          {hasContent ? 'İçerik düzenle' : 'İçerik ekle'}
        </ActionChip>
        <ActionChip onClick={() => onOpenImage(product)}>
          {hasImage ? 'Görsel değiştir' : 'Görsel ekle'}
        </ActionChip>
        <ActionChip onClick={() => onOpenCalories(product)}>
          {hasCalories ? 'Kalori düzenle' : 'Kalori bilgisi ekle'}
        </ActionChip>
        {dirty && (
          <button
            type="button"
            disabled={saving}
            onClick={() => onSaveBasics(product.id, name.trim(), price)}
            className="ml-auto text-[11px] font-bold px-3 py-1.5 rounded-xl text-white disabled:opacity-60 active:scale-[0.98] transition-transform"
            style={{ background: `linear-gradient(145deg, ${accentSolid} 0%, ${accentSolid}cc 100%)` }}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        )}
      </div>

      {(hasContent || hasCalories) && (
        <div className="px-3.5 pb-3.5 pt-0 space-y-2 border-t border-slate-50">
          {hasContent && (
            <div className="rounded-xl bg-slate-50/90 border border-slate-100 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">İçerik</p>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{product.content}</p>
            </div>
          )}
          {hasCalories && (
            <div className="rounded-xl bg-orange-50/80 border border-orange-100 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-orange-400 mb-0.5">Kalori</p>
              <p className="text-sm font-bold text-orange-900">{product.calories}</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function TextFieldSheet({ open, onClose, title, subtitle, value, onSave, multiline, placeholder, accentSolid }) {
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(value || '');
  }, [open, value]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } catch {
      /* parent toast */
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      zIndexClass={SHEET_Z}
    >
      <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4">
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        )}
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-[15px] disabled:opacity-60 active:scale-[0.98] transition-transform"
          style={{ background: `linear-gradient(145deg, ${accentSolid} 0%, ${accentSolid}cc 100%)` }}
        >
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </BottomSheet>
  );
}

export function ProductManagementPanel({ open, onClose }) {
  const { theme, branchKey } = useBranch();
  const { categories, products, loadData, showToast } = useApp();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [contentTarget, setContentTarget] = useState(null);
  const [calorieTarget, setCalorieTarget] = useState(null);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [imageTarget, setImageTarget] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const fileRef = useRef(null);
  const seedStartedRef = useRef(false);

  const accent = theme.accent;
  const accentSolid = theme.accentSolid;

  const catalogCategories = useMemo(
    () => (categories || []).filter((c) => !isBestSellersCategory(c.id)),
    [categories]
  );

  useEffect(() => {
    if (!open || selectedCategoryId != null) return;
    if (catalogCategories.length) setSelectedCategoryId(catalogCategories[0].id);
  }, [open, catalogCategories, selectedCategoryId]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setContentTarget(null);
      setCalorieTarget(null);
      setCropImageSrc(null);
      setImageTarget(null);
      seedStartedRef.current = false;
    }
  }, [open]);

  const refreshCatalog = useCallback(async () => {
    if (branchKey) {
      await clearProductImageCache(branchKey);
      await clearCatalogCache(branchKey);
    }
    await loadData({ force: true });
  }, [branchKey, loadData]);

  const runProductDetailSeed = useCallback(async (options = {}) => {
    const { force = false } = options;
    setSeeding(true);
    try {
      const { updated, skipped } = await seedAllProductDetailsFromFirestore({ force });
      if (updated > 0) {
        await refreshCatalog();
        showToast(
          'success',
          'Menü',
          force
            ? `${updated} ürünün içerik ve kalori bilgisi güncellendi`
            : `${updated} ürüne profesyonel içerik ve kalori eklendi`
        );
      } else if (force) {
        showToast('success', 'Menü', skipped > 0 ? 'Tüm ürünler zaten güncel' : 'Güncellenecek ürün bulunamadı');
      }
      return { updated };
    } catch (err) {
      showToast('error', 'Hata', err?.message || 'Menü detayları güncellenemedi');
      throw err;
    } finally {
      setSeeding(false);
    }
  }, [refreshCatalog, showToast]);

  useEffect(() => {
    if (!open || seedStartedRef.current || !(products || []).length) return undefined;
    if (!(products || []).some(productNeedsDetailRefresh)) return undefined;
    if ((products || []).some((p) => p.detailsEditedManually)) return undefined;

    seedStartedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        await runProductDetailSeed({ force: false });
      } catch {
        /* toast runProductDetailSeed içinde */
      }
      if (cancelled) seedStartedRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, [open, products, runProductDetailSeed]);

  const filteredProducts = useMemo(() => {
    const list = products || [];
    const q = search.trim().toLowerCase();
    if (q) {
      return list
        .filter((p) => String(p.name || '').toLowerCase().includes(q))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
    }
    if (selectedCategoryId == null) return [];
    return list
      .filter((p) => p.category_id === selectedCategoryId)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'));
  }, [products, selectedCategoryId, search]);

  const handleSaveBasics = async (productId, name, price) => {
    setSavingId(productId);
    try {
      await updateProductRecord(productId, { name, price: Number(price) }, productMeta(
        (products || []).find((p) => p.id === productId)
      ));
      await refreshCatalog();
      showToast('success', 'Kaydedildi', 'Ürün bilgileri güncellendi');
      hapticLight();
    } catch (err) {
      showToast('error', 'Hata', err?.message || 'Kaydedilemedi');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveContent = async (text) => {
    if (!contentTarget) return;
    try {
      await updateProductRecord(contentTarget.id, { content: text }, productMeta(contentTarget));
      await refreshCatalog();
      setContentTarget((prev) => (prev ? { ...prev, content: text.trim() } : null));
      showToast('success', 'İçerik', 'Ürün içeriği kaydedildi');
    } catch (err) {
      showToast('error', 'Hata', err?.message || 'Kaydedilemedi');
      throw err;
    }
  };

  const handleSaveCalories = async (text) => {
    if (!calorieTarget) return;
    try {
      await updateProductRecord(calorieTarget.id, { calories: text }, productMeta(calorieTarget));
      await refreshCatalog();
      setCalorieTarget((prev) => (prev ? { ...prev, calories: text.trim() } : null));
      showToast('success', 'Kalori', 'Kalori bilgisi kaydedildi');
    } catch (err) {
      showToast('error', 'Hata', err?.message || 'Kaydedilemedi');
      throw err;
    }
  };

  const handlePickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const prepared = await prepareSupportImageDataUrl(file);
      setCropImageSrc(prepared);
    } catch (err) {
      showToast('error', 'Görsel', err?.message || 'Geçersiz görsel');
    }
  };

  const handleCropConfirm = async (dataUrl) => {
    if (!imageTarget) return;
    setSavingId(imageTarget.id);
    setCropImageSrc(null);
    try {
      validateSupportImageDataUrl(dataUrl);
      await updateProductRecord(imageTarget.id, { image_base64: dataUrl }, productMeta(imageTarget));
      await refreshCatalog();
      showToast('success', 'Görsel', 'Ürün görseli kaydedildi');
    } catch (err) {
      showToast('error', 'Hata', err?.message || 'Görsel kaydedilemedi');
    } finally {
      setSavingId(null);
      setImageTarget(null);
    }
  };

  useBackHandler(!!contentTarget, () => setContentTarget(null));
  useBackHandler(!!calorieTarget, () => setCalorieTarget(null));
  useBackHandler(open && !contentTarget && !calorieTarget && !cropImageSrc, onClose);

  const selectedCategory = catalogCategories.find((c) => c.id === selectedCategoryId);

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        widthClass="w-[min(100vw,420px)]"
        zIndexClass="z-[8500]"
        ariaLabel="Ürün yönetimi"
        contentClassName="min-h-0 h-full bg-slate-50/80"
      >
        <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${accent} pt-[max(0.75rem,env(safe-area-inset-top))]`}>
          <div className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_15%_0%,white_0%,transparent_55%)]" />
          <div className="relative px-4 pt-3 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white/65 text-[10px] font-bold uppercase tracking-[0.18em]">
                  Müdür paneli
                </p>
                <h2 className="text-white font-display font-bold text-xl tracking-tight mt-1">
                  Ürün yönetimi
                </h2>
                <p className="text-white/70 text-xs mt-1">
                  {seeding ? 'Ürün bilgileri hazırlanıyor…' : 'Menü, fiyat ve ürün detayları'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-10 h-10 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Kapat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="relative mt-4 flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ürün ara..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white placeholder:text-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <button
                type="button"
                disabled={seeding}
                onClick={() => {
                  hapticLight();
                  runProductDetailSeed({ force: true });
                }}
                className="shrink-0 px-3 py-2.5 rounded-xl bg-white/15 border border-white/20 text-white text-[11px] font-bold disabled:opacity-60 active:scale-95 transition-transform"
                title="Tüm ürünlerin içerik ve kalori bilgisini yeniden oluştur"
              >
                {seeding ? '…' : 'Detayları yenile'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {!search.trim() && (
            <aside className="shrink-0 w-[7.5rem] border-r border-slate-200/80 bg-white/90 overflow-y-auto py-2 px-1.5">
              {catalogCategories.map((cat) => {
                const active = cat.id === selectedCategoryId;
                const count = (products || []).filter((p) => p.category_id === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      hapticLight();
                    }}
                    className={`w-full text-left px-2 py-2.5 rounded-xl mb-1 transition-all active:scale-[0.98] ${
                      active ? 'text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    style={
                      active
                        ? { background: `linear-gradient(145deg, ${accentSolid} 0%, ${accentSolid}cc 100%)` }
                        : undefined
                    }
                  >
                    <p className="text-[11px] font-bold leading-snug line-clamp-3">{cat.name}</p>
                    <p className={`text-[9px] mt-1 tabular-nums ${active ? 'text-white/70' : 'text-slate-400'}`}>
                      {count} ürün
                    </p>
                  </button>
                );
              })}
            </aside>
          )}

          <div className="flex-1 min-w-0 overflow-y-auto px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
            {!search.trim() && selectedCategory && (
              <p className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {selectedCategory.name}
              </p>
            )}
            {search.trim() && (
              <p className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Arama sonuçları · {filteredProducts.length}
              </p>
            )}

            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-2xl bg-white border border-slate-100">
                <p className="text-sm font-semibold text-slate-600">Ürün bulunamadı</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <ProductEditorRow
                  key={product.id}
                  product={product}
                  accent={accent}
                  accentSolid={accentSolid}
                  saving={savingId === product.id}
                  onSaveBasics={handleSaveBasics}
                  onOpenContent={(p) => {
                    const fresh = (products || []).find((x) => x.id === p.id) || p;
                    setContentTarget(fresh);
                  }}
                  onOpenCalories={(p) => {
                    const fresh = (products || []).find((x) => x.id === p.id) || p;
                    setCalorieTarget(fresh);
                  }}
                  onOpenImage={(p) => {
                    setImageTarget(p);
                    fileRef.current?.click();
                  }}
                />
              ))
            )}
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePickImage} />
      </SidePanel>

      {createPortal(
        <>
          <TextFieldSheet
            open={!!contentTarget}
            onClose={() => setContentTarget(null)}
            title="İçerik"
            subtitle={contentTarget?.name}
            value={contentTarget?.content || ''}
            multiline
            placeholder="Malzemeler, alerjenler, açıklama..."
            accentSolid={accentSolid}
            onSave={handleSaveContent}
          />

          <TextFieldSheet
            open={!!calorieTarget}
            onClose={() => setCalorieTarget(null)}
            title="Kalori bilgisi"
            subtitle={calorieTarget?.name}
            value={calorieTarget?.calories || ''}
            placeholder="ör. 450 kcal / porsiyon"
            accentSolid={accentSolid}
            onSave={handleSaveCalories}
          />
        </>,
        document.body
      )}

      <ProfileImageCropModal
        open={!!cropImageSrc}
        imageSrc={cropImageSrc}
        accent={accent}
        aspect={1}
        maxEdge={720}
        quality={0.82}
        title="Ürün görseli"
        confirmLabel="Kaydet"
        hint="Kare alanı ayarlayın — ticket mesajlarıyla aynı base64 formatında kaydedilir"
        useProfileCrop={false}
        onConfirm={handleCropConfirm}
        onCancel={() => {
          setCropImageSrc(null);
          setImageTarget(null);
        }}
      />
    </>
  );
}
