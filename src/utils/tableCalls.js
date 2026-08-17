const PENDING_STATUSES = new Set(['pending', 'waiting', 'new']);

export function isPendingTableCallStatus(status) {
  const normalized = String(status || 'pending').trim().toLowerCase();
  return PENDING_STATUSES.has(normalized);
}

export function getTableCallSortTime(tableCall) {
  if (tableCall?.timestamp > 0) return tableCall.timestamp;
  if (tableCall?.createdAt?.toDate) return tableCall.createdAt.toDate().getTime();
  if (tableCall?.createdAt?.seconds) return tableCall.createdAt.seconds * 1000;
  if (typeof tableCall?.createdAt === 'number') return tableCall.createdAt;
  return 0;
}

export function normalizeTableCall(docSnap) {
  const data = docSnap.data?.() ? docSnap.data() : (docSnap.data || docSnap);
  const id = docSnap.id ?? data.id;

  const acknowledgedBy = Array.isArray(data.acknowledgedBy)
    ? data.acknowledgedBy
    : Array.isArray(data.acknowledged_by)
      ? data.acknowledged_by
      : [];

  const tableNumber = data.tableNumber ?? data.table_number ?? data.tableNo ?? null;

  return {
    id,
    branchKey: data.branchKey ?? data.branch_key ?? '',
    tableNumber,
    tableName: data.tableName ?? data.table_name ?? (tableNumber != null ? `Masa ${tableNumber}` : 'Masa'),
    status: data.status ?? 'pending',
    token: data.token ?? null,
    source: data.source ?? 'qr-menu',
    timestamp: Number(data.timestamp ?? 0) || getTableCallSortTime({ createdAt: data.createdAt ?? data.created_at }),
    date: data.date ?? null,
    time: data.time ?? null,
    createdAt: data.createdAt ?? data.created_at ?? null,
    acknowledgedBy: acknowledgedBy.map((entry) => ({
      staffId: String(entry.staffId ?? entry.staff_id ?? ''),
      staffName: entry.staffName ?? entry.staff_name ?? 'Personel',
      at: entry.at ?? entry.acknowledgedAt ?? null,
    })),
  };
}

export function isStaffAcknowledged(tableCall, staffId) {
  if (!staffId || !tableCall?.acknowledgedBy?.length) return false;
  return tableCall.acknowledgedBy.some((entry) => String(entry.staffId) === String(staffId));
}

export function formatTableCallTimestamp(tableCall) {
  if (tableCall?.date && tableCall?.time) {
    return `${tableCall.date} · ${tableCall.time}`;
  }
  const ts = getTableCallSortTime(tableCall);
  if (ts > 0) {
    return new Date(ts).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return '—';
}

export function resolveTableForTableCall(tableCall, tables) {
  if (!tableCall || !Array.isArray(tables)) return null;
  const tableNumber = Number(tableCall.tableNumber);
  if (Number.isFinite(tableNumber)) {
    return tables.find((table) => Number(table.number) === tableNumber) || null;
  }
  return null;
}
