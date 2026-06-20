import { initializeApp, getApps, deleteApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';
import {
  BRANCH_FIREBASE,
  buildBaseTables,
  mergeFirestoreTables,
} from '../config/firebase';
import { getBranchTheme, YAN_URUNLER_CATEGORY_ID } from '../config/branch';
import { canSendStaffAnnouncements } from '../utils/staffRole';
import { normalizeProductImage } from './productImageCache';

let mainApp = null;
let tablesApp = null;
let mainDb = null;
let tablesDb = null;
let currentBranchKey = null;
let tablesUnsub = null;
let broadcastsUnsub = null;
let initPromise = null;

const PRESENCE_HEARTBEAT_MS = 30000;
const ONLINE_THRESHOLD_MS = 90000;
let presenceHeartbeat = null;
let presenceVisibilityHandler = null;
let presencePageHideHandler = null;
let presenceStaffRef = null;
let presenceBranchKey = null;
let presenceViewingTable = null; // { tableId, tableName } | null

function getTablesConfig(branchKey) {
  const cfg = BRANCH_FIREBASE[branchKey];
  if (!cfg) return null;
  return cfg.tables || cfg.main;
}

function cleanupListeners() {
  if (tablesUnsub) {
    try { tablesUnsub(); } catch { /* */ }
  }
  if (broadcastsUnsub) {
    try { broadcastsUnsub(); } catch { /* */ }
  }
  tablesUnsub = null;
  broadcastsUnsub = null;
}

export function isFirebaseReady() {
  return !!(mainDb && tablesDb && currentBranchKey);
}

async function doInitFirebase(branchKey) {
  const cfg = BRANCH_FIREBASE[branchKey];
  if (!cfg) throw new Error('Geçersiz şube');

  cleanupListeners();

  if (currentBranchKey !== branchKey || !mainDb || !tablesDb) {
    for (const app of [...getApps()]) {
      await deleteApp(app).catch(() => {});
    }
    mainApp = null;
    tablesApp = null;
    mainDb = null;
    tablesDb = null;

    mainApp = initializeApp(cfg.main, 'main');
    mainDb = getFirestore(mainApp);

    const tablesCfg = getTablesConfig(branchKey);
    if (tablesCfg.projectId === cfg.main.projectId) {
      tablesApp = mainApp;
      tablesDb = mainDb;
    } else {
      tablesApp = initializeApp(tablesCfg, 'tables');
      tablesDb = getFirestore(tablesApp);
    }
  }

  currentBranchKey = branchKey;
}

export async function initFirebase(branchKey) {
  if (currentBranchKey === branchKey && mainDb && tablesDb) {
    return;
  }

  if (initPromise) {
    await initPromise;
    if (currentBranchKey === branchKey && mainDb && tablesDb) return;
  }

  initPromise = doInitFirebase(branchKey);
  try {
    await initPromise;
  } finally {
    initPromise = null;
  }
}

export function getBranchKey() {
  return currentBranchKey;
}

function requireMainDb() {
  if (!mainDb) throw new Error('Firebase başlatılmadı');
  return mainDb;
}

function requireTablesDb() {
  if (!tablesDb) throw new Error('Firebase masalar DB başlatılmadı');
  return tablesDb;
}

function staffProfileSrc(data) {
  const raw =
    data?.profile_image_base64 ||
    data?.image_base64 ||
    data?.profileImage ||
    null;
  return normalizeProductImage(raw);
}

function parseStaffFlag(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  return false;
}

function mapStaffRecord(data, fallbackId) {
  const idRaw = data?.id ?? fallbackId;
  const id = typeof idRaw === 'string' ? parseInt(idRaw, 10) : idRaw;
  return {
    id,
    name: data?.name || '',
    surname: data?.surname || '',
    is_manager: parseStaffFlag(data?.is_manager) || parseStaffFlag(data?.isManager),
    is_chef: parseStaffFlag(data?.is_chef) || parseStaffFlag(data?.isChef),
    is_admin: parseStaffFlag(data?.is_admin) || parseStaffFlag(data?.isAdmin),
    is_boss: parseStaffFlag(data?.is_boss) || parseStaffFlag(data?.isBoss),
    profileImageSrc: staffProfileSrc(data),
  };
}

export async function fetchStaffRecord(staffId) {
  const ref = doc(requireMainDb(), 'staff', String(staffId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapStaffRecord(snap.data(), staffId);
}

export async function loginStaff(password) {
  const db = requireMainDb();
  const q = query(collection(db, 'staff'), where('password', '==', password.toString()));
  const snap = await getDocs(q);
  if (snap.empty) return { success: false, error: 'Şifre hatalı' };
  const docSnap = snap.docs[0];
  const data = docSnap.data();
  return {
    success: true,
    staff: mapStaffRecord(data, docSnap.id),
  };
}

export async function updateStaffProfileImage(staffId, imageDataUrl) {
  const ref = doc(requireMainDb(), 'staff', String(staffId));
  await updateDoc(ref, {
    profile_image_base64: imageDataUrl || null,
    updatedAt: new Date().toISOString(),
  });
  return { success: true };
}

export async function changeStaffPassword(staffId, currentPassword, newPassword) {
  const login = await loginStaff(currentPassword);
  if (!login.success || login.staff.id !== staffId) {
    return { success: false, error: 'Mevcut şifre hatalı' };
  }
  const ref = doc(requireMainDb(), 'staff', String(staffId));
  await updateDoc(ref, { password: newPassword.toString(), updatedAt: new Date().toISOString() });
  return { success: true };
}

export async function updateStaffMemberRoles(branchKey, staffId, roles) {
  const db = requireMainDb();
  const id = String(staffId);
  const timestamp = new Date().toISOString();
  const all = await fetchBranchStaff(branchKey);

  let isAdmin = !!roles.is_admin;
  let isBoss = !!roles.is_boss;
  let isManager = !!roles.is_manager;
  let isChef = branchKey === 'makara' ? !!roles.is_chef : false;

  if (isManager) isChef = false;
  if (isChef) isManager = false;

  const writes = [];

  if (isManager) {
    for (const s of all) {
      if (String(s.id) !== id && s.is_manager) {
        writes.push(
          updateDoc(doc(db, 'staff', String(s.id)), {
            is_manager: false,
            updatedAt: timestamp,
          })
        );
      }
    }
  }

  writes.push(
    updateDoc(doc(db, 'staff', id), {
      is_admin: isAdmin,
      is_boss: isBoss,
      is_manager: isManager,
      is_chef: isChef,
      updatedAt: timestamp,
    })
  );

  await Promise.all(writes);

  try {
    const presenceRef = doc(db, 'staff_presence', id);
    const presenceSnap = await getDoc(presenceRef);
    if (presenceSnap.exists()) {
      await updateDoc(presenceRef, {
        is_admin: isAdmin,
        is_boss: isBoss,
        is_manager: isManager,
        is_chef: isChef,
      });
    }
  } catch {
    /* presence yoksa sorun değil */
  }

  return { success: true };
}

export async function deleteStaffMember(staffId) {
  const db = requireMainDb();
  const id = String(staffId);
  await deleteDoc(doc(db, 'staff', id));
  try {
    await deleteDoc(doc(db, 'staff_presence', id));
  } catch {
    /* presence yoksa sorun değil */
  }
  return { success: true };
}

export async function updateStaffMemberProfile(staffId, { name, surname, password }) {
  const db = requireMainDb();
  const id = String(staffId);
  const trimmedName = (name ?? '').trim();
  const trimmedSurname = (surname ?? '').trim();

  if (!trimmedName || !trimmedSurname) {
    throw new Error('Ad ve soyad gerekli');
  }

  const patch = {
    name: trimmedName,
    surname: trimmedSurname,
    updatedAt: new Date().toISOString(),
  };

  const nextPassword = (password ?? '').toString().trim();
  if (nextPassword) {
    patch.password = nextPassword;
  }

  await updateDoc(doc(db, 'staff', id), patch);

  try {
    const presenceRef = doc(db, 'staff_presence', id);
    const presenceSnap = await getDoc(presenceRef);
    if (presenceSnap.exists()) {
      await updateDoc(presenceRef, {
        name: trimmedName,
        surname: trimmedSurname,
      });
    }
  } catch {
    /* presence yoksa sorun değil */
  }

  return { success: true };
}

export async function fetchCategories() {
  const snap = await getDocs(collection(requireMainDb(), 'categories'));
  let cats = [];
  snap.forEach((d) => {
    const c = d.data();
    cats.push({
      id: typeof c.id === 'string' ? parseInt(c.id, 10) : c.id,
      name: c.name || '',
      order_index: c.order_index || 0,
    });
  });
  cats.sort((a, b) => (a.order_index - b.order_index) || (a.id - b.id));

  if (currentBranchKey === 'sultansomati') {
    cats = cats.filter((c) => {
      const n = Number(c.id);
      if (n === 999999 || n === -999) return false;
      const nm = (c.name && String(c.name).trim().toLowerCase()) || '';
      return nm !== 'yan ürünler' && nm !== 'yan urunler';
    });
  }
  return cats;
}

/** Firestore ürün dokümanından görsel ham verisini çıkarır */
export function extractProductImageRaw(p) {
  if (!p) return null;
  const raw =
    p.image_base64 ||
    p.imageBase64 ||
    p.image ||
    p.image_url ||
    p.imageUrl ||
    null;
  if (raw == null || raw === '') return null;
  return typeof raw === 'string' ? raw : String(raw);
}

export async function fetchProducts(categoryId) {
  const snap = await getDocs(collection(requireMainDb(), 'products'));
  let products = [];
  snap.forEach((d) => {
    const p = d.data();
    const id = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
    products.push({
      id,
      name: p.name || '',
      price: Number(p.price) || 0,
      category_id: typeof p.category_id === 'string' ? parseInt(p.category_id, 10) : p.category_id,
      imageRaw: extractProductImageRaw(p),
      stock: p.stock,
      trackStock: p.trackStock || p.track_stock || false,
    });
  });
  if (categoryId) {
    products = products.filter((p) => p.category_id === categoryId);
  }
  return products;
}

export function subscribeTables(branchKey, onUpdate) {
  if (!isFirebaseReady()) {
    console.warn('subscribeTables: Firebase henüz hazır değil');
    return () => {};
  }

  cleanupListeners();

  const base = buildBaseTables(branchKey);
  const firestoreMap = {};
  const apply = () => onUpdate(mergeFirestoreTables(base, firestoreMap));
  const db = requireTablesDb();

  tablesUnsub = onSnapshot(
    collection(db, 'tables'),
    (snap) => {
      snap.forEach((d) => {
        firestoreMap[d.id] = d.data();
      });
      apply();
    },
    (err) => {
      console.error('tables snapshot error:', err);
      apply();
    }
  );

  apply();

  return () => {
    if (tablesUnsub) {
      try { tablesUnsub(); } catch { /* */ }
      tablesUnsub = null;
    }
  };
}

export function subscribeBroadcasts(onMessage) {
  if (!isFirebaseReady()) return () => {};

  if (broadcastsUnsub) {
    try { broadcastsUnsub(); } catch { /* */ }
  }

  const db = requireMainDb();
  const q = query(collection(db, 'broadcasts'), orderBy('created_at', 'desc'), limit(1));
  let initialized = false;

  broadcastsUnsub = onSnapshot(q, (snap) => {
    if (!initialized) {
      initialized = true;
      return;
    }
    snap.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const d = change.doc.data();
        onMessage({ message: d.message, date: d.date, time: d.time });
      }
    });
  });

  return () => {
    if (broadcastsUnsub) {
      try { broadcastsUnsub(); } catch { /* */ }
      broadcastsUnsub = null;
    }
  };
}

function mapTableOrderItems(data) {
  if (!data || !data.is_occupied || !Array.isArray(data.items)) return [];
  return data.items.map((item, idx) => ({
    id: item.id || idx,
    order_id: data.order_id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    price: item.price,
    isGift: item.isGift,
    staff_id: item.staff_id ?? null,
    staff_name: item.staff_name ?? null,
    item_note: item.item_note,
  }));
}

export async function getTableOrderItems(tableId) {
  const ref = doc(requireTablesDb(), 'tables', tableId);
  return new Promise((resolve) => {
    const unsub = onSnapshot(ref, (snap) => {
      unsub();
      resolve(mapTableOrderItems(snap.data()));
    });
  });
}

export function subscribeTableOrderItems(tableId, onUpdate) {
  if (!tableId) return () => {};
  const ref = doc(requireTablesDb(), 'tables', tableId);
  return onSnapshot(
    ref,
    (snap) => onUpdate(mapTableOrderItems(snap.data())),
    () => onUpdate([])
  );
}

export async function submitMobileOrder({ items, tableId, tableName, tableType, orderNote, staffId, staffName }) {
  const totalAmount = items.reduce(
    (s, i) => s + (i.isGift ? 0 : (Number(i.price) || 0) * (Number(i.quantity) || 0)),
    0
  );

  const payload = {
    status: 'pending',
    branchKey: currentBranchKey,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      category_id: item.category_id ?? null,
      isGift: item.isGift || false,
      isYanUrun: item.isYanUrun || false,
      extraNote: item.extraNote?.trim() || null,
    })),
    tableId,
    tableName,
    tableType,
    orderNote: orderNote || null,
    staffId,
    staffName,
    totalAmount,
    createdAt: serverTimestamp(),
    source: 'pwa',
  };

  const ref = await addDoc(collection(requireTablesDb(), 'mobile_orders'), payload);
  return { success: true, orderDocId: ref.id };
}

const MOBILE_QUEUE_COLLECTION = 'mobile_orders';

export async function submitMobileAction(action) {
  const payload = {
    status: 'pending',
    branchKey: currentBranchKey,
    source: 'pwa',
    queueKind: 'action',
    createdAt: serverTimestamp(),
    ...action,
  };
  const ref = await addDoc(collection(requireTablesDb(), MOBILE_QUEUE_COLLECTION), payload);
  return { success: true, actionDocId: ref.id };
}

function resolveMobileActionWait(data) {
  if (!data) return null;
  if (data.status === 'processed') {
    return { success: true, result: data.result || null };
  }
  if (data.status === 'failed') {
    return {
      success: false,
      error: data.error || 'İşlem başarısız',
      requiresReason: !!data.requiresReason,
    };
  }
  return null;
}

export function waitForMobileAction(actionDocId, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const ref = doc(requireTablesDb(), MOBILE_QUEUE_COLLECTION, actionDocId);
    let unsub = () => {};
    let processingStartedAt = null;
    const PROCESSING_LIMIT_MS = 25000;
    const POLL_MS = 2000;

    const cleanup = () => {
      clearTimeout(timer);
      clearInterval(pollTimer);
      try { unsub(); } catch { /* */ }
    };

    const finish = (value) => {
      cleanup();
      resolve(value);
    };

    const fail = (err) => {
      cleanup();
      reject(err);
    };

    const handleData = (data) => {
      if (!data) return;

      if (data.status === 'processing') {
        if (!processingStartedAt) processingStartedAt = Date.now();
        else if (Date.now() - processingStartedAt > PROCESSING_LIMIT_MS) {
          finish({
            success: false,
            error: 'Masaüstü uygulama yanıt vermedi. Uygulamanın açık olduğundan emin olun.',
          });
        }
        return;
      }

      processingStartedAt = null;
      const outcome = resolveMobileActionWait(data);
      if (outcome) finish(outcome);
    };

    const timer = setTimeout(() => {
      fail(new Error('İşlem zaman aşımına uğradı. Masaüstü uygulama açık ve doğru şubede mi?'));
    }, timeoutMs);

    const pollTimer = setInterval(() => {
      getDoc(ref)
        .then((snap) => handleData(snap.data()))
        .catch(() => {});
    }, POLL_MS);

    unsub = onSnapshot(
      ref,
      (snap) => handleData(snap.data()),
      (err) => fail(err)
    );
  });
}

export async function submitAndWaitMobileAction(action, timeoutMs = 45000) {
  const { actionDocId } = await submitMobileAction(action);
  return waitForMobileAction(actionDocId, timeoutMs);
}

export function cleanupFirebase() {
  stopStaffPresence(true);
  cleanupListeners();
}

// ── Personel çevrimiçi durumu (staff_presence) ───────────────────────────────

export async function touchStaffPresence(staff, branchKey, isOnline = true) {
  if (!staff?.id || !branchKey || !mainDb) return;
  const ref = doc(requireMainDb(), 'staff_presence', String(staff.id));
  const viewing = isOnline ? presenceViewingTable : null;
  await setDoc(
    ref,
    {
      staffId: staff.id,
      name: staff.name || '',
      surname: staff.surname || '',
      is_manager: !!staff.is_manager,
      is_chef: !!staff.is_chef,
      is_admin: !!staff.is_admin,
      is_boss: !!staff.is_boss,
      branchKey,
      isOnline,
      viewingTableId: viewing?.tableId ?? null,
      viewingTableName: viewing?.tableName ?? null,
      lastSeenAt: serverTimestamp(),
      clientTime: new Date().toISOString(),
    },
    { merge: true }
  );
}

/** Hangi masaya bakıldığını diğer personelle paylaş */
export function setStaffPresenceViewingTable(viewing) {
  presenceViewingTable = viewing;
  if (presenceStaffRef && presenceBranchKey) {
    touchStaffPresence(presenceStaffRef, presenceBranchKey, true).catch(() => {});
  }
}

export function startStaffPresence(staff, branchKey) {
  stopStaffPresence(false);
  presenceStaffRef = staff;
  presenceBranchKey = branchKey;

  const ping = () => touchStaffPresence(staff, branchKey, true).catch(() => {});
  ping();
  presenceHeartbeat = setInterval(ping, PRESENCE_HEARTBEAT_MS);

  presenceVisibilityHandler = () => {
    if (document.visibilityState === 'hidden') {
      touchStaffPresence(staff, branchKey, false).catch(() => {});
    } else {
      ping();
    }
  };
  document.addEventListener('visibilitychange', presenceVisibilityHandler);

  presencePageHideHandler = () => {
    touchStaffPresence(staff, branchKey, false).catch(() => {});
  };
  window.addEventListener('pagehide', presencePageHideHandler);
}

export function stopStaffPresence(markOffline = true) {
  if (presenceHeartbeat) {
    clearInterval(presenceHeartbeat);
    presenceHeartbeat = null;
  }
  if (presenceVisibilityHandler) {
    document.removeEventListener('visibilitychange', presenceVisibilityHandler);
    presenceVisibilityHandler = null;
  }
  if (presencePageHideHandler) {
    window.removeEventListener('pagehide', presencePageHideHandler);
    presencePageHideHandler = null;
  }
  if (markOffline && presenceStaffRef && presenceBranchKey) {
    touchStaffPresence(presenceStaffRef, presenceBranchKey, false).catch(() => {});
  }
  presenceStaffRef = null;
  presenceBranchKey = null;
  presenceViewingTable = null;
}

export async function fetchBranchStaff(branchKey) {
  const snap = await getDocs(collection(requireMainDb(), 'staff'));
  const list = [];
  snap.forEach((d) => {
    const s = d.data();
    if (s.branchKey && s.branchKey !== branchKey) return;
    list.push(mapStaffRecord(s, d.id));
  });
  return list.sort((a, b) =>
    `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, 'tr')
  );
}

function isPresenceRecordOnline(data) {
  if (!data) return false;
  const lastMs =
    data.lastSeenAt?.toMillis?.() ??
    (data.clientTime ? new Date(data.clientTime).getTime() : 0);
  const recentlySeen = lastMs > 0 && Date.now() - lastMs < ONLINE_THRESHOLD_MS;
  return !!data.isOnline && recentlySeen;
}

export function subscribeStaffPresence(branchKey, onUpdate) {
  if (!isFirebaseReady()) return () => {};
  const db = requireMainDb();
  const q = query(collection(db, 'staff_presence'), where('branchKey', '==', branchKey));
  return onSnapshot(
    q,
    (snap) => {
      const map = new Map();
      snap.forEach((d) => {
        const data = d.data();
        const staffId = data.staffId ?? (Number.isFinite(Number(d.id)) ? Number(d.id) : d.id);
        map.set(staffId, { ...data, online: isPresenceRecordOnline(data) });
      });
      onUpdate(map);
    },
    () => onUpdate(new Map())
  );
}

// ── Ekip bildirimleri (yönetici → personel + yorumlar) ───────────────────────

const STAFF_ANNOUNCEMENTS = 'staff_announcements';

function timestampToMs(value) {
  if (!value) return null;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function mapStaffAnnouncement(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    branchKey: data.branchKey,
    title: data.title || '',
    message: data.message || '',
    authorStaffId: data.authorStaffId,
    authorName: data.authorName || '',
    authorSurname: data.authorSurname || '',
    authorProfileImageSrc: data.authorProfileImageSrc || null,
    authorIsManager: !!data.authorIsManager,
    authorIsAdmin: !!data.authorIsAdmin,
    authorIsBoss: !!data.authorIsBoss,
    authorIsChef: !!data.authorIsChef,
    commentCount: data.commentCount || 0,
    createdAtMs: timestampToMs(data.createdAt),
  };
}

function mapAnnouncementComment(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    announcementId: data.announcementId,
    parentCommentId: data.parentCommentId || null,
    replyToStaffName: data.replyToStaffName || '',
    replyToStaffSurname: data.replyToStaffSurname || '',
    staffId: data.staffId,
    staffName: data.staffName || '',
    staffSurname: data.staffSurname || '',
    profileImageSrc: data.profileImageSrc || null,
    isManager: !!data.isManager,
    isAdmin: !!data.isAdmin,
    isBoss: !!data.isBoss,
    isChef: !!data.isChef,
    isReply: !!data.parentCommentId,
    text: data.text || '',
    createdAtMs: timestampToMs(data.createdAt),
  };
}

export async function createStaffAnnouncement(branchKey, staff, { title, message }) {
  if (!branchKey || !staff?.id) throw new Error('Oturum gerekli');
  const trimmedMessage = (message || '').trim();
  if (!trimmedMessage) throw new Error('Mesaj gerekli');
  if (trimmedMessage.length > 1000) throw new Error('Mesaj en fazla 1000 karakter olabilir');

  const trimmedTitle = (title || '').trim();
  if (trimmedTitle.length > 120) throw new Error('Başlık en fazla 120 karakter olabilir');

  const db = requireMainDb();
  const docRef = await addDoc(collection(db, STAFF_ANNOUNCEMENTS), {
    branchKey,
    title: trimmedTitle || null,
    message: trimmedMessage,
    authorStaffId: staff.id,
    authorName: staff.name || '',
    authorSurname: staff.surname || '',
    authorProfileImageSrc: staff.profileImageSrc || null,
    authorIsManager: !!staff.is_manager,
    authorIsAdmin: !!staff.is_admin,
    authorIsBoss: !!staff.is_boss,
    authorIsChef: !!staff.is_chef,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
  return { success: true, id: docRef.id };
}

export function subscribeStaffAnnouncements(branchKey, onUpdate) {
  if (!isFirebaseReady() || !branchKey) return () => {};
  const db = requireMainDb();
  const q = query(
    collection(db, STAFF_ANNOUNCEMENTS),
    where('branchKey', '==', branchKey)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(mapStaffAnnouncement);
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      onUpdate(list.slice(0, 50));
    },
    (err) => {
      console.error('staff_announcements snapshot error:', err);
      onUpdate([]);
    }
  );
}

export function subscribeAnnouncementComments(announcementId, onUpdate) {
  if (!isFirebaseReady() || !announcementId) return () => {};
  const db = requireMainDb();
  const q = query(
    collection(db, STAFF_ANNOUNCEMENTS, announcementId, 'comments')
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(mapAnnouncementComment);
      list.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
      onUpdate(list.slice(0, 200));
    },
    (err) => {
      console.error('announcement comments snapshot error:', err);
      onUpdate([]);
    }
  );
}

export async function addAnnouncementComment(announcementId, staff, text, options = {}) {
  if (!announcementId || !staff?.id) throw new Error('Oturum gerekli');
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Yorum gerekli');
  if (trimmed.length > 500) throw new Error('Yorum en fazla 500 karakter olabilir');

  const { parentCommentId, replyToStaffName, replyToStaffSurname } = options;

  if (parentCommentId && !canSendStaffAnnouncements(staff)) {
    throw new Error('Yanıt verme yetkiniz yok');
  }

  const db = requireMainDb();
  const announcementRef = doc(db, STAFF_ANNOUNCEMENTS, announcementId);

  await addDoc(collection(db, STAFF_ANNOUNCEMENTS, announcementId, 'comments'), {
    announcementId,
    parentCommentId: parentCommentId || null,
    replyToStaffName: replyToStaffName || null,
    replyToStaffSurname: replyToStaffSurname || null,
    staffId: staff.id,
    staffName: staff.name || '',
    staffSurname: staff.surname || '',
    profileImageSrc: staff.profileImageSrc || null,
    isManager: !!staff.is_manager,
    isAdmin: !!staff.is_admin,
    isBoss: !!staff.is_boss,
    isChef: !!staff.is_chef,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(announcementRef, { commentCount: increment(1) });

  return { success: true };
}

export async function deleteStaffAnnouncement(announcementId, staff) {
  if (!announcementId || !staff?.id) throw new Error('Oturum gerekli');

  const db = requireMainDb();
  const announcementRef = doc(db, STAFF_ANNOUNCEMENTS, announcementId);
  const snap = await getDoc(announcementRef);

  if (!snap.exists()) throw new Error('Bildirim bulunamadı');

  const data = snap.data();
  if (String(data.authorStaffId) !== String(staff.id)) {
    throw new Error('Bu bildirimi silme yetkiniz yok');
  }

  const commentsSnap = await getDocs(
    collection(db, STAFF_ANNOUNCEMENTS, announcementId, 'comments')
  );

  const refs = [...commentsSnap.docs.map((d) => d.ref), announcementRef];
  for (let i = 0; i < refs.length; i += 500) {
    const batch = writeBatch(db);
    refs.slice(i, i + 500).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  return { success: true };
}

// ── Push bildirim token'ları ─────────────────────────────────────────────────

const STAFF_PUSH_TOKENS = 'staff_push_tokens';
const MAX_PUSH_TOKENS_PER_STAFF = 5;

export async function saveStaffPushToken(staffId, branchKey, token) {
  if (!staffId || !branchKey || !token) return { success: false };
  const db = requireMainDb();
  const ref = doc(db, STAFF_PUSH_TOKENS, String(staffId));
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const existing = snap.data().tokens || [];
    if (existing.includes(token)) {
      return { success: true, unchanged: true, tokenCount: existing.length };
    }
    const merged = [...new Set([...existing, token])].slice(-MAX_PUSH_TOKENS_PER_STAFF);
    await updateDoc(ref, {
      branchKey,
      tokens: merged,
      updatedAt: serverTimestamp(),
    });
    return { success: true, tokenCount: merged.length };
  }

  await setDoc(ref, {
    staffId,
    branchKey,
    tokens: [token],
    updatedAt: serverTimestamp(),
  });
  return { success: true, tokenCount: 1 };
}

export async function getStaffPushRegistrationStatus(staffId) {
  const db = requireMainDb();
  const ref = doc(db, STAFF_PUSH_TOKENS, String(staffId));
  const snap = await getDoc(ref);
  const tokens = snap.exists() ? (snap.data().tokens || []) : [];
  return {
    staffRegistered: tokens.length > 0,
    staffTokenCount: tokens.length,
  };
}

export async function fetchBranchPushTokens(branchKey) {
  const db = requireMainDb();
  const snap = await getDocs(
    query(collection(db, STAFF_PUSH_TOKENS), where('branchKey', '==', branchKey))
  );
  const tokens = new Set();
  snap.forEach((docSnap) => {
    for (const token of docSnap.data()?.tokens || []) {
      if (typeof token === 'string' && token.length > 20) tokens.add(token);
    }
  });
  return [...tokens];
}

export async function pruneInvalidPushTokens(branchKey, invalidTokens) {
  if (!branchKey || !invalidTokens?.length) return;
  const db = requireMainDb();
  const snap = await getDocs(
    query(collection(db, STAFF_PUSH_TOKENS), where('branchKey', '==', branchKey))
  );
  const removeSet = new Set(invalidTokens);
  const batch = writeBatch(db);
  let writes = 0;

  snap.forEach((docSnap) => {
    const current = docSnap.data()?.tokens || [];
    const next = current.filter((t) => !removeSet.has(t));
    if (next.length !== current.length) {
      batch.update(docSnap.ref, { tokens: next, updatedAt: serverTimestamp() });
      writes += 1;
    }
  });

  if (writes > 0) await batch.commit();
}

// ── Destek / geri bildirim (personel ↔ admin) ────────────────────────────────

const STAFF_SUPPORT_TICKETS = 'staff_support_tickets';

function mapSupportTicket(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    branchKey: data.branchKey,
    staffId: data.staffId,
    staffName: data.staffName || '',
    staffSurname: data.staffSurname || '',
    category: data.category || 'issue',
    status: data.status || 'open',
    lastMessage: data.lastMessage || '',
    lastMessageAtMs: timestampToMs(data.lastMessageAt || data.updatedAt),
    createdAtMs: timestampToMs(data.createdAt),
    resolvedAtMs: timestampToMs(data.resolvedAt),
    resolvedByName: data.resolvedByName || '',
    needsAdminReply: !!data.needsAdminReply,
  };
}

function mapSupportMessage(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    staffId: data.staffId,
    staffName: data.staffName || '',
    staffSurname: data.staffSurname || '',
    isAdmin: !!data.isAdmin,
    text: data.text || '',
    createdAtMs: timestampToMs(data.createdAt),
  };
}

export async function createSupportTicket(branchKey, staff, { category, text }) {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Mesaj gerekli');

  const db = requireMainDb();
  const ticketRef = await addDoc(collection(db, STAFF_SUPPORT_TICKETS), {
    branchKey,
    staffId: staff.id,
    staffName: staff.name || '',
    staffSurname: staff.surname || '',
    category: category || 'issue',
    status: 'open',
    lastMessage: trimmed.slice(0, 200),
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    needsAdminReply: true,
  });

  await addDoc(collection(db, STAFF_SUPPORT_TICKETS, ticketRef.id, 'messages'), {
    staffId: staff.id,
    staffName: staff.name || '',
    staffSurname: staff.surname || '',
    isAdmin: !!staff.is_admin,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  return ticketRef.id;
}

export function subscribeStaffSupportTickets(staffId, onUpdate) {
  if (!isFirebaseReady() || staffId == null) return () => {};
  const db = requireMainDb();
  const q = query(
    collection(db, STAFF_SUPPORT_TICKETS),
    where('staffId', '==', staffId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(mapSupportTicket);
      list.sort((a, b) => (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0));
      onUpdate(list);
    },
    (err) => {
      console.error('support tickets snapshot error:', err);
      onUpdate([]);
    }
  );
}

export function subscribeBranchSupportTickets(branchKey, onUpdate) {
  if (!isFirebaseReady() || !branchKey) return () => {};
  const db = requireMainDb();
  const q = query(
    collection(db, STAFF_SUPPORT_TICKETS),
    where('branchKey', '==', branchKey)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(mapSupportTicket);
      list.sort((a, b) => (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0));
      onUpdate(list);
    },
    (err) => {
      console.error('branch support tickets snapshot error:', err);
      onUpdate([]);
    }
  );
}

export function subscribeSupportMessages(ticketId, onUpdate) {
  if (!isFirebaseReady() || !ticketId) return () => {};
  const db = requireMainDb();
  const q = query(
    collection(db, STAFF_SUPPORT_TICKETS, ticketId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map(mapSupportMessage));
    },
    (err) => {
      console.error('support messages snapshot error:', err);
      onUpdate([]);
    }
  );
}

export async function sendSupportMessage(ticketId, staff, text) {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Mesaj gerekli');

  const db = requireMainDb();
  const ticketRef = doc(db, STAFF_SUPPORT_TICKETS, ticketId);
  const ticketSnap = await getDoc(ticketRef);
  if (!ticketSnap.exists()) throw new Error('Konuşma bulunamadı');

  const ticket = ticketSnap.data();
  if (ticket.status === 'resolved') throw new Error('Bu konuşma kapatılmış');

  const isAdmin = !!staff.is_admin;

  if (!isAdmin && ticket.staffId !== staff.id) {
    throw new Error('Bu konuşmaya erişim yok');
  }

  await addDoc(collection(db, STAFF_SUPPORT_TICKETS, ticketId, 'messages'), {
    staffId: staff.id,
    staffName: staff.name || '',
    staffSurname: staff.surname || '',
    isAdmin,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  await updateDoc(ticketRef, {
    lastMessage: trimmed.slice(0, 200),
    lastMessageAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    needsAdminReply: !isAdmin,
  });
}

export async function resolveSupportTicket(ticketId, adminStaff) {
  if (!adminStaff?.is_admin) throw new Error('Yetki gerekli');

  const db = requireMainDb();
  const ticketRef = doc(db, STAFF_SUPPORT_TICKETS, ticketId);
  const ticketSnap = await getDoc(ticketRef);
  if (!ticketSnap.exists()) throw new Error('Konuşma bulunamadı');

  await updateDoc(ticketRef, {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resolvedByName: `${adminStaff.name || ''} ${adminStaff.surname || ''}`.trim(),
    needsAdminReply: false,
  });
}

export { YAN_URUNLER_CATEGORY_ID, getBranchTheme };
