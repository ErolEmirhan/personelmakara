import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
  fetchCategories,
  fetchProducts,
  subscribeTables,
  subscribeBroadcasts,
  getTableOrderItems,
  subscribeTableOrderItems,
  submitMobileOrder,
  setStaffPresenceViewingTable,
  subscribeStaffAnnouncements,
  subscribeCatalog,
} from '../services/firebaseService';
import { resolveProductImages } from '../services/productImageCache';
import { getCatalogCache, setCatalogCache } from '../services/catalogCache';
import { YAN_URUNLER_CATEGORY_ID } from '../config/branch';
import { MAIN_TABS } from '../constants/nav';
import { useBranch } from './BranchContext';
import { useAuth } from './AuthContext';
import { hapticLight } from '../utils/haptic';
import {
  countUnreadAnnouncements,
  getLastNotificationsVisit,
  markNotificationsVisited,
} from '../utils/announcementUnread';
import { sanitizeCatalog } from '../utils/safeCatalog';
import { registerAppBusyChecker } from '../utils/appBusy';

import { ToastOverlay } from '../components/ui/Toast';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { branchKey, configured } = useBranch();
  const { staff } = useAuth();
  const [toast, setToast] = useState(null);
  const [screen, setScreen] = useState('tables');
  const [mainTab, setMainTabState] = useState(MAIN_TABS.TABLES);
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentSultanSection, setCurrentSultanSection] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderNote, setOrderNote] = useState('');
  const [currentOrderItems, setCurrentOrderItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartBump, setCartBump] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [pendingTableCarts, setPendingTableCarts] = useState({});
  const [pendingCartPrompt, setPendingCartPrompt] = useState(null);
  const pendingTableCartsRef = useRef({});
  const cartRef = useRef([]);
  const orderNoteRef = useRef('');
  const [unreadAnnouncementCount, setUnreadAnnouncementCount] = useState(0);
  const tablesUnsubRef = useRef(null);
  const catalogUnsubRef = useRef(null);
  const catalogSyncTimerRef = useRef(null);
  const orderItemsUnsubRef = useRef(null);
  const mainTabRef = useRef(mainTab);
  const backHandlersRef = useRef([]);

  const registerBackHandler = useCallback((id, handler) => {
    backHandlersRef.current.push({ id, handler });
    return () => {
      backHandlersRef.current = backHandlersRef.current.filter((h) => h.id !== id);
    };
  }, []);

  const runBackHandlers = useCallback(() => {
    const list = [...backHandlersRef.current];
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].handler()) return true;
    }
    return false;
  }, []);

  const showToast = useCallback((type, title, message) => {
    setToast({ type, title, message });
    window.setTimeout(() => setToast(null), 3800);
  }, []);

  const loadData = useCallback(async (options = {}) => {
    const { force = false } = typeof options === 'boolean' ? { force: options } : options;
    if (!configured || !branchKey) return;

    if (!force) {
      const cached = await getCatalogCache(branchKey);
      if (cached?.categories?.length) {
        const safe = sanitizeCatalog(cached.categories, cached.products || []);
        setCategories(safe.categories);
        setProducts(safe.products);
        setSelectedCategory((prev) => prev ?? safe.categories[0]?.id ?? null);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
      const withImages = await resolveProductImages(branchKey, prods);
      const safe = sanitizeCatalog(cats, withImages);
      setCategories(safe.categories);
      setProducts(safe.products);
      await setCatalogCache(branchKey, { categories: safe.categories, products: safe.products });
      setSelectedCategory((prev) => prev ?? safe.categories[0]?.id ?? null);
    } catch {
      showToast('error', 'Hata', 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [configured, branchKey, showToast]);

  const applyCatalogFromFirestore = useCallback(async (catalog) => {
    if (!branchKey || !catalog) return;
    try {
      const withImages = await resolveProductImages(branchKey, catalog.products || []);
      const safe = sanitizeCatalog(catalog.categories || [], withImages);
      setCategories(safe.categories);
      setProducts(safe.products);
      await setCatalogCache(branchKey, {
        categories: safe.categories,
        products: safe.products,
      });
      setSelectedCategory((prev) => {
        const cats = safe.categories;
        if (prev != null && cats.some((c) => c.id === prev)) return prev;
        return cats[0]?.id ?? null;
      });
    } catch (err) {
      console.warn('Katalog senkronu başarısız:', err);
    } finally {
      setLoading(false);
    }
  }, [branchKey]);

  const bootstrapCatalog = useCallback(async (onProgress) => {
    const report = (value) => onProgress?.(Math.min(100, Math.max(0, value)));
    if (!configured || !branchKey) {
      report(100);
      return;
    }

    report(6);
    try {
      const cached = await getCatalogCache(branchKey);
      report(20);
      if (cached?.categories?.length) {
        const safe = sanitizeCatalog(cached.categories, cached.products || []);
        setCategories(safe.categories);
        setProducts(safe.products);
        setSelectedCategory((prev) => prev ?? safe.categories[0]?.id ?? null);
        report(100);
        return;
      }

      report(28);
      const cats = await fetchCategories();
      report(48);
      const prods = await fetchProducts();
      report(64);
      const withImages = await resolveProductImages(branchKey, prods);
      report(86);
      const safe = sanitizeCatalog(cats, withImages);
      setCategories(safe.categories);
      setProducts(safe.products);
      await setCatalogCache(branchKey, { categories: safe.categories, products: safe.products });
      setSelectedCategory((prev) => prev ?? safe.categories[0]?.id ?? null);
      report(100);
    } catch {
      showToast('error', 'Hata', 'Veri yüklenemedi');
      report(100);
    }
  }, [configured, branchKey, showToast]);

  useEffect(() => {
    if (!configured || !branchKey) return;
    if (tablesUnsubRef.current) tablesUnsubRef.current();
    tablesUnsubRef.current = subscribeTables(branchKey, setTables);
    const unsubBroadcasts = subscribeBroadcasts((data) => {
      window.dispatchEvent(new CustomEvent('makara-broadcast', { detail: data }));
    });
    return () => {
      if (tablesUnsubRef.current) tablesUnsubRef.current();
      tablesUnsubRef.current = null;
      unsubBroadcasts();
    };
  }, [configured, branchKey]);

  useEffect(() => {
    if (!configured || !branchKey) return undefined;

    if (catalogUnsubRef.current) catalogUnsubRef.current();
    if (catalogSyncTimerRef.current) clearTimeout(catalogSyncTimerRef.current);

    catalogUnsubRef.current = subscribeCatalog((catalog) => {
      if (catalogSyncTimerRef.current) clearTimeout(catalogSyncTimerRef.current);
      catalogSyncTimerRef.current = window.setTimeout(() => {
        applyCatalogFromFirestore(catalog);
      }, 200);
    });

    return () => {
      if (catalogUnsubRef.current) catalogUnsubRef.current();
      catalogUnsubRef.current = null;
      if (catalogSyncTimerRef.current) clearTimeout(catalogSyncTimerRef.current);
      catalogSyncTimerRef.current = null;
    };
  }, [configured, branchKey, applyCatalogFromFirestore]);

  useEffect(() => {
    mainTabRef.current = mainTab;
  }, [mainTab]);

  useEffect(() => {
    pendingTableCartsRef.current = pendingTableCarts;
  }, [pendingTableCarts]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    orderNoteRef.current = orderNote;
  }, [orderNote]);

  const patchPendingTableCarts = useCallback((mutator) => {
    setPendingTableCarts((prev) => {
      const next = mutator(prev);
      if (next === prev) return prev;
      pendingTableCartsRef.current = next;
      return next;
    });
  }, []);

  const removePendingForTable = useCallback((tableId) => {
    if (tableId == null) return;
    const target = String(tableId);
    patchPendingTableCarts((prev) => {
      const key = Object.keys(prev).find((id) => String(id) === target);
      if (!key) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, [patchPendingTableCarts]);

  useEffect(() => {
    return registerAppBusyChecker(
      () => screen === 'order' && (cart.length > 0 || cartOpen)
    );
  }, [screen, cart.length, cartOpen]);

  useEffect(() => {
    if (!configured || !branchKey || !staff?.id) {
      setUnreadAnnouncementCount(0);
      return undefined;
    }

    const updateUnread = (list) => {
      try {
        if (mainTabRef.current === MAIN_TABS.NOTIFICATIONS) {
          setUnreadAnnouncementCount(0);
          return;
        }
        const lastVisit = getLastNotificationsVisit(branchKey, staff.id);
        setUnreadAnnouncementCount(countUnreadAnnouncements(list, staff.id, lastVisit));
      } catch (err) {
        console.warn('Unread announcement count failed:', err);
        setUnreadAnnouncementCount(0);
      }
    };

    return subscribeStaffAnnouncements(branchKey, updateUnread);
  }, [configured, branchKey, staff?.id]);

  useEffect(() => {
    if (mainTab !== MAIN_TABS.NOTIFICATIONS || !branchKey || !staff?.id) return;
    markNotificationsVisited(branchKey, staff.id);
    setUnreadAnnouncementCount(0);
  }, [mainTab, branchKey, staff?.id]);

  useEffect(() => {
    if (!staff) return;
    if (screen === 'order' && selectedTable) {
      const tableName =
        selectedTable.name ||
        (selectedTable.number != null ? `Masa ${selectedTable.number}` : 'Masa');
      setStaffPresenceViewingTable({
        tableId: selectedTable.id,
        tableName,
      });
    } else {
      setStaffPresenceViewingTable(null);
    }
  }, [staff, screen, selectedTable]);

  useEffect(() => {
    if (orderItemsUnsubRef.current) {
      orderItemsUnsubRef.current();
      orderItemsUnsubRef.current = null;
    }
    if (screen !== 'order' || !selectedTable?.id) {
      setCurrentOrderItems([]);
      return undefined;
    }
    orderItemsUnsubRef.current = subscribeTableOrderItems(selectedTable.id, setCurrentOrderItems);
    return () => {
      if (orderItemsUnsubRef.current) {
        orderItemsUnsubRef.current();
        orderItemsUnsubRef.current = null;
      }
    };
  }, [screen, selectedTable?.id]);

  const loadExistingOrders = useCallback(async (tableId) => {
    try {
      const items = await getTableOrderItems(tableId);
      setCurrentOrderItems(items);
    } catch {
      setCurrentOrderItems([]);
    }
  }, []);

  const clearPendingTableCart = useCallback((tableId) => {
    removePendingForTable(tableId);
  }, [removePendingForTable]);

  const finalizeSentOrder = useCallback((tableId) => {
    cartRef.current = [];
    orderNoteRef.current = '';
    setCart([]);
    setOrderNote('');
    removePendingForTable(tableId);
  }, [removePendingForTable]);

  const enterTable = useCallback(async (table, { openCart = false } = {}) => {
    setMainTabState(MAIN_TABS.TABLES);
    setSelectedTable(table);
    setScreen('order');
    setSearchQuery('');
    setCartOpen(openCart);

    const saved = pendingTableCartsRef.current[table.id];
    if (saved?.cart?.length) {
      cartRef.current = saved.cart;
      orderNoteRef.current = saved.orderNote || '';
      setCart(saved.cart);
      setOrderNote(saved.orderNote || '');
      removePendingForTable(table.id);
    } else {
      cartRef.current = [];
      orderNoteRef.current = '';
      setCart([]);
      setOrderNote('');
    }

    await loadExistingOrders(table.id);
  }, [loadExistingOrders, removePendingForTable]);

  const goBackToTables = useCallback(() => {
    const activeCart = cartRef.current;
    const activeNote = orderNoteRef.current;

    if (selectedTable?.id && activeCart.length) {
      patchPendingTableCarts((prev) => ({
        ...prev,
        [selectedTable.id]: {
          cart: activeCart,
          orderNote: activeNote,
          table: selectedTable,
        },
      }));
    } else if (selectedTable?.id) {
      removePendingForTable(selectedTable.id);
    }

    cartRef.current = [];
    orderNoteRef.current = '';
    setScreen('tables');
    setSelectedTable(null);
    setCart([]);
    setOrderNote('');
    setSearchQuery('');
    setCurrentOrderItems([]);
    setCartOpen(false);
  }, [selectedTable, patchPendingTableCarts, removePendingForTable]);

  const dismissPendingCartPrompt = useCallback(() => {
    setPendingCartPrompt(null);
  }, []);

  const resolvePendingCartGoTo = useCallback(async () => {
    if (!pendingCartPrompt) return;
    const { pendingTable, pendingCart, pendingNote } = pendingCartPrompt;
    setPendingCartPrompt(null);
    setMainTabState(MAIN_TABS.TABLES);
    setSelectedTable(pendingTable);
    setScreen('order');
    cartRef.current = pendingCart;
    orderNoteRef.current = pendingNote || '';
    setCart(pendingCart);
    setOrderNote(pendingNote || '');
    setCartOpen(true);
    setSearchQuery('');
    removePendingForTable(pendingTable.id);
    await loadExistingOrders(pendingTable.id);
  }, [pendingCartPrompt, loadExistingOrders, removePendingForTable]);

  const resolvePendingCartDiscard = useCallback(async () => {
    if (!pendingCartPrompt) return;
    const { pendingTableId, targetTable } = pendingCartPrompt;
    setPendingCartPrompt(null);
    removePendingForTable(pendingTableId);
    if (targetTable) {
      await enterTable(targetTable);
    }
  }, [pendingCartPrompt, enterTable, removePendingForTable]);

  const setMainTab = useCallback((tab) => {
    if (tab !== MAIN_TABS.TABLES && screen === 'order') {
      goBackToTables();
    }
    setMainTabState(tab);
  }, [screen, goBackToTables]);

  const selectTable = useCallback(async (table) => {
    const pending = pendingTableCartsRef.current;
    const otherPending = Object.entries(pending).find(
      ([id, data]) => id !== String(table.id) && data?.cart?.length > 0
    );

    if (otherPending) {
      const [, data] = otherPending;
      setPendingCartPrompt({
        pendingTableId: otherPending[0],
        pendingTable: data.table,
        pendingCart: data.cart,
        pendingNote: data.orderNote,
        targetTable: table,
      });
      return;
    }

    await enterTable(table);
  }, [enterTable]);

  const addToCart = useCallback((product, options = {}) => {
    const { isGift = false, extraNote = '', quantity = 1, displayName } = options;
    const itemName = displayName || product.name;
    hapticLight();
    setCartBump((n) => n + 1);
    setCart((prev) => {
      const existing = prev.find(
        (i) =>
          i.id === product.id &&
          i.name === itemName &&
          i.isGift === isGift &&
          (i.extraNote || '') === (extraNote || '')
      );
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: itemName,
          price: product.price,
          category_id: product.category_id,
          imageSrc: product.imageSrc || null,
          quantity,
          isGift,
          isYanUrun: product.category_id === YAN_URUNLER_CATEGORY_ID,
          extraNote,
          cartLineId: `${product.id}-${Date.now()}-${Math.random()}`,
        },
      ];
    });
  }, []);

  const updateCartItem = useCallback((cartLineId, updates) => {
    setCart((prev) => prev.map((i) => (i.cartLineId === cartLineId ? { ...i, ...updates } : i)));
  }, []);

  const removeFromCart = useCallback((cartLineId) => {
    setCart((prev) => prev.filter((i) => i.cartLineId !== cartLineId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setOrderNote('');
  }, []);

  const sendOrder = useCallback(async (staff) => {
    if (!selectedTable || !cart.length) return { success: false };
    return submitMobileOrder({
      items: cart,
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      tableType: selectedTable.type,
      orderNote,
      staffId: staff.id,
      staffName: `${staff.name} ${staff.surname}`,
    });
  }, [cart, selectedTable, orderNote]);

  const cartTotal = cart.reduce((sum, i) => sum + (i.isGift ? 0 : i.price * i.quantity), 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const optimisticallyCancelOrderItem = useCallback((itemId, cancelQty) => {
    setCurrentOrderItems((prev) => {
      const target = prev.find((i) => i.id === itemId);
      if (!target) return prev;
      const qty = Math.max(1, Math.min(cancelQty, target.quantity || 1));
      if (qty >= target.quantity) {
        return prev.filter((i) => i.id !== itemId);
      }
      return prev.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity - qty } : i
      );
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        screen, setScreen,
        mainTab, setMainTab,
        unreadAnnouncementCount,
        tables, setTables,
        categories, products,
        selectedTable, setSelectedTable,
        currentSultanSection, setCurrentSultanSection,
        selectedCategory, setSelectedCategory,
        cart, orderNote, setOrderNote,
        currentOrderItems, setCurrentOrderItems,
        searchQuery, setSearchQuery,
        loading, drawerOpen, setDrawerOpen,
        showToast,
        loadData, bootstrapCatalog, loadExistingOrders,
        selectTable, goBackToTables, enterTable,
        addToCart, updateCartItem, removeFromCart, clearCart,
        sendOrder, finalizeSentOrder, cartTotal, cartCount, cartBump,
        cartOpen, setCartOpen,
        pendingCartPrompt, dismissPendingCartPrompt,
        resolvePendingCartGoTo, resolvePendingCartDiscard,
        clearPendingTableCart,
        optimisticallyCancelOrderItem,
        registerBackHandler, runBackHandlers,
      }}
    >
      {children}
      <ToastOverlay toast={toast} />
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
