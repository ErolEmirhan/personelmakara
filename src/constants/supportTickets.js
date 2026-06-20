export const SUPPORT_CATEGORIES = [
  { id: 'issue', label: 'Sorun Bildir', description: 'Teknik veya operasyonel sorun', icon: '⚠️' },
  { id: 'complaint', label: 'Şikayet', description: 'Memnuniyetsizlik veya şikayet', icon: '💬' },
  { id: 'request', label: 'İstek', description: 'Talep veya ihtiyaç bildirimi', icon: '📋' },
  { id: 'suggestion', label: 'Öneri', description: 'İyileştirme önerisi', icon: '✨' },
];

export const SUPPORT_STATUS = {
  OPEN: 'open',
  RESOLVED: 'resolved',
};

export function supportCategoryLabel(categoryId) {
  return SUPPORT_CATEGORIES.find((c) => c.id === categoryId)?.label || 'Destek';
}
