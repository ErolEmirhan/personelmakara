function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

function stableOffset(text, spread) {
  const value = String(text || '');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i) * (i + 3)) % spread;
  }
  return hash;
}

function calorieRange(productName, categoryName) {
  const name = normalizeText(productName);
  const category = normalizeText(categoryName);
  const combined = `${name} ${category}`;

  if (/kahve|espresso|latte|cappuccino|americano|mocha|macchiato|filtre/.test(combined)) {
    return [45, 180];
  }
  if (/cay|tea|bitki|salep|sicak|cikolata/.test(combined)) {
    return [20, 120];
  }
  if (/su|soda|cola|gazoz|ayran|limonata|icecek|smoothie|meyve suyu|portakal|nar/.test(combined)) {
    return [25, 160];
  }
  if (/tatli|pasta|kek|kurabiye|dondurma|sufle|cheesecake|tiramisu|baklava|kunefe|sutlac/.test(combined)) {
    return [280, 520];
  }
  if (/kahvalti|omlet|menemen|sucuk|peynir|bal|kaymak|granola/.test(combined)) {
    return [380, 680];
  }
  if (/salata|bowl|diyet|fit|light/.test(combined)) {
    return [120, 280];
  }
  if (/pizza|burger|sandvic|tost|durum|wrap|kofte|kebap|steak|et|tavuk|balik/.test(combined)) {
    return [420, 780];
  }
  if (/corba|soup|meze/.test(combined)) {
    return [90, 260];
  }
  if (/atistirmalik|snack|cips|patates|kizartma/.test(combined)) {
    return [180, 420];
  }
  return [220, 480];
}

export function buildDefaultProductCalories(productName, categoryName) {
  const [min, max] = calorieRange(productName, categoryName);
  const offset = stableOffset(`${productName}-${categoryName}`, max - min + 1);
  const kcal = min + offset;
  return `${kcal} kcal / porsiyon`;
}

export function buildDefaultProductContent(productName, categoryName) {
  const name = (productName || 'Ürün').trim();
  const category = (categoryName || 'Menü').trim();

  return [
    name,
    '',
    `Kategori: ${category}`,
    '',
    'İçerik: Günlük taze malzemelerle hazırlanır.',
    'Alerjen: Gluten, süt, yumurta ve kuruyemiş içerebilir. Detay için servis ekibimize danışın.',
    'Sunum: Standart porsiyon olarak servis edilir.',
  ].join('\n');
}

export function productNeedsDetailSeed(product) {
  return !(product?.content || '').trim() || !(product?.calories || '').trim();
}
