export const COFFEE_SUGAR_OPTIONS = ['Sade', 'Orta', 'Şekerli'];

/** Türkçe karakter toleranslı küçük harf karşılaştırması */
export function normalizeProductNameForMatch(name) {
  return (name || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export function isMenengicCoffee(productName) {
  const n = normalizeProductNameForMatch(productName);
  return n.includes('menengic kahve');
}

export function needsCoffeeSugarModal(productName) {
  const n = normalizeProductNameForMatch(productName);
  return n.includes('turk kahvesi') || n.includes('menengic kahve');
}

export function getCoffeeModalCopy(productName) {
  if (isMenengicCoffee(productName)) {
    return {
      title: 'Menengiç Kahve Seçimi',
      subtitle: 'Lütfen Menengiç Kahve tercihinizi seçin:',
    };
  }
  return {
    title: 'Türk Kahvesi Seçimi',
    subtitle: 'Lütfen Türk Kahvesi tercihinizi seçin:',
  };
}

export function buildCoffeeDisplayName(originalName, option) {
  const menengic = isMenengicCoffee(originalName);
  const coffeeType = menengic ? 'Menengiç Kahve' : 'Türk Kahvesi';
  const typePattern = menengic
    ? '(menengi[çc]\\s*kahve|menengic\\s*kahve)'
    : '(türk\\s*kahvesi|turk\\s*kahvesi)';
  const regex = new RegExp(`^(.*?)\\s*${typePattern}`, 'i');
  const match = originalName.match(regex);
  const prefix = match?.[1]?.trim() ? `${match[1].trim()} ` : '';
  return `${prefix}${option} ${coffeeType}`;
}
