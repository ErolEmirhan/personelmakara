export function getNotificationsSeenKey(branchKey, staffId) {
  return `makara_notifications_seen_${branchKey}_${staffId}`;
}

export function getLastNotificationsVisit(branchKey, staffId) {
  if (!branchKey || !staffId) return 0;
  try {
    const raw = localStorage.getItem(getNotificationsSeenKey(branchKey, staffId));
    if (raw == null) return 0;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export function markNotificationsVisited(branchKey, staffId, timestamp = Date.now()) {
  if (!branchKey || !staffId) return;
  try {
    localStorage.setItem(getNotificationsSeenKey(branchKey, staffId), String(timestamp));
  } catch {
    /* localStorage kapalı olabilir */
  }
}

/** Bildirimler sekmesine girilmeden önceki duyurular okunmamış sayılır. */
export function countUnreadAnnouncements(announcements, staffId, lastVisitMs) {
  if (!announcements?.length || !staffId) return 0;
  const since = lastVisitMs || 0;
  return announcements.filter((item) => {
    if (String(item.authorStaffId) === String(staffId)) return false;
    return (item.createdAtMs || 0) > since;
  }).length;
}
