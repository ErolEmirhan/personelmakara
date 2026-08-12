export function isStaffAdmin(staff) {
  return !!(staff?.is_admin);
}

export function isStaffBoss(staff) {
  return !!(staff?.is_boss);
}

export function isStaffManager(staff) {
  return !!(staff?.is_manager);
}

export function isStaffChef(staff) {
  return !!(staff?.is_chef);
}

/**
 * Müdür seviyesi operasyon yetkisi.
 * Şef = müdür ile birebir aynı yetkiler (ürün yönetimi, iptal, birleştirme, duyuru vb.).
 * Admin / patron da bu seviyeyi kapsar.
 */
export function hasManagerLevelAccess(staff) {
  if (!staff) return false;
  return !!(staff.is_admin || staff.is_boss || staff.is_manager || staff.is_chef);
}

export function staffRoleLabel(staff) {
  if (!staff) return 'Personel';
  if (isStaffAdmin(staff)) return 'Admin';
  if (isStaffBoss(staff)) return 'Patron';
  if (staff.is_manager) return 'Müdür';
  if (staff.is_chef) return 'Şef';
  return 'Personel';
}

export function staffRolePriority(staff) {
  if (isStaffAdmin(staff)) return 0;
  if (isStaffBoss(staff)) return 1;
  if (staff?.is_manager) return 2;
  if (staff?.is_chef) return 3;
  return 4;
}

export function canManageStaff(staff) {
  return isStaffAdmin(staff);
}

/** Ayarlardan ekip bildirimi gönderebilir (müdür, şef, admin, patron) */
export function canSendStaffAnnouncements(staff) {
  return hasManagerLevelAccess(staff);
}

/** Kahvaltı satış kaydı (müdür, şef, admin, patron) */
export function canViewBreakfastSalesRecord(staff) {
  return hasManagerLevelAccess(staff);
}

/** Siparişler ekranında günlük geçmiş satışlar */
export function canViewDailySalesHistory(staff) {
  return hasManagerLevelAccess(staff);
}

/** Ürün yönetimi paneli */
export function canManageProducts(staff) {
  return hasManagerLevelAccess(staff);
}
