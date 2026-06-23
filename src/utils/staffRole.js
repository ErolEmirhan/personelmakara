export function isStaffAdmin(staff) {
  return !!(staff?.is_admin);
}

export function isStaffBoss(staff) {
  return !!(staff?.is_boss);
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

/** Ayarlardan ekip bildirimi gönderebilir (müdür, admin, patron) */
export function canSendStaffAnnouncements(staff) {
  if (!staff) return false;
  return !!(staff.is_manager || staff.is_admin || staff.is_boss);
}

/** Kahvaltı satış kaydı (müdür, şef, admin, patron) */
export function canViewBreakfastSalesRecord(staff) {
  if (!staff) return false;
  return !!(staff.is_manager || staff.is_chef || staff.is_admin || staff.is_boss);
}
