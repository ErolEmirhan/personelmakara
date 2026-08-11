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

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function formatContent(name, category, profile) {
  const lines = [name.trim(), ''];
  if (profile.ingredients) {
    lines.push(`İçindekiler: ${profile.ingredients}`);
  }
  if (profile.preparation) {
    lines.push(`Hazırlık: ${profile.preparation}`);
  }
  if (profile.serving) {
    lines.push(`Sunum: ${profile.serving}`);
  }
  if (profile.allergens) {
    lines.push(`Alerjen bilgisi: ${profile.allergens}`);
  }
  if (profile.note) {
    lines.push(`Not: ${profile.note}`);
  }
  lines.push('', `Menü kategorisi: ${category.trim() || 'Genel'}`);
  return lines.join('\n');
}

function formatCalories(kcal, note) {
  const value = Math.round(Number(kcal) || 0);
  if (note) return `${value} kcal · ${note}`;
  return `${value} kcal · standart porsiyon`;
}

/** Eski otomatik şablon — yeniden yazılması gerekir */
export function isLegacyGenericContent(content) {
  const text = (content || '').trim();
  if (!text) return true;
  const legacyMarkers = [
    'Günlük taze malzemelerle hazırlanır.',
    'Standart porsiyon olarak servis edilir.',
    'Detay için servis ekibimize danışın.',
    'için seçili taze malzemeler.',
    'Sipariş anında mutfağımız veya barımız tarafından hazırlanır.',
    'Malzeme ve kalori değerleri porsiyon ve tarife göre küçük farklılık gösterebilir.',
  ];
  return legacyMarkers.some((marker) => text.includes(marker));
}

function inferProductProfile(productName, categoryName) {
  const name = normalizeText(productName);
  const category = normalizeText(categoryName);
  const combined = `${name} ${category}`;

  // ── Kahveler ──────────────────────────────────────────────────────────────
  if (includesAny(name, ['turk kahvesi', 'türk kahvesi']) || name === 'turk kahve') {
    return {
      ingredients: 'Öğütülmüş Arabica kahve çekirdeği, su, isteğe bağlı az şeker.',
      preparation: 'Cezvede geleneksel yöntemle köpüklü olarak demlenir.',
      serving: 'Sıcak, fincan içinde lokum veya su eşliğinde servis edilir.',
      allergens: 'Süt ve gluten içermez. Şeker tercihinize göre eklenebilir.',
      calories: 12,
      calorieNote: 'şekersiz, tek fincan',
    };
  }
  if (name.includes('espresso') && !includesAny(name, ['latte', 'macchiato', 'mocha', 'flat'])) {
    return {
      ingredients: 'Espresso çekirdek karışımı, su.',
      preparation: 'Yüksek basınçta tek veya double shot olarak ekstrakte edilir.',
      serving: 'Sıcak, demitasse bardağında servis edilir.',
      allergens: 'Süt ve gluten içermez.',
      calories: name.includes('double') || name.includes('doppio') ? 18 : 9,
      calorieNote: name.includes('double') ? 'double shot' : 'single shot',
    };
  }
  if (name.includes('americano') || name.includes('amerikano')) {
    return {
      ingredients: 'Espresso, sıcak su.',
      preparation: 'Espresso üzerine sıcak su eklenerek hazırlanır.',
      serving: 'Sıcak, büyük bardakta servis edilir.',
      allergens: 'Süt ve gluten içermez.',
      calories: 15,
      calorieNote: 'sade, orta boy',
    };
  }
  if (name.includes('cappuccino') || name.includes('kapusino')) {
    return {
      ingredients: 'Espresso, buharla ısıtılmış süt, süt köpüğü.',
      preparation: 'Espresso tabanı üzerine eşit oranda süt ve köpük eklenir.',
      serving: 'Sıcak, seramik fincanda servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: name.includes('buyuk') || name.includes('large') ? 165 : 135,
      calorieNote: 'tam yağlı süt ile',
    };
  }
  if (name.includes('latte') || name.includes('latte')) {
    const iced = name.includes('ice') || name.includes('soguk') || name.includes('soğuk');
    return {
      ingredients: 'Espresso, buharla ısıtılmış süt' + (name.includes('vanilya') || name.includes('vanilla') ? ', vanilya aroması' : '') + '.',
      preparation: iced ? 'Espresso ve soğuk süt buz ile çalkalanır.' : 'Espresso üzerine buharla ısıtılmış süt eklenir.',
      serving: iced ? 'Soğuk, yüksek bardakta buz ile servis edilir.' : 'Sıcak, yüksek bardakta servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: iced ? 155 : 175,
      calorieNote: iced ? 'soğuk, orta boy' : 'sıcak, orta boy',
    };
  }
  if (name.includes('flat white')) {
    return {
      ingredients: 'Double espresso, mikroköpüklü süt.',
      preparation: 'İnce süt köpüğü ile yoğun kahve aroması korunarak hazırlanır.',
      serving: 'Sıcak, küçük bardakta servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: 120,
      calorieNote: 'mikroköpüklü süt ile',
    };
  }
  if (name.includes('mocha') || name.includes('moka')) {
    return {
      ingredients: 'Espresso, süt, bitter çikolata sosu.',
      preparation: 'Espresso, çikolata ve süt bir arada çalkalanır.',
      serving: 'Sıcak, yüksek bardakta krema veya kakao serpme ile servis edilir.',
      allergens: 'Süt (laktoz), soya (çikolatada).',
      calories: 290,
      calorieNote: 'çikolatalı, orta boy',
    };
  }
  if (name.includes('macchiato')) {
    return {
      ingredients: 'Espresso, az miktarda süt köpüğü.',
      preparation: 'Espresso shot üzerine bir kaşık süt köpüğü eklenir.',
      serving: 'Sıcak, küçük bardakta servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: 25,
      calorieNote: 'süt köpüğü ile',
    };
  }
  if (includesAny(combined, ['filtre kahve', 'filter coffee', 'chemex', 'v60', 'pour over'])) {
    return {
      ingredients: 'Öğütülmüş filtre kahve çekirdeği, su.',
      preparation: 'Filtre yöntemiyle demlenir, taze servis edilir.',
      serving: 'Sıcak, bardak veya kupa içinde servis edilir.',
      allergens: 'Süt ve gluten içermez (sade).',
      calories: name.includes('sut') || name.includes('süt') ? 95 : 8,
      calorieNote: name.includes('sut') || name.includes('süt') ? 'az süt ile' : 'sade',
    };
  }
  if (includesAny(combined, ['kahve', 'coffee'])) {
    return {
      ingredients: 'Espresso bazlı kahve çekirdeği karışımı, su; isteğe bağlı süt veya şeker.',
      preparation: 'Barista tarafından siparişe göre hazırlanır.',
      serving: 'Sıcak servis edilir.',
      allergens: 'Süt eklendiğinde laktoz içerebilir.',
      calories: 120,
      calorieNote: 'ortalama, süt eklenmiş',
    };
  }

  // ── Çay & sıcak içecekler ─────────────────────────────────────────────────
  if (name.includes('salep')) {
    return {
      ingredients: 'Salep tozu, süt, şeker, tarçın.',
      preparation: 'Süt ile kıvam alana kadar karıştırılarak ısıtılır.',
      serving: 'Sıcak, fincan içinde tarçın serpilerek servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: 220,
      calorieNote: 'sıcak, orta fincan',
    };
  }
  if (includesAny(name, ['sicak cikolata', 'sıcak çikolata', 'hot chocolate'])) {
    return {
      ingredients: 'Süt, bitter çikolata veya kakao, şeker.',
      preparation: 'Süt ile çikolata eritilerek kıvamlı hale getirilir.',
      serving: 'Sıcak, fincan içinde servis edilir.',
      allergens: 'Süt (laktoz), soya (çikolatada).',
      calories: 265,
      calorieNote: 'sütlü, orta boy',
    };
  }
  if (name.includes('frappe') || name.includes('frappé') || name.includes('frappuccino')) {
    return {
      ingredients: 'Espresso, süt, buz, şeker veya aromalı şurup.',
      preparation: 'Espresso, süt ve buz blenderda pürüzsüz kıvam alana kadar karıştırılır.',
      serving: 'Soğuk, yüksek bardakta krema veya sos ile servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: 310,
      calorieNote: 'soğuk, orta boy',
    };
  }
  if (includesAny(name, ['matcha', 'matça', 'matca'])) {
    return {
      ingredients: 'Matcha tozu, süt veya su, isteğe bağlı tatlandırıcı.',
      preparation: 'Matcha önce çırpılır, ardından süt veya su ile birleştirilir.',
      serving: 'Sıcak fincan veya buzlu bardakta servis edilir.',
      allergens: 'Süt eklendiğinde laktoz içerebilir.',
      calories: name.includes('latte') ? 180 : 120,
      calorieNote: name.includes('latte') ? 'sütlü' : 'sade',
    };
  }
  if (includesAny(name, ['chai', 'cay latte', 'çay latte'])) {
    return {
      ingredients: 'Siyah çay özü, baharat karışımı, süt, şeker.',
      preparation: 'Çay özü ve baharatlar süt ile ısıtılarak demlenir.',
      serving: 'Sıcak, yüksek bardakta servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: 190,
      calorieNote: 'sütlü, orta boy',
    };
  }
  if (includesAny(name, ['waffle', 'waffl', 'gofret'])) {
    return {
      ingredients: 'Un, yumurta, süt, tereyağı, kabartma tozu; üzerine çikolata, meyve veya dondurma (çeşide göre).',
      preparation: 'Waffle hamuru waffle makinesinde altın rengi olana kadar pişirilir.',
      serving: 'Sıcak tabakta garnitür ile servis edilir.',
      allergens: 'Gluten, süt, yumurta; kuruyemiş içerebilir.',
      calories: 420,
      calorieNote: 'tek waffle porsiyonu',
    };
  }
  if (includesAny(name, ['kruvasan', 'croissant'])) {
    return {
      ingredients: 'Un, tereyağı, maya, süt, yumurta; çikolatalı veya sade (çeşide göre).',
      preparation: 'Kat kat hamur fırında pişirilir.',
      serving: 'Ilık veya oda sıcaklığında servis edilir.',
      allergens: 'Gluten, süt, yumurta.',
      calories: name.includes('cikolata') || name.includes('çikolata') ? 340 : 280,
      calorieNote: 'adet',
    };
  }
  if (includesAny(name, ['milkshake', 'milksake', 'milk shake'])) {
    return {
      ingredients: 'Dondurma, süt, seçili aroma veya meyve püresi.',
      preparation: 'Tüm malzemeler blenderda kremsi kıvam alana kadar karıştırılır.',
      serving: 'Soğuk, yüksek bardakta servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: 380,
      calorieNote: 'ort boy milkshake',
    };
  }
  if (includesAny(name, ['panini', 'sandvic', 'sandviç']) && !includesAny(name, ['tost', 'club'])) {
    return {
      ingredients: 'Ciabatta veya tost ekmeği, peynir, seçili et/sebze dolgusu, sos.',
      preparation: 'Press ızgarada veya fırında ısıtılarak hazırlanır.',
      serving: 'Sıcak, diagonal kesilmiş dilimler halinde servis edilir.',
      allergens: 'Gluten, süt (peynir), yumurta (sos).',
      calories: 460,
      calorieNote: 'tek panini',
    };
  }
  if (includesAny(name, ['sigara boregi', 'sigara böreği', 'borek', 'börek', 'su boregi', 'su böreği'])) {
    return {
      ingredients: 'Yufka, peynir veya kıyma harcı, yumurta, sıvı yağ.',
      preparation: 'Harç yufkaya sarılır, kızartılır veya fırınlanır.',
      serving: 'Sıcak, yanında yoğurt veya salata ile servis edilir.',
      allergens: 'Gluten, süt (peynir), yumurta.',
      calories: 360,
      calorieNote: '3-4 adet porsiyon',
    };
  }
  if (includesAny(name, ['soguk kahve', 'soğuk kahve', 'cold brew', 'ice coffee', 'iced coffee'])) {
    return {
      ingredients: 'Soğuk demleme kahve veya espresso, su, buz; isteğe bağlı süt veya şurup.',
      preparation: 'Kahve soğuk servis için hazırlanır, buz ile çalkalanır.',
      serving: 'Soğuk, yüksek bardakta servis edilir.',
      allergens: 'Süt eklendiğinde laktoz içerebilir.',
      calories: 25,
      calorieNote: 'sade, orta boy',
    };
  }
  if (includesAny(combined, ['cay', 'çay', 'tea', 'bitki']) && !includesAny(name, ['latte', 'frappe', 'matcha'])) {
    const herbal = includesAny(name, ['adaçayı', 'adacayi', 'ihlamur', 'nane', 'papaty', 'bitki']);
    return {
      ingredients: herbal ? 'Seçili bitki çayı yaprakları, su.' : 'Siyah çay yaprakları, su.',
      preparation: 'Demleme süresine göre hazırlanır, taze servis edilir.',
      serving: 'Sıcak, ince belli veya kupa bardakta servis edilir.',
      allergens: 'Süt ve gluten içermez (sade).',
      calories: herbal ? 3 : 2,
      calorieNote: 'şekersiz',
    };
  }

  // ── Soğuk içecekler ───────────────────────────────────────────────────────
  if (includesAny(name, ['limonata', 'lemonade'])) {
    return {
      ingredients: 'Taze limon suyu, su, şeker veya şeker şurubu, buz.',
      preparation: 'Taze sıkım limon ile buzda çalkalanır.',
      serving: 'Soğuk, yüksek bardakta buz ile servis edilir.',
      allergens: 'Süt ve gluten içermez.',
      calories: 95,
      calorieNote: 'soğuk, orta boy',
    };
  }
  if (name.includes('smoothie') || name.includes('smooti')) {
    return {
      ingredients: 'Mevsim meyveleri, yoğurt veya süt, buz, bal (isteğe bağlı).',
      preparation: 'Tüm malzemeler blenderda pürüzsüz kıvam alana kadar karıştırılır.',
      serving: 'Soğuk, yüksek bardakta servis edilir.',
      allergens: 'Süt (laktoz), yoğurt kullanıldığında süt ürünü.',
      calories: 210,
      calorieNote: 'meyveli, orta boy',
    };
  }
  if (name.includes('ayran')) {
    return {
      ingredients: 'Yoğurt, su, tuz.',
      preparation: 'Yoğurt ve su çalkalanarak ayran kıvamına getirilir.',
      serving: 'Soğuk, bardakta servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: 75,
      calorieNote: '300 ml civarı',
    };
  }
  if (includesAny(combined, ['soda', 'gazoz', 'cola', 'kola', 'fanta', 'sprite'])) {
    return {
      ingredients: 'Karbonatlı içecek, şeker veya tatlandırıcı.',
      preparation: 'Soğuk olarak servis edilir.',
      serving: 'Buzlu veya buzsuz bardakta servis edilir.',
      allergens: 'Süt ve gluten içermez.',
      calories: name.includes('zero') || name.includes('light') ? 2 : 140,
      calorieNote: '330 ml şişe/kutu',
    };
  }
  if (name.includes('su') && !includesAny(name, ['sucuk', 'su boregi', 'su böreği'])) {
    return {
      ingredients: 'Doğal kaynak suyu veya maden suyu.',
      preparation: 'Soğuk servis edilir.',
      serving: 'Şişe veya bardakta servis edilir.',
      allergens: 'Alerjen içermez.',
      calories: 0,
      calorieNote: '330 ml',
    };
  }
  if (includesAny(combined, ['icecek', 'içecek', 'juice', 'meyve suyu', 'portakal', 'nar', 'visne'])) {
    return {
      ingredients: 'Mevsim meyve suyu veya konsantre meyve suyu, su, buz.',
      preparation: 'Soğuk olarak hazırlanır.',
      serving: 'Soğuk bardakta buz ile servis edilir.',
      allergens: 'Süt ve gluten içermez.',
      calories: 110,
      calorieNote: 'soğuk, orta boy',
    };
  }

  // ── Kahvaltı ──────────────────────────────────────────────────────────────
  if (name.includes('menemen')) {
    return {
      ingredients: 'Yumurta, domates, yeşil biber, soğan, zeytinyağı, tuz, karabiber.',
      preparation: 'Sebzeler sote edilir, yumurta eklenerek kısık ateşte pişirilir.',
      serving: 'Sıcak, güveç veya tabakta ekmek eşliğinde servis edilir.',
      allergens: 'Yumurta.',
      calories: 285,
      calorieNote: 'standart porsiyon',
    };
  }
  if (name.includes('omlet') || name.includes('omelet')) {
    const cheese = includesAny(name, ['peynir', 'kaşar', 'kasar', 'cheddar']);
    return {
      ingredients: `Yumurta, tuz, karabiber${cheese ? ', rendelenmiş kaşar peyniri' : ', isteğe bağlı sebze'}.`,
      preparation: 'Yumurta çırpılır, tavada katlanmış veya düz omlet olarak pişirilir.',
      serving: 'Sıcak tabakta servis edilir.',
      allergens: 'Yumurta' + (cheese ? ', süt (laktoz — peynir).' : '.'),
      calories: cheese ? 380 : 260,
      calorieNote: cheese ? 'peynirli' : 'sade',
    };
  }
  if (includesAny(name, ['kahvalti', 'kahvaltı', 'serpme'])) {
    return {
      ingredients: 'Peynir çeşitleri, zeytin, bal, reçel, yumurta, domates, salatalık, tereyağı, ekmek.',
      preparation: 'Günlük taze malzemelerle tabak ve kahvaltılık sunum hazırlanır.',
      serving: 'Paylaşmalı veya kişisel tabakta servis edilir.',
      allergens: 'Gluten (ekmek), süt (peynir, tereyağı), yumurta, kuruyemiş (reçel/bal karışım riski).',
      calories: 650,
      calorieNote: 'kişisel kahvaltı tabağı',
    };
  }
  if (name.includes('sucuk') || (name.includes('yumurta') && name.includes('sucuk'))) {
    return {
      ingredients: 'Dana sucuk, yumurta, tereyağı veya zeytinyağı.',
      preparation: 'Sucuk tavada pişirilir, üzerine yumurta kırılarak hazırlanır.',
      serving: 'Sıcak tabakta servis edilir.',
      allergens: 'Yumurta, süt (tereyağı).',
      calories: 420,
      calorieNote: 'standart porsiyon',
    };
  }
  if (includesAny(name, ['peynir', 'kaşar', 'kasar', 'labne', 'tulum']) && includesAny(category, ['kahvalti', 'kahvaltı'])) {
    return {
      ingredients: 'Seçili peynir çeçidi, zeytinyağı veya tereyağı, ekmek eşliğinde.',
      preparation: 'Soğuk zincir koşullarında muhafaza edilir, tabakta sunulur.',
      serving: 'Kahvaltı tabağında servis edilir.',
      allergens: 'Süt (laktoz), gluten (ekmek eşliğinde).',
      calories: 320,
      calorieNote: 'peynir tabağı',
    };
  }
  if (includesAny(name, ['bal', 'kaymak']) && includesAny(category, ['kahvalti', 'kahvaltı'])) {
    return {
      ingredients: 'Çiçek balı ve/veya kaymak, tereyağı, taze ekmek.',
      preparation: 'Kahvaltılık olarak tabakta hazırlanır.',
      serving: 'Oda sıcaklığında veya hafif ılık servis edilir.',
      allergens: 'Süt (kaymak, tereyağı), gluten (ekmek).',
      calories: 380,
      calorieNote: 'kahvaltılık porsiyon',
    };
  }

  // ── Ana yemekler ──────────────────────────────────────────────────────────
  if (includesAny(name, ['kofte', 'köfte'])) {
    return {
      ingredients: 'Dana ve/veya kuzu kıyma, soğan, maydanoz, kimyon, tuz, karabiber, galeta unu.',
      preparation: 'Kıyma baharatlarla yoğrulur, ızgarada veya tavada pişirilir.',
      serving: 'Sıcak tabakta pilav, salata veya ekmek eşliğinde servis edilir.',
      allergens: 'Gluten (galeta unu), yumurta (bazı tariflerde).',
      calories: 480,
      calorieNote: 'ana yemek porsiyonu',
    };
  }
  if (includesAny(name, ['kebap', 'kebab', 'adana', 'urfa', 'shish', 'şiş'])) {
    return {
      ingredients: 'Kuzu veya dana eti, kuyruk yağı (Adana), baharat karışımı, soğan, sumak.',
      preparation: 'Et marine edilir, şişte veya ocakta pişirilir.',
      serving: 'Sıcak tabakta lavaş, pilav ve köz sebze eşliğinde servis edilir.',
      allergens: 'Gluten (lavaş).',
      calories: 580,
      calorieNote: 'ana yemek porsiyonu',
    };
  }
  if (includesAny(name, ['tavuk', 'chicken'])) {
    const grilled = includesAny(name, ['izgara', 'grill', 'grile']);
    return {
      ingredients: 'Tavuk göğsü veya but, zeytinyağı, tuz, karabiber, baharatlar.',
      preparation: grilled ? 'Izgara veya fırında pişirilir.' : 'Sos veya garnitürle birlikte hazırlanır.',
      serving: 'Sıcak tabakta garnitür ile servis edilir.',
      allergens: 'Tarife göre süt veya gluten içerebilir (sos).',
      calories: grilled ? 380 : 450,
      calorieNote: grilled ? 'ızgara porsiyon' : 'soslu porsiyon',
    };
  }
  if (includesAny(name, ['balik', 'balık', 'somon', 'levrek', 'çupra', 'cupra'])) {
    return {
      ingredients: 'Taze balık filetosu, zeytinyağı, limon, tuz, karabiber, taze otlar.',
      preparation: 'Izgara veya fırında pişirilir.',
      serving: 'Sıcak tabakta roka veya sebze garnitürü ile servis edilir.',
      allergens: 'Balık.',
      calories: 340,
      calorieNote: 'ızgara fileto',
    };
  }
  if (name.includes('pizza')) {
    return {
      ingredients: 'Pizza hamuru, domates sosu, mozzarella peyniri, seçili garnitürler.',
      preparation: 'Fırında yüksek ısıda pişirilir.',
      serving: 'Sıcak, dilimlenerek servis edilir.',
      allergens: 'Gluten, süt (peynir).',
      calories: name.includes('buyuk') || name.includes('large') || name.includes('family') ? 850 : 680,
      calorieNote: 'orta boy pizza (8 dilim)',
    };
  }
  if (name.includes('burger')) {
    return {
      ingredients: 'Dana köfte, burger ekmeği, marul, domates, soğan, turşu, sos.',
      preparation: 'Köfte ızgarada pişirilir, ekmek arasında hazırlanır.',
      serving: 'Sıcak, patates kızartması eşliğinde servis edilebilir.',
      allergens: 'Gluten, süt (sos), yumurta (mayonez/sos).',
      calories: 620,
      calorieNote: 'tek burger',
    };
  }
  if (includesAny(name, ['tost', 'sandvic', 'sandviç', 'club'])) {
    return {
      ingredients: 'Tost ekmeği, kaşar peyniri, sucuk veya seçili iç malzeme, tereyağı.',
      preparation: 'Tost makinesinde veya plazma ızgarada kızartılır.',
      serving: 'Sıcak, diagonal kesilmiş dilimler halinde servis edilir.',
      allergens: 'Gluten, süt (peynir, tereyağı).',
      calories: 420,
      calorieNote: 'çift dilim tost',
    };
  }
  if (includesAny(name, ['durum', 'dürüm', 'wrap', 'tortilla'])) {
    return {
      ingredients: 'Lavaş veya tortilla, seçili et/sebze dolgusu, sos, marul, domates.',
      preparation: 'Malzemeler lavaş içine sarılarak hazırlanır.',
      serving: 'Sıcak veya ılık olarak servis edilir.',
      allergens: 'Gluten, süt (sos), yumurta (mayonez).',
      calories: 490,
      calorieNote: 'tek dürüm',
    };
  }
  if (includesAny(name, ['corba', 'çorba', 'soup'])) {
    const lentil = includesAny(name, ['mercimek', 'ezogelin', 'yayla']);
    return {
      ingredients: lentil
        ? 'Kırmızı mercimek, soğan, un, tereyağı, salça, baharatlar.'
        : 'Et suyu veya sebze suyu, ana malzeme, baharatlar.',
      preparation: 'Kısık ateşte kaynatılarak hazırlanır.',
      serving: 'Sıcak kase içinde limon ve ekmek eşliğinde servis edilir.',
      allergens: lentil ? 'Gluten (un), süt (tereyağı).' : 'Gluten (un, ekmek).',
      calories: lentil ? 180 : 140,
      calorieNote: 'kase porsiyon',
    };
  }
  if (includesAny(name, ['salata', 'salad', 'bowl', 'cevizli', 'roka', 'çoban'])) {
    return {
      ingredients: 'Taze yeşillik, mevsim sebzeleri, zeytinyağı, limon veya sos.',
      preparation: 'Malzemeler taze doğranır, servis öncesi sos ile harmanlanır.',
      serving: 'Soğuk tabakta servis edilir.',
      allergens: 'Kuruyemiş (cevizli çeşitlerde), süt (peynirli çeşitlerde).',
      calories: 220,
      calorieNote: 'standart salata kasesi',
    };
  }
  if (includesAny(name, ['patates', 'fries', 'kizartma', 'kızartma']) && !name.includes('tavuk')) {
    return {
      ingredients: 'Patates, kızartma yağı, tuz.',
      preparation: 'Patates dilimlenir, kızartma yağında altın sarısı olana kadar pişirilir.',
      serving: 'Sıcak, sos eşliğinde servis edilir.',
      allergens: 'Gluten içermez (sade). Sos ile serviste gluten olabilir.',
      calories: 320,
      calorieNote: 'standart porsiyon',
    };
  }

  // ── Tatlılar ──────────────────────────────────────────────────────────────
  if (name.includes('kunefe') || name.includes('künefe')) {
    return {
      ingredients: 'Tel kadayıf, tuzsuz peynir, tereyağı, şeker şerbeti, antep fıstığı.',
      preparation: 'Tereyağlı kadayıf ve peynir fırında pişirilir, şerbet ile buluşturulur.',
      serving: 'Sıcak, kuvertür tabakta fıstık serpilerek servis edilir.',
      allergens: 'Gluten, süt (peynir, tereyağı), kuruyemiş (fıstık).',
      calories: 450,
      calorieNote: 'sıcak porsiyon',
    };
  }
  if (name.includes('baklava')) {
    return {
      ingredients: 'Yufka, antep fıstığı, tereyağı, şeker şerbeti.',
      preparation: 'Kat kat yufka ve fıstık fırında pişirilir, şerbet eklenir.',
      serving: 'Oda sıcaklığında veya hafif ılık dilim halinde servis edilir.',
      allergens: 'Gluten, süt (tereyağı), kuruyemiş (fıstık).',
      calories: 380,
      calorieNote: '3-4 dilim porsiyon',
    };
  }
  if (name.includes('sutlac') || name.includes('sütlaç')) {
    return {
      ingredients: 'Süt, pirinç, şeker, nişasta, tarçın.',
      preparation: 'Pirinç ve süt kısık ateşte koyulaştırılır, fırında karamelize edilebilir.',
      serving: 'Soğuk kaselik porsiyon olarak servis edilir.',
      allergens: 'Süt (laktoz).',
      calories: 220,
      calorieNote: 'kase porsiyon',
    };
  }
  if (includesAny(name, ['cheesecake', 'cheese cake'])) {
    return {
      ingredients: 'Labne veya krem peynir, bisküvi tabanı, şeker, vanilya.',
      preparation: 'Taban ve krem katmanı birleştirilir, soğutularak dinlendirilir.',
      serving: 'Soğuk dilim halinde servis edilir.',
      allergens: 'Gluten (bisküvi), süt (peynir), yumurta (bazı tariflerde).',
      calories: 410,
      calorieNote: 'dilim porsiyon',
    };
  }
  if (name.includes('tiramisu') || name.includes('tiramisù')) {
    return {
      ingredients: 'Mascarpone, ladyfinger bisküvi, espresso, kakao, yumurta, şeker.',
      preparation: 'Katmanlı olarak hazırlanır, en az 4 saat dinlendirilir.',
      serving: 'Soğuk dilim halinde kakao serpilerek servis edilir.',
      allergens: 'Gluten, süt, yumurta.',
      calories: 390,
      calorieNote: 'dilim porsiyon',
    };
  }
  if (includesAny(name, ['dondurma', 'ice cream', 'gelato'])) {
    return {
      ingredients: 'Süt, krema, şeker, doğal aroma veya meyve püresi.',
      preparation: 'Pastane standardında dondurularak hazırlanır.',
      serving: 'Soğuk kase veya cone içinde servis edilir.',
      allergens: 'Süt (laktoz), kuruyemiş (çikolatalı çeşitlerde).',
      calories: 240,
      calorieNote: '2 top porsiyon',
    };
  }
  if (includesAny(combined, ['tatli', 'tatlı', 'pasta', 'kek', 'dessert', 'sufle', 'sufle'])) {
    return {
      ingredients: 'Un, şeker, yumurta, süt, tereyağı; ürüne özel çikolata veya meyve.',
      preparation: 'Pastane mutfağında günlük veya sipariş üzerine hazırlanır.',
      serving: 'Soğuk veya ılık dilim/kase porsiyon olarak servis edilir.',
      allergens: 'Gluten, süt, yumurta; kuruyemiş içerebilir.',
      calories: 360,
      calorieNote: 'dilim porsiyon',
    };
  }

  // ── Kategori bazlı yedek ──────────────────────────────────────────────────
  if (includesAny(category, ['kahve', 'coffee', 'espresso'])) {
    return {
      ingredients: 'Espresso bazlı kahve çekirdeği, su; isteğe bağlı süt.',
      preparation: 'Barista tarafından sipariş detayına göre hazırlanır.',
      serving: 'Sıcak servis edilir.',
      allergens: 'Süt eklendiğinde laktoz içerebilir.',
      calories: 120,
      calorieNote: 'süt eklenmiş ortalama',
    };
  }
  if (includesAny(category, ['kahvalti', 'kahvaltı', 'breakfast'])) {
    return {
      ingredients: 'Yumurta, peynir, zeytin, ekmek, domates, salatalık ve kahvaltılık garnitürler.',
      preparation: 'Günlük malzemelerle kahvaltı tabağı hazırlanır.',
      serving: 'Tabakta servis edilir.',
      allergens: 'Gluten, süt, yumurta.',
      calories: 420,
      calorieNote: 'kahvaltı porsiyonu',
    };
  }
  if (includesAny(category, ['icecek', 'içecek', 'drink', 'beverage'])) {
    return {
      ingredients: 'Ürün adına uygun ana içecek bileşenleri, buz (soğuk serviste).',
      preparation: 'Bar tarafında taze hazırlanır.',
      serving: 'Soğuk veya sıcak bardakta servis edilir.',
      allergens: 'Tarife göre süt alerjeni içerebilir.',
      calories: 95,
      calorieNote: 'standart bardak',
    };
  }
  if (includesAny(category, ['tatli', 'tatlı', 'dessert', 'pasta'])) {
    return {
      ingredients: 'Un, şeker, yumurta, süt, tereyağı; ürüne özel aroma.',
      preparation: 'Pastane mutfağında hazırlanır.',
      serving: 'Dilim veya kase porsiyon olarak servis edilir.',
      allergens: 'Gluten, süt, yumurta.',
      calories: 340,
      calorieNote: 'standart tatlı porsiyonu',
    };
  }
  if (includesAny(category, ['ana yemek', 'yemek', 'food', 'gril', 'ızgara'])) {
    return {
      ingredients: 'Seçili ana protein veya sebze, zeytinyağı, baharat, garnitür.',
      preparation: 'Mutfağımızda sipariş üzerine pişirilir.',
      serving: 'Sıcak tabakta servis edilir.',
      allergens: 'Gluten, süt veya kuruyemiş içerebilir (sos/garnitür).',
      calories: 480,
      calorieNote: 'ana yemek porsiyonu',
    };
  }

  // ── Genel yedek — ürün adından ipucu ─────────────────────────────────────
  if (includesAny(name, ['ekmek', 'simit', 'poğaça', 'pogaca', 'borek', 'börek'])) {
    return {
      ingredients: 'Un, su, maya, tuz; iç harç veya peynir (çeşide göre).',
      preparation: 'Fırında veya kızgın yüzeyde pişirilir.',
      serving: 'Ilık veya oda sıcaklığında servis edilir.',
      allergens: 'Gluten, süt (peynirli çeşitlerde), yumurta (bazı hamurlarda).',
      calories: 280,
      calorieNote: 'adet/ dilim',
    };
  }

  return {
    ingredients: `${(productName || 'Ürün').trim()} için seçili taze malzemeler.`,
    preparation: 'Sipariş anında mutfağımız veya barımız tarafından hazırlanır.',
    serving: 'Standart porsiyon olarak servis edilir.',
    allergens: 'Gluten, süt, yumurta ve kuruyemiş içerebilir; detay için servis ekibimize danışın.',
    note: 'Malzeme ve kalori değerleri porsiyon ve tarife göre küçük farklılık gösterebilir.',
    calories: 280,
    calorieNote: 'tahmini standart porsiyon',
  };
}

export function buildProductDetailProfile(productName, categoryName) {
  const profile = inferProductProfile(productName, categoryName);
  const name = (productName || 'Ürün').trim();
  const category = (categoryName || 'Menü').trim();

  return {
    content: formatContent(name, category, profile),
    calories: formatCalories(profile.calories, profile.calorieNote),
  };
}

/** @deprecated use buildProductDetailProfile */
export function buildDefaultProductContent(productName, categoryName) {
  return buildProductDetailProfile(productName, categoryName).content;
}

/** @deprecated use buildProductDetailProfile */
export function buildDefaultProductCalories(productName, categoryName) {
  return buildProductDetailProfile(productName, categoryName).calories;
}

export function productNeedsDetailSeed(product) {
  return isLegacyGenericContent(product?.content) || !(product?.calories || '').trim();
}

export function productNeedsDetailRefresh(product) {
  return isLegacyGenericContent(product?.content) || !(product?.content || '').trim() || !(product?.calories || '').trim();
}
