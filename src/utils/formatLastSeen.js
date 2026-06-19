function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function getLastSeenMs(presence) {
  if (!presence) return null;
  const ms =
    presence.lastSeenAt?.toMillis?.()
    ?? (presence.clientTime ? new Date(presence.clientTime).getTime() : null);
  return ms && ms > 0 ? ms : null;
}

export function formatLastSeen(ms, now = Date.now()) {
  if (!ms) return null;

  const diff = Math.max(0, now - ms);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return 'Az önce';

  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes} dk önce`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours} sa önce`;
  }

  const date = new Date(ms);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const timeStr = date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSameDay(date, today)) return `Bugün ${timeStr}`;
  if (isSameDay(date, yesterday)) return `Dün ${timeStr}`;

  if (diff < 7 * day) {
    const dayName = date.toLocaleDateString('tr-TR', { weekday: 'long' });
    const capitalized = dayName.charAt(0).toLocaleUpperCase('tr-TR') + dayName.slice(1);
    return `${capitalized} ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });

  return `${dateStr} ${timeStr}`;
}

export function formatLastSeenLabel(presence, now = Date.now()) {
  const ms = getLastSeenMs(presence);
  if (!ms) return null;
  const relative = formatLastSeen(ms, now);
  return relative ? `Son görülme ${relative}` : null;
}
