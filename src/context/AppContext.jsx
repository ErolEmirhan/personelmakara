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
} from '../services/firebaseService';
import { resolveProductImages } from '../services/productImageCache';
import { getCatalogCache, setCatalogCache } from '../services/catalogCache';
import { YAN_URUNLER_CATEGORY_ID } from '../config/branch';
import { MAIN_TABS } from '../constants/nav';
import { useBranch } from './BranchContext';
import { useAuth } from './AuthContext';

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
  const tablesUnsubRef = useRef(null);
  const orderItemsUnsubRef = useRef(null);
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
        setCategories(cached.categories);
        setProducts(cached.products || []);
        setSelectedCategory((prev) => prev ?? cached.categories[0]?.id ?? null);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()]);
      setCategories(cats);
      const withImages = await resolveProductImages(branchKey, prods);
      setProducts(withImages);
      await setCatalogCache(branchKey, { categories: cats, products: withImages });
      setSelectedCategory((prev) => prev ?? cats[0]?.id ?? null);
    } catch {
      showToast('error', 'Hata', 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [configured, branchKey, showToast]);

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
        setCategories(cached.categories);
        setProducts(cached.products || []);
        setSelectedCategory((prev) => prev ?? cached.categories[0]?.id ?? null);
        report(100);
        return;
      }

      report(28);
      const cats = await fetchCategories();
      report(48);
      const prods = await fetchProducts();
      report(64);
      setCategories(cats);
      const withImages = await resolveProductImages(branchKey, prods);
      report(86);
      setProducts(withImages);
      await setCatalogCache(branchKey, { categories: cats, products: withImages });
      setSelectedCategory((prev) => prev ?? cats[0]?.id ?? null);
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

  const goBackToTables = useCallback(() => {
    setScreen('tables');
    setSelectedTable(null);
    setCart([]);
    setOrderNote('');
    setSearchQuery('');
    setCurrentOrderItems([]);
  }, []);

  const setMainTab = useCallback((tab) => {
    if (tab !== MAIN_TABS.TABLES && screen === 'order') {
      goBackToTables();
    }
    setMainTabState(tab);
  }, [screen, goBackToTables]);

  const selectTable = useCallback(async (table) => {
    setMainTabState(MAIN_TABS.TABLES);
    setSelectedTable(table);
    setScreen('order');
    setCart([]);
    setOrderNote('');
    await loadExistingOrders(table.id);
  }, [loadExistingOrders]);

  const addToCart = useCallback((product, options = {}) => {
    const { isGift = false, extraNote = '', quantity = 1 } = options;
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.id === product.id && i.isGift === isGift && (i.extraNote || '') === (extraNote || '')
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
          name: product.name,
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
        selectTable, goBackToTables,
        addToCart, updateCartItem, removeFromCart, clearCart,
        sendOrder, cartTotal, cartCount,
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
